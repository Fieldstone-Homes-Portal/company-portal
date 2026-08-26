/**
 * One-time (but safely re-runnable) backfill: auto-tag every portal app so
 * the tag-based Toolbox is never empty during rollout.
 *
 * Run with:  npx tsx prisma/backfill-tags.ts
 * (Locally, or in the Railway shell against prod after deploying.)
 *
 * What each app gets:
 *   1. A tag for its legacy `category` (one tag per distinct category —
 *      the migration path from single-category navigation).
 *   2. A TYPE tag from its `section`: "tool" or "dashboard".
 *   3. DEPARTMENT tags — from its access-gating departments when it has
 *      them, otherwise inferred from keywords in its name/description.
 *      (Tags stay navigation-only: we read the gating to seed sensible
 *      tags, we never write it.)
 *   4. Any extra keyword tags that match (map, reports, etc.).
 *
 * Idempotent and additive: tags are upserted, assignments use `connect`,
 * and nothing an admin already assigned is ever removed. Apps that end up
 * without a department tag are listed at the end — finish those by hand in
 * Access Studio (app editor → Tags) or /admin/tags.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** "customer-service" → "Customer Service"; also used to slugify. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function titleize(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w === "hr" || w === "it" || w === "ai" ? w.toUpperCase() : w[0]?.toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * The canonical default tag vocabulary — departmental first. These are
 * always created (even before any app carries them) so the admin pickers
 * start from a sensible, consistent set. sortOrder keeps them on top of
 * admin lists in this order.
 */
const DEFAULT_TAGS: { slug: string; displayName: string; sortOrder: number }[] = [
  { slug: "accounting", displayName: "Accounting", sortOrder: 1 },
  { slug: "finance", displayName: "Finance", sortOrder: 2 },
  { slug: "marketing", displayName: "Marketing", sortOrder: 3 },
  { slug: "sales", displayName: "Sales", sortOrder: 4 },
  { slug: "construction", displayName: "Construction", sortOrder: 5 },
  { slug: "land", displayName: "Land", sortOrder: 6 },
  { slug: "land-development", displayName: "Land Development", sortOrder: 7 },
  { slug: "customer-service", displayName: "Customer Service", sortOrder: 8 },
];

/**
 * Legacy `category` values worth carrying over, mapped onto the default
 * vocabulary. Generic categories ("tools", "general") are deliberately NOT
 * migrated — the tool/dashboard type tags already cover them and they'd
 * just be noise in the sidebar.
 */
const CATEGORY_TAG_MAP: Record<string, string> = {
  accounting: "accounting",
  finance: "finance",
  marketing: "marketing",
  sales: "sales",
  construction: "construction",
  land: "land",
};

/**
 * Keyword rules, matched (case-insensitively) against an app's name,
 * description, category, and id. Two kinds:
 *   - dept: true  → the tag counts as a department tag (satisfying "every
 *     app carries at least one department tag" even for all-staff apps
 *     with no gating departments).
 *   - dept: false → plain descriptive tag.
 * Edit freely and re-run — the script only ever adds.
 */
const KEYWORD_RULES: { slug: string; dept: boolean; pattern: RegExp }[] = [
  // Departmental keywords (the default vocabulary above)
  { slug: "sales", dept: true, pattern: /\b(sales|selling|listings?|quick move|model home|homefiniti|flyers?)\b/i },
  { slug: "construction", dept: true, pattern: /\b(construction|superintendents?|field|trades?|lot status|releases?|closings?)\b/i },
  { slug: "land", dept: true, pattern: /\b(land|plats?|subdivisions?|lots?)\b/i },
  { slug: "land-development", dept: true, pattern: /\b(land development|development|entitlements?|acquisitions?)\b/i },
  { slug: "marketing", dept: true, pattern: /\b(marketing|brand|flyers?|surveys?|campaigns?|image|opt.?out|social)\b/i },
  { slug: "accounting", dept: true, pattern: /\b(accounting|invoices?|liens?|waivers?|payments?|payroll|ap|ar|vendors?)\b/i },
  { slug: "finance", dept: true, pattern: /\b(finance|financial|cash|budgets?|forecasts?)\b/i },
  { slug: "customer-service", dept: true, pattern: /\b(warranty|homeowners?|customer service|post.?close|requests?)\b/i },
  { slug: "design", dept: true, pattern: /\b(design|drafting|architects?|drawings?|options?)\b/i },
  { slug: "hr", dept: true, pattern: /\b(hr|hiring|benefits?|employees?|onboarding)\b/i },
  { slug: "it", dept: true, pattern: /\b(infrastructure|security|proxy)\b/i },
  // Descriptive extras
  { slug: "map", dept: false, pattern: /\b(maps?|mapping|plats?|lots?)\b/i },
  { slug: "reports", dept: false, pattern: /\b(reports?|reporting|analytics|dashboards?|summary|trackers?)\b/i },
  { slug: "ai", dept: false, pattern: /\b(ai|assistant|blueprint|image studio)\b/i },
];

const TYPE_TAGS: Record<string, string> = {
  tool: "tool",
  dashboard: "dashboard",
};

/**
 * Gating departments that are REAL org units and may become tags. Access
 * Studio also uses departments as access-control groups ("Test", "Limited",
 * "Advanced Claude", "Sales Report") — those must never leak into
 * navigation, so department-derived tags are allowlist-only.
 */
const DEPT_TAG_ALLOWLIST = new Set([
  ...DEFAULT_TAGS.map((t) => t.slug),
  "executive",
  "design",
  "hr",
  "it",
]);

async function upsertTag(slug: string, displayName?: string, sortOrder?: number) {
  return prisma.tag.upsert({
    where: { name: slug },
    update: {},
    create: {
      name: slug,
      displayName: displayName || titleize(slug),
      sortOrder: sortOrder ?? 0,
    },
  });
}

async function main() {
  const apps = await prisma.portalApp.findMany({
    include: {
      departments: { select: { name: true } },
      tags: { select: { name: true } },
    },
  });
  if (apps.length === 0) {
    console.log("No apps to tag.");
    return;
  }

  // ------------------------------------------------------------------
  // 1. The default departmental vocabulary + type tags.
  // ------------------------------------------------------------------
  for (const t of DEFAULT_TAGS) await upsertTag(t.slug, t.displayName, t.sortOrder);
  console.log(
    `Ensured ${DEFAULT_TAGS.length} default tags: ${DEFAULT_TAGS.map((t) => t.slug).join(", ")}`,
  );
  for (const t of Object.values(TYPE_TAGS)) await upsertTag(t, undefined, 20);

  // ------------------------------------------------------------------
  // 2. Per-app assignment.
  // ------------------------------------------------------------------
  const missingDept: string[] = [];

  for (const app of apps) {
    const text = `${app.name} ${app.description || ""} ${app.category} ${app.id}`;
    const slugs = new Set<string>();
    let hasDeptTag = false;

    // Legacy category — only when it maps onto the default vocabulary
    // (generic categories like "tools"/"general" are covered by type tags).
    // Everything in the map is departmental, so it satisfies the guarantee.
    const cat = CATEGORY_TAG_MAP[slugify(app.category)];
    if (cat) {
      slugs.add(cat);
      hasDeptTag = true;
    }

    // Type from section (unknown sections fall back to "tool").
    slugs.add(TYPE_TAGS[app.section] || TYPE_TAGS.tool);

    // Department tags from access gating — the strongest signal, but only
    // for real org units (see DEPT_TAG_ALLOWLIST).
    for (const dept of app.departments) {
      const slug = slugify(dept.name);
      if (!DEPT_TAG_ALLOWLIST.has(slug)) continue;
      slugs.add(slug);
      hasDeptTag = true;
    }

    // Keyword rules (both flavors).
    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(text)) {
        slugs.add(rule.slug);
        if (rule.dept) hasDeptTag = true;
      }
    }

    if (!hasDeptTag) missingDept.push(app.name);

    // Upsert every tag, then connect (additive — admin assignments survive).
    // Tags outside the default vocabulary sort after it (30) so departmental
    // tags lead everywhere order falls back to sortOrder (pickers, chips).
    const tagIds: string[] = [];
    for (const slug of slugs) {
      const tag = await upsertTag(slug, undefined, 30);
      tagIds.push(tag.id);
    }
    await prisma.portalApp.update({
      where: { id: app.id },
      data: { tags: { connect: tagIds.map((id) => ({ id })) } },
    });

    const before = new Set(app.tags.map((t) => t.name));
    const added = [...slugs].filter((s) => !before.has(s));
    console.log(
      `${app.name}: ${[...slugs].join(", ")}${added.length ? "" : " (no change)"}`,
    );
  }

  // ------------------------------------------------------------------
  // 3. Report gaps for manual follow-up in the UI.
  // ------------------------------------------------------------------
  if (missingDept.length > 0) {
    console.log(
      `\n⚠ No department tag could be inferred for: ${missingDept.join(", ")}.\n` +
        "  Assign one in Access Studio (edit app → Tags) or /admin/tags.",
    );
  } else {
    console.log("\nEvery app carries at least one department tag. ✓");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
