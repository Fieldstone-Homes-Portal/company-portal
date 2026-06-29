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

/** The first (originating) post of a thread = the announcement, not the replies. */
async function originalPost(gid: string, threadId: string): Promise<GraphPost> {
  try {
    try {
      const data = await graphGet<{ value: GraphPost[] }>(
        `/groups/${gid}/threads/${threadId}/posts`,
        { $orderby: "receivedDateTime asc", $top: "1", $select: "from,receivedDateTime,body" },
      );
      return data.value?.[0] ?? {};
    } catch {
      const data = await graphGet<{ value: GraphPost[] }>(
        `/groups/${gid}/threads/${threadId}/posts`,
        { $select: "from,receivedDateTime,body" },
      );
      const posts = (data.value ?? []).sort((a, b) =>
        (a.receivedDateTime ?? "").localeCompare(b.receivedDateTime ?? ""),
      );
      return posts[0] ?? {};
    }
  } catch {
    return {};
  }
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
  const posts = await Promise.all(threads.map((t) => originalPost(gid, t.id)));

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
  const data = await latestEmails(n);
  feedCache = { data, exp: now + ttl };
  return data;
}
