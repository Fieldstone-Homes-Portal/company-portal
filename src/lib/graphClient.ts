/**
 * Shared read-only Microsoft Graph client (app-only, client-credentials).
 *
 * Token and the All Staff group id are cached at module scope. Reused by:
 *   - allStaff.ts        — newest All Staff Group conversation posts
 *   - companyCalendar.ts — the All Staff Group's calendar (company events)
 *
 * GET-only; it cannot write and stores nothing. Env vars (Railway / .env.local):
 *   GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET,
 *   ALLSTAFF_GROUP (default allstaff@fieldstonehomes.com), ALLSTAFF_GROUP_ID (optional)
 */

const GRAPH = "https://graph.microsoft.com/v1.0";

function cfg(key: string, fallback?: string, required = false): string {
  const v = process.env[key] ?? fallback;
  if (required && !v) throw new Error(`Missing required env var: ${key}`);
  return v ?? "";
}

let tokenCache: { value: string | null; exp: number } = { value: null, exp: 0 };

async function getToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (tokenCache.value && now < tokenCache.exp - 60) return tokenCache.value;
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
  if (!res.ok) throw new Error(`Graph token request failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache = { value: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return j.access_token;
}

/** Issue a GET against Graph and return the parsed JSON. Throws on non-2xx. */
export async function graphGet<T>(
  path: string,
  params?: Record<string, string>,
  headers?: Record<string, string>,
): Promise<T> {
  const url = new URL(GRAPH + path);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await getToken()}`, ...(headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Graph GET ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

let groupIdCache: string | null = null;

/** Resolve (and cache) the All Staff group's object id. */
export async function groupId(): Promise<string> {
  if (groupIdCache) return groupIdCache;
  const explicit = cfg("ALLSTAFF_GROUP_ID");
  if (explicit) return (groupIdCache = explicit);
  const mail = cfg("ALLSTAFF_GROUP", "allstaff@fieldstonehomes.com");
  const data = await graphGet<{ value: { id: string }[] }>("/groups", {
    $filter: `mail eq '${mail}'`,
    $select: "id,displayName,mail",
  });
  const vals = data.value ?? [];
  if (vals.length === 0) throw new Error(`No M365 group found with mail '${mail}'`);
  return (groupIdCache = vals[0].id);
}
