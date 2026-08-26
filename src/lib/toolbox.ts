/**
 * Pure logic behind the tag-based Toolbox navigation. No Prisma, no React —
 * everything here takes plain data and returns plain data so it can be unit
 * tested and shared between the server page (initial render) and the client
 * explorer (live filtering).
 *
 * The access guardrail lives one level up: every function here operates on
 * a list of apps the CALLER has already filtered down to what the current
 * user can access (via canAccessApp). Nothing in this file ever widens that
 * set, so counts, coverage, co-occurrence, and search can't leak apps.
 */

/* ------------------------------- constants ------------------------------- */

/** Trailing window (days) for all usage-derived ranking and smart tags. */
export const TRAILING_WINDOW_DAYS = 90;
/** "My Most Used" shows at most this many of the user's own top apps. */
export const MY_MOST_USED_CAP = 8;
/** "Company Hits" is the org-wide top N by opens (before access scoping). */
export const COMPANY_HITS_CAP = 10;
/** How many publisher tags the resting sidebar surfaces before coverage. */
export const RESTING_TAG_COUNT = 5;

/**
 * Filter keys for the three computed pseudo-tags. Publisher tag slugs are
 * constrained to [a-z0-9-] (see slugifyTag), so the "sm:" prefix can never
 * collide with a real tag.
 */
export const SMART_FAVORITES = "sm:favorites";
export const SMART_MOST_USED = "sm:most-used";
export const SMART_COMPANY_HITS = "sm:company-hits";

export const SMART_TAG_LABELS: Record<string, string> = {
  [SMART_FAVORITES]: "Favorites",
  [SMART_MOST_USED]: "My Most Used",
  [SMART_COMPANY_HITS]: "Company Hits",
};

export function isSmartKey(key: string): boolean {
  return key.startsWith("sm:");
}

/**
 * Type tags ("tool"/"dashboard", assigned by the backfill). They cover most
 * of the portal, so they make weak default filters — the resting sidebar
 * skips them when picking its top N (coverage can still add them, and they
 * participate normally in co-occurrence, chips, and search).
 */
export const TYPE_TAG_SLUGS = new Set(["tool", "dashboard"]);

/* --------------------------------- types --------------------------------- */

/** The slice of an app the navigation logic needs. */
export interface NavApp {
  id: string;
  name: string;
  description: string | null;
  /** Publisher tags on the app: slug + what users see. */
  tags: { name: string; displayName: string }[];
}

/** One sidebar entry: a filterable tag (real or smart) with a live count. */
export interface SidebarTag {
  /** Filter key — a publisher slug or one of the sm: keys. */
  key: string;
  displayName: string;
  /** Number of apps (within the current view) carrying this tag. */
  count: number;
  /** True when the resting list added this tag only to keep an app reachable. */
  coverage?: boolean;
}

/* -------------------------------- slugs ---------------------------------- */

/** "Customer Service " → "customer-service". Empty string when nothing usable. */
export function slugifyTag(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ----------------------------- tag membership ---------------------------- */

/**
 * The full filterable universe for one user's view: every tag key (publisher
 * and smart) mapped to the set of accessible app ids carrying it. Built once
 * per render; every count/filter/co-occurrence question reads from it.
 */
export type TagSets = Map<string, Set<string>>;

/**
 * Build the tag → members index. Smart memberships are passed in already
 * capped and access-scoped (they come from usage data, not from app rows).
 * Empty smart sets are omitted so empty entries never render.
 */
export function buildTagSets(
  apps: NavApp[],
  smart?: {
    favorites?: Set<string>;
    mostUsed?: Set<string>;
    companyHits?: Set<string>;
  },
): TagSets {
  const sets: TagSets = new Map();
  for (const app of apps) {
    for (const tag of app.tags) {
      let set = sets.get(tag.name);
      if (!set) sets.set(tag.name, (set = new Set()));
      set.add(app.id);
    }
  }
  const accessible = new Set(apps.map((a) => a.id));
  const addSmart = (key: string, ids?: Set<string>) => {
    if (!ids) return;
    // Guardrail: smart sets are intersected with the accessible apps again
    // here, even though callers should already have scoped them.
    const scoped = new Set([...ids].filter((id) => accessible.has(id)));
    if (scoped.size > 0) sets.set(key, scoped);
  };
  addSmart(SMART_FAVORITES, smart?.favorites);
  addSmart(SMART_MOST_USED, smart?.mostUsed);
  addSmart(SMART_COMPANY_HITS, smart?.companyHits);
  return sets;
}

/* -------------------------------- filtering ------------------------------ */

/**
 * AND-filter: apps that carry EVERY selected tag key. Unknown keys (e.g. a
 * smart tag that's empty for this user) match nothing, which collapses the
 * result to empty rather than silently ignoring the selection.
 */
export function filterByTags(
  apps: NavApp[],
  selected: string[],
  sets: TagSets,
): NavApp[] {
  if (selected.length === 0) return apps;
  return apps.filter((app) =>
    selected.every((key) => sets.get(key)?.has(app.id)),
  );
}

/* --------------------------------- search -------------------------------- */

/**
 * Tokenized, cross-field search: every whitespace-separated word must match
 * SOMEWHERE in the app (name, description, or any tag — case-insensitive
 * substring), but different words may hit different fields. "sales map"
 * matches an app tagged both "sales" and "map" even though no single field
 * contains the phrase.
 */
export function searchApps(apps: NavApp[], query: string): NavApp[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return apps;
  return apps.filter((app) => {
    const fields = [
      app.name.toLowerCase(),
      (app.description || "").toLowerCase(),
      ...app.tags.flatMap((t) => [
        t.name.toLowerCase(),
        t.displayName.toLowerCase(),
      ]),
    ];
    return words.every((w) => fields.some((f) => f.includes(w)));
  });
}

/* ----------------------------- resting sidebar --------------------------- */

/**
 * Rank publisher tags by real usage: the sum of trailing-window opens across
 * the apps carrying each tag. When analytics are empty (a fresh portal),
 * every usage sum is 0 and the ordering falls through to member count, then
 * name — i.e. raw tag frequency, the documented fallback.
 */
export function rankTagsByUsage(
  sets: TagSets,
  opensByApp: Map<string, number>,
): { key: string; usage: number; count: number }[] {
  const rows = [...sets.entries()]
    .filter(([key]) => !isSmartKey(key))
    .map(([key, members]) => ({
      key,
      usage: [...members].reduce(
        (sum, id) => sum + (opensByApp.get(id) ?? 0),
        0,
      ),
      count: members.size,
    }));
  rows.sort(
    (a, b) =>
      b.usage - a.usage || b.count - a.count || a.key.localeCompare(b.key),
  );
  return rows;
}

/**
 * The resting sidebar's publisher-tag list: the top N tags by usage, then —
 * coverage guarantee — greedily add whichever remaining tag rescues the most
 * still-unreachable apps until every accessible app is reachable under at
 * least one surfaced tag. Smart tags never count toward coverage. Apps with
 * no tags at all can't be rescued by any tag; the page handles those by
 * always showing the full grid at rest.
 */
export function restingTagList(
  apps: NavApp[],
  sets: TagSets,
  opensByApp: Map<string, number>,
  topN: number = RESTING_TAG_COUNT,
): { key: string; count: number; coverage: boolean }[] {
  const ranked = rankTagsByUsage(sets, opensByApp);
  // Departmental/descriptive tags get the top-N slots; broad type tags are
  // held back for the coverage pass.
  const preferred = ranked.filter((r) => !TYPE_TAG_SLUGS.has(r.key));
  const surfaced = preferred.slice(0, topN).map((r) => ({
    key: r.key,
    count: r.count,
    coverage: false,
  }));

  const reachable = new Set<string>();
  for (const s of surfaced) {
    for (const id of sets.get(s.key) ?? []) reachable.add(id);
  }
  // Only apps that carry at least one publisher tag can ever be covered.
  const coverable = apps.filter((a) => a.tags.length > 0);
  let uncovered = coverable.filter((a) => !reachable.has(a.id));
  // Everything not surfaced — including held-back type tags — can rescue.
  const surfacedKeys = new Set(surfaced.map((s) => s.key));
  const remaining = ranked.filter((r) => !surfacedKeys.has(r.key));

  while (uncovered.length > 0 && remaining.length > 0) {
    // Greedy: pick the tag that rescues the most uncovered apps (ties break
    // toward the higher-ranked tag, i.e. earlier in `remaining`).
    let bestIdx = -1;
    let bestRescued = 0;
    for (let i = 0; i < remaining.length; i++) {
      const members = sets.get(remaining[i].key)!;
      const rescued = uncovered.reduce(
        (n, a) => n + (members.has(a.id) ? 1 : 0),
        0,
      );
      if (rescued > bestRescued) {
        bestRescued = rescued;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break; // nothing rescues anything — bail
    const [picked] = remaining.splice(bestIdx, 1);
    surfaced.push({ key: picked.key, count: picked.count, coverage: true });
    const members = sets.get(picked.key)!;
    uncovered = uncovered.filter((a) => !members.has(a.id));
  }

  return surfaced;
}

/* --------------------------- active-state sidebar ------------------------ */

/**
 * With a selection active, the sidebar shows ONLY tags that co-occur with
 * the current result set — i.e. adding them yields at least one app — ranked
 * by their count within that set. Selected keys are excluded (they're pinned
 * separately). Applies to smart tags too, so e.g. Company Hits only appears
 * while filtering if it intersects the current view.
 */
export function coOccurringTags(
  resultApps: NavApp[],
  sets: TagSets,
  selected: string[],
): { key: string; count: number }[] {
  const selectedSet = new Set(selected);
  const resultIds = new Set(resultApps.map((a) => a.id));
  const rows: { key: string; count: number }[] = [];
  for (const [key, members] of sets) {
    if (selectedSet.has(key)) continue;
    let count = 0;
    for (const id of resultIds) if (members.has(id)) count++;
    if (count > 0) rows.push({ key, count });
  }
  rows.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return rows;
}

/* ------------------------------- smart tags ------------------------------ */

/**
 * Top app ids by open count, descending, capped. Used for both smart tags:
 *  - My Most Used: counts are the current user's own opens (already personal,
 *    already limited to apps they can access).
 *  - Company Hits: counts are org-wide opens across ALL apps; the caller
 *    intersects the result with the user's accessible set AFTERWARD (see
 *    buildTagSets), so a hidden app influences nothing visible and is never
 *    revealed — the user just sees fewer than `cap` hits.
 */
export function topAppsByOpens(
  opensByApp: Map<string, number>,
  cap: number,
): string[] {
  return [...opensByApp.entries()]
    .filter(([, opens]) => opens > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, cap)
    .map(([id]) => id);
}

/* ------------------------------ URL filter state -------------------------- */

/**
 * Filter state lives in the Toolbox URL (?tags=a,b&q=…) so the global
 * sidebar can drive it from any page and selections are shareable.
 */
export function parseTagsParam(value: string | null | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((s) => s.trim()).filter(Boolean))];
}

/** Href for the Toolbox with the given selection (and optional search). */
export function toolboxHref(selected: string[], query?: string): string {
  const params = new URLSearchParams();
  if (selected.length > 0) params.set("tags", selected.join(","));
  if (query?.trim()) params.set("q", query.trim());
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

/** The given selection with one key toggled in or out. */
export function toggleKey(selected: string[], key: string): string[] {
  return selected.includes(key)
    ? selected.filter((k) => k !== key)
    : [...selected, key];
}

/* ------------------------------ header helpers ---------------------------- */

/** "Company Hits · Construction" — the selection path for the page heading. */
export function selectionHeading(
  selected: string[],
  displayNameFor: (key: string) => string,
): string {
  return selected.map(displayNameFor).join(" · ");
}
