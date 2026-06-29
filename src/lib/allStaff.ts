/**
 * Read-only Microsoft Graph client for the Fieldstone **All Staff** M365 Group.
 *
 * A TypeScript port of the Python `graph.py` from the `all-staff-feed` sub-app, so
 * the portal can render the newest All Staff announcements natively (no iframe) on
 * the Home page. App-only (client-credentials) auth — it only ever issues GET
 * requests and stores nothing; a short in-memory cache keeps it snappy.
 *
 * Env vars (set in Railway for prod, in a git-ignored .env.local locally):
 *   GRAPH_TENANT_ID      Entra tenant id
 *   GRAPH_CLIENT_ID      App registration (client) id
 *   GRAPH_CLIENT_SECRET  App client secret      <-- the only secret; never hardcode
 *   ALLSTAFF_GROUP       group mail (default allstaff@fieldstonehomes.com)
 *   ALLSTAFF_GROUP_ID    (optional) group object id, to skip the lookup
 *   FEED_CACHE_TTL       (optional) seconds to cache the feed in memory (default 600)
 *
 * Mirrors `latest_emails()` in all-staff-feed/graph.py — see the README there for the
 * "why Groups, not the mailbox API" rationale and the Entra setup (Group.Read.All).
 */

const GRAPH = "https://graph.microsoft.com/v1.0";

export interface AllStaffEmail {
  subject: string;
  senderName: string;
  senderEmail: string;
  date: string; // ISO 8601
  preview: string;
  bodyText: string;
}

function cfg(key: string, fallback?: string, required = false): string {
  const v = process.env[key] ?? fallback;
  if (required && !v) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return v ?? "";
}

/* --------------------------------------------------------------------------- */
/*  Auth (client-credentials, app-only) — token cached until ~60s before expiry */
/* --------------------------------------------------------------------------- */

let tokenCache: { value: string | null; exp: number } = { value: null, exp: 0 };

async function getToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (tokenCache.value && now < tokenCache.exp - 60) {
    return tokenCache.value;
  }
  const tenant = cfg("GRAPH_TENANT_ID", undefined, true);
  const body = new URLSearchParams({
    client_id: cfg("GRAPH_CLIENT_ID", undefined, true),
    client_secret: cfg("GRAPH_CLIENT_SECRET", undefined, true),
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
  if (!res.ok) {
    throw new Error(`Graph token request failed: ${res.status} ${await res.text()}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache = { value: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return j.access_token;
}

async function graphGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(GRAPH + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await getToken()}` },
  });
  if (!res.ok) {
    throw new Error(`Graph GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/* --------------------------------------------------------------------------- */
/*  Group id resolution (cached)                                                */
/* --------------------------------------------------------------------------- */

let groupIdCache: string | null = null;

async function groupId(): Promise<string> {
  if (groupIdCache) return groupIdCache;
  const explicit = cfg("ALLSTAFF_GROUP_ID");
  if (explicit) {
    groupIdCache = explicit;
    return explicit;
  }
  const mail = cfg("ALLSTAFF_GROUP", "allstaff@fieldstonehomes.com");
  const data = await graphGet<{ value: { id: string }[] }>("/groups", {
    $filter: `mail eq '${mail}'`,
    $select: "id,displayName,mail",
  });
  const vals = data.value ?? [];
  if (vals.length === 0) {
    throw new Error(`No M365 group found with mail '${mail}'`);
  }
  groupIdCache = vals[0].id;
  return groupIdCache;
}

/* --------------------------------------------------------------------------- */
/*  HTML → text, signature trimming, topic normalization                        */
/* --------------------------------------------------------------------------- */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
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
  if (m && m.index > 40) {
    text = text.slice(0, m.index);
  }
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

/* --------------------------------------------------------------------------- */
/*  Graph shapes                                                                */
/* --------------------------------------------------------------------------- */

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
      // Some tenants reject $orderby on posts — fall back to fetch-all + sort.
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
    // One bad thread shouldn't sink the whole feed — skip it.
    return {};
  }
}

/**
 * The newest `n` **distinct** All Staff announcements (originals, not replies).
 *
 * Scans the newest `scan` threads, collapses reply threads onto their announcement by
 * normalized subject, keeps each announcement's *original* post, and returns the newest
 * `n` by original date. Read-only and live — nothing is persisted.
 */
export async function latestEmails(n = 3, scan = 20, bodyChars = 1000): Promise<AllStaffEmail[]> {
  const gid = await groupId();
  const threadsData = await graphGet<{ value: GraphThread[] }>(`/groups/${gid}/threads`, {
    $top: String(scan),
    $orderby: "lastDeliveredDateTime desc",
    $select: "id,topic,lastDeliveredDateTime,preview",
  });
  const threads = threadsData.value ?? [];

  // Fetch each thread's originating post in parallel (the Python client did this
  // serially — one HTTP round-trip per thread — which made the first uncached
  // render slow). originalPost() never throws, so this is safe.
  const posts = await Promise.all(threads.map((t) => originalPost(gid, t.id)));

  const byTopic = new Map<string, AllStaffEmail>();
  for (let i = 0; i < threads.length; i++) {
    const t = threads[i];
    const post = posts[i];
    const from = post.from?.emailAddress ?? {};
    const date = post.receivedDateTime || t.lastDeliveredDateTime || "";
    let body =
      trimSignature(htmlToText(post.body?.content ?? "")) || t.preview || "";
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
    // keep the EARLIEST post per subject = the original announcement, not a reply
    const existing = byTopic.get(key);
    if (!existing || (date && date < existing.date)) {
      byTopic.set(key, entry);
    }
  }

  return [...byTopic.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
}

/* --------------------------------------------------------------------------- */
/*  In-memory TTL cache (mirrors the Flask app's _cached_feed)                   */
/* --------------------------------------------------------------------------- */

let feedCache: { data: AllStaffEmail[]; exp: number } | null = null;

/**
 * Cached wrapper around {@link latestEmails}. Throws if Graph is misconfigured or
 * unreachable — callers (the Home page) should catch and degrade gracefully.
 */
export async function getLatestAllStaff(n = 3): Promise<AllStaffEmail[]> {
  const ttl = parseInt(process.env.FEED_CACHE_TTL ?? "600", 10);
  const now = Date.now() / 1000;
  if (feedCache && now < feedCache.exp) {
    return feedCache.data;
  }
  const data = await latestEmails(n);
  feedCache = { data, exp: now + ttl };
  return data;
}
