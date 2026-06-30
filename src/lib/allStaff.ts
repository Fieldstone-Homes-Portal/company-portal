/**
 * Read-only client for the Fieldstone **All Staff** M365 Group conversations.
 *
 * Renders the newest All Staff announcements natively on the Home page (no
 * iframe). A TypeScript port of the Python `graph.py` from `all-staff-feed`;
 * shares the app-only Graph auth in `graphClient.ts`. Read-only, stores nothing,
 * short in-memory cache. Mirrors `latest_emails()` — see that repo's README for
 * the "why Groups, not the mailbox API" rationale and the Entra setup.
 */
import { graphGet, groupId } from "./graphClient";

export interface AllStaffEmail {
  subject: string;
  senderName: string;
  senderEmail: string;
  date: string; // ISO 8601
  preview: string;
  bodyText: string;
}

/* --------------------------------------------------------------------------- */
/*  HTML → text, signature trimming, topic normalization                        */
/* --------------------------------------------------------------------------- */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'",
};

function unescapeHtml(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, ent: string) => {
    if (ent[0] === "#") {
      const code =
        ent[1] === "x" || ent[1] === "X"
          ? parseInt(ent.slice(2), 16)
          : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    const lower = ent.toLowerCase();
    return lower in NAMED_ENTITIES ? NAMED_ENTITIES[lower] : m;
  });
}

function htmlToText(s: string): string {
  if (!s) return "";
  s = s.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = unescapeHtml(s);
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

const SIGN_OFF =
  /\n\s*(warm regards|kind regards|best regards|regards|thanks|thank you|sincerely|cheers|best,|have a great)\b[\s\S]*$/i;

function trimSignature(text: string): string {
  if (!text) return text;
  const m = SIGN_OFF.exec(text);
  if (m && m.index > 40) text = text.slice(0, m.index);
  for (const anchor of ["FieldstoneHomes.com", "12896 S Pony Express", "12896 South Pony"]) {
    const i = text.indexOf(anchor);
    if (i > 40) text = text.slice(0, i);
  }
  return text.trim();
}

const TOPIC_PREFIX = /^\s*(re|fw|fwd)\s*:\s*/i;

function normTopic(s: string | undefined): string {
  let cur = s ?? "";
  let prev: string | null = null;
  while (cur !== prev) {
    prev = cur;
    cur = cur.replace(TOPIC_PREFIX, "");
  }
  return cur.trim().toLowerCase();
}

interface GraphThread {
  id: string;
  topic?: string;
  lastDeliveredDateTime?: string;
  preview?: string;
}

interface GraphPost {
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  body?: { content?: string };
}

/**
 * The first (originating) post of a thread = the announcement, not the replies.
 *
 * Graph rejects `$orderby` on group thread posts, so we fetch the posts and pick
 * the earliest client-side. (Relying on `$orderby` here used to fail and fall
 * back to an empty sender + the thread's latest reply.)
 */
async function originalPost(gid: string, threadId: string): Promise<GraphPost> {
  try {
    const data = await graphGet<{ value: GraphPost[] }>(
      `/groups/${gid}/threads/${threadId}/posts`,
      { $select: "from,receivedDateTime,body", $top: "50" },
    );
    const posts = (data.value ?? []).filter((p) => p.receivedDateTime);
    posts.sort((a, b) => (a.receivedDateTime ?? "").localeCompare(b.receivedDateTime ?? ""));
    return posts[0] ?? {};
  } catch {
    return {};
  }
}

/** Run `fn` over `items` with at most `limit` in flight at once, preserving order. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * The newest `n` **distinct** All Staff announcements (originals, not replies).
 * Read-only and live — nothing is persisted.
 */
export async function latestEmails(n = 3, scan = 20, bodyChars = 1000): Promise<AllStaffEmail[]> {
  const gid = await groupId();
  const threadsData = await graphGet<{ value: GraphThread[] }>(`/groups/${gid}/threads`, {
    $top: String(scan),
    $orderby: "lastDeliveredDateTime desc",
    $select: "id,topic,lastDeliveredDateTime,preview",
  });
  const threads = threadsData.value ?? [];
  // Cap concurrency so we don't trip Graph throttling on the burst of per-thread
  // post fetches (which would drop threads to an empty sender + preview text).
  const posts = await mapLimit(threads, 4, (t) => originalPost(gid, t.id));

  const byTopic = new Map<string, AllStaffEmail>();
  for (let i = 0; i < threads.length; i++) {
    const t = threads[i];
    const post = posts[i];
    const from = post.from?.emailAddress ?? {};
    const date = post.receivedDateTime || t.lastDeliveredDateTime || "";
    let body = trimSignature(htmlToText(post.body?.content ?? "")) || t.preview || "";
    if (bodyChars && body.length > bodyChars) {
      body = body.slice(0, bodyChars).replace(/\s+$/, "") + "…";
    }
    const entry: AllStaffEmail = {
      subject: t.topic || "(no subject)",
      senderName: from.name ?? "",
      senderEmail: from.address ?? "",
      date,
      preview: t.preview ?? "",
      bodyText: body,
    };
    const key = normTopic(t.topic);
    const existing = byTopic.get(key);
    if (!existing || (date && date < existing.date)) byTopic.set(key, entry);
  }

  return [...byTopic.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}

/* In-memory TTL cache (mirrors the Flask app's _cached_feed). */
let feedCache: { data: AllStaffEmail[]; exp: number } | null = null;

/**
 * Cached wrapper around {@link latestEmails}. Throws if Graph is misconfigured or
 * unreachable — callers (the Home page) should catch and degrade gracefully.
 */
export async function getLatestAllStaff(n = 3): Promise<AllStaffEmail[]> {
  const ttl = parseInt(process.env.FEED_CACHE_TTL ?? "600", 10);
  const now = Date.now() / 1000;
  if (feedCache && now < feedCache.exp) return feedCache.data;
  // Fetch the full message body (not a 1000-char teaser) so the Home page's
  // click-to-read modal can show the whole email. Signature/footer is still
  // trimmed for readability.
  const data = await latestEmails(n, 20, 8000);
  feedCache = { data, exp: now + ttl };
  return data;
}
