import { prisma } from "@/lib/prisma";

/**
 * Aggregation queries behind the admin-only /admin/analytics page.
 *
 * Everything reads the two analytics tables:
 *   - AppOpenEvent   — append-only log of opens (apps + company links)
 *   - AppUsageSession — visible time on embedded apps, from heartbeats
 *
 * All data is app-level: which app, which user, when, and how long the embed
 * was visible. There is deliberately nothing finer-grained to query.
 */

export type WindowDays = 7 | 30 | 90;

export interface AppUsageRow {
  kind: string;
  targetId: string;
  label: string;
  icon: string | null;
  /** Total opens in the window. */
  opens: number;
  /** Distinct users who opened it in the window. */
  users: number;
  /** Total visible seconds on the embed in the window (apps only). */
  activeSeconds: number;
  /** Still-registered active PortalApp? (links + deleted apps → false) */
  isCurrentApp: boolean;
}

export interface DailyOpens {
  /** YYYY-MM-DD (Mountain-time day — America/Denver). */
  day: string;
  opens: number;
}

export interface LeastUsedApp {
  id: string;
  name: string;
  icon: string | null;
  section: string;
  opens: number;
  users: number;
}

export interface AnalyticsData {
  windowDays: WindowDays;
  /** When event collection began (first recorded event) — null if none yet. */
  dataSince: Date | null;
  totals: {
    opens: number;
    activeUsers: number;
    itemsUsed: number;
    activeSeconds: number;
  };
  /** Most-opened apps + links in the window, descending. */
  topItems: AppUsageRow[];
  /** Opens per day across the whole window (zero-filled). */
  daily: DailyOpens[];
  /** Active portal apps with the fewest opens in the window, ascending. */
  leastUsed: LeastUsedApp[];
}

/* ------------------------------------------------------------------------- */
/*  Drill-downs (modal on /admin/analytics — served by /api/analytics/…)      */
/* ------------------------------------------------------------------------- */

/** One user's activity on a specific app/link within the window. */
export interface DrilldownUserRow {
  name: string | null;
  email: string;
  opens: number;
  /** Visible embed seconds on this app in the window (0 for links). */
  activeSeconds: number;
  /** ISO timestamp of the user's most recent open in the window. */
  lastOpenedAt: string;
}

export interface ItemDrilldown {
  kind: string;
  targetId: string;
  label: string;
  icon: string | null;
  users: DrilldownUserRow[];
  /** Opens per Mountain-time day for THIS item, zero-filled. */
  daily: DailyOpens[];
}

export interface DayDrilldown {
  /** YYYY-MM-DD Mountain-time day. */
  day: string;
  items: { kind: string; targetId: string; label: string; opens: number; users: number }[];
  users: { name: string | null; email: string; opens: number }[];
}

/** One user's totals across everything in the window. */
export interface UserTotalsRow {
  name: string | null;
  email: string;
  opens: number;
  /** Distinct apps + links the user opened. */
  distinctItems: number;
  /** Total visible embed seconds across all apps. */
  activeSeconds: number;
}

interface RawOpenRow {
  kind: string;
  targetId: string;
  label: string;
  opens: bigint;
  users: bigint;
}

interface RawDailyRow {
  day: string;
  opens: bigint;
}

interface RawUsageRow {
  targetId: string;
  seconds: bigint | null;
}

/**
 * Zero-fill a { "YYYY-MM-DD" → opens } map into one entry per day of the
 * window, ending on today's Mountain-time date (matches the SQL bucketing).
 */
function zeroFillDays(opensByDay: Map<string, number>, windowDays: WindowDays): DailyOpens[] {
  const daily: DailyOpens[] = [];
  const todayDenver = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
  }).format(new Date());
  const start = new Date(`${todayDenver}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ day: key, opens: opensByDay.get(key) ?? 0 });
  }
  return daily;
}

export async function getAnalytics(windowDays: WindowDays): Promise<AnalyticsData> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [openRows, dailyRows, usageRows, firstEvent, activeApps, activeUserCount] =
    await Promise.all([
      // Opens + distinct users per target in the window.
      prisma.$queryRaw<RawOpenRow[]>`
        SELECT "kind", "targetId",
               MAX("label") AS "label",
               COUNT(*) AS "opens",
               COUNT(DISTINCT "userId") AS "users"
        FROM "AppOpenEvent"
        WHERE "openedAt" >= ${since}
        GROUP BY "kind", "targetId"
        ORDER BY COUNT(*) DESC
      `,
      // Opens per Mountain-time day (buckets match the company's clock,
      // not UTC — otherwise evening opens land on tomorrow's bar).
      prisma.$queryRaw<RawDailyRow[]>`
        SELECT to_char("openedAt" AT TIME ZONE 'America/Denver', 'YYYY-MM-DD') AS "day",
               COUNT(*) AS "opens"
        FROM "AppOpenEvent"
        WHERE "openedAt" >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      // Visible time per embedded app.
      prisma.$queryRaw<RawUsageRow[]>`
        SELECT "targetId", SUM("activeSeconds") AS "seconds"
        FROM "AppUsageSession"
        WHERE "startedAt" >= ${since} AND "kind" = 'app'
        GROUP BY "targetId"
      `,
      prisma.appOpenEvent.findFirst({
        orderBy: { openedAt: "asc" },
        select: { openedAt: true },
      }),
      prisma.portalApp.findMany({
        where: { isActive: true },
        select: { id: true, name: true, icon: true, section: true },
      }),
      prisma.$queryRaw<{ users: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") AS "users"
        FROM "AppOpenEvent"
        WHERE "openedAt" >= ${since}
      `,
    ]);

  const secondsByTarget = new Map(
    usageRows.map((r) => [r.targetId, Number(r.seconds ?? 0)]),
  );
  const appById = new Map(activeApps.map((a) => [a.id, a]));

  const topItems: AppUsageRow[] = openRows.map((r) => {
    const app = r.kind === "app" ? appById.get(r.targetId) : undefined;
    return {
      kind: r.kind,
      targetId: r.targetId,
      // Prefer the app's current name; fall back to the label at open time.
      label: app?.name ?? r.label,
      icon: app?.icon ?? null,
      opens: Number(r.opens),
      users: Number(r.users),
      activeSeconds: r.kind === "app" ? (secondsByTarget.get(r.targetId) ?? 0) : 0,
      isCurrentApp: Boolean(app),
    };
  });

  // Zero-fill days so the chart shows the whole window, anchored to
  // today's date in Mountain time to match the SQL bucketing above.
  const daily = zeroFillDays(
    new Map(dailyRows.map((r) => [r.day, Number(r.opens)])),
    windowDays,
  );

  // Least-used: every ACTIVE app ranked by opens ascending — zero-open apps
  // (the strongest retirement candidates) come first.
  const opensByApp = new Map(
    openRows.filter((r) => r.kind === "app").map((r) => [r.targetId, r]),
  );
  const leastUsed: LeastUsedApp[] = activeApps
    .map((a) => {
      const row = opensByApp.get(a.id);
      return {
        id: a.id,
        name: a.name,
        icon: a.icon,
        section: a.section,
        opens: row ? Number(row.opens) : 0,
        users: row ? Number(row.users) : 0,
      };
    })
    .sort((a, b) => a.opens - b.opens || a.users - b.users || a.name.localeCompare(b.name));

  const totals = {
    opens: topItems.reduce((s, r) => s + r.opens, 0),
    activeUsers: Number(activeUserCount[0]?.users ?? 0),
    itemsUsed: topItems.length,
    activeSeconds: topItems.reduce((s, r) => s + r.activeSeconds, 0),
  };

  return {
    windowDays,
    dataSince: firstEvent?.openedAt ?? null,
    totals,
    topItems,
    daily,
    leastUsed,
  };
}

/**
 * Drill-down for one app/link: WHO opened it in the window (opens, embed
 * time, last opened) plus its own per-day open counts for a sparkline.
 * Returns null when nothing was recorded for the target in the window.
 */
export async function getItemDrilldown(
  kind: "app" | "link",
  targetId: string,
  windowDays: WindowDays,
): Promise<ItemDrilldown | null> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [userRows, dailyRows, usageRows, app] = await Promise.all([
    prisma.$queryRaw<
      { name: string | null; email: string; opens: bigint; last: Date; label: string }[]
    >`
      SELECT u."name", u."email",
             COUNT(*) AS "opens",
             MAX(e."openedAt") AS "last",
             MAX(e."label") AS "label"
      FROM "AppOpenEvent" e
      JOIN "User" u ON u."id" = e."userId"
      WHERE e."openedAt" >= ${since}
        AND e."kind" = ${kind} AND e."targetId" = ${targetId}
      GROUP BY u."id", u."name", u."email"
      ORDER BY COUNT(*) DESC, MAX(e."openedAt") DESC
    `,
    prisma.$queryRaw<RawDailyRow[]>`
      SELECT to_char("openedAt" AT TIME ZONE 'America/Denver', 'YYYY-MM-DD') AS "day",
             COUNT(*) AS "opens"
      FROM "AppOpenEvent"
      WHERE "openedAt" >= ${since}
        AND "kind" = ${kind} AND "targetId" = ${targetId}
      GROUP BY 1
      ORDER BY 1
    `,
    // Per-user embed time on this app (links have none).
    kind === "app"
      ? prisma.$queryRaw<{ email: string; seconds: bigint | null }[]>`
          SELECT u."email", SUM(s."activeSeconds") AS "seconds"
          FROM "AppUsageSession" s
          JOIN "User" u ON u."id" = s."userId"
          WHERE s."startedAt" >= ${since}
            AND s."kind" = 'app' AND s."targetId" = ${targetId}
          GROUP BY u."email"
        `
      : Promise.resolve([]),
    kind === "app"
      ? prisma.portalApp.findUnique({
          where: { id: targetId },
          select: { name: true, icon: true },
        })
      : Promise.resolve(null),
  ]);

  if (userRows.length === 0) return null;

  const secondsByEmail = new Map(
    usageRows.map((r) => [r.email, Number(r.seconds ?? 0)]),
  );

  return {
    kind,
    targetId,
    label: app?.name ?? userRows[0].label,
    icon: app?.icon ?? null,
    users: userRows.map((r) => ({
      name: r.name,
      email: r.email,
      opens: Number(r.opens),
      activeSeconds: secondsByEmail.get(r.email) ?? 0,
      lastOpenedAt: r.last.toISOString(),
    })),
    daily: zeroFillDays(
      new Map(dailyRows.map((r) => [r.day, Number(r.opens)])),
      windowDays,
    ),
  };
}

/**
 * Drill-down for one Mountain-time day: which apps/links were opened (with
 * open + distinct-user counts) and which users were active (with opens).
 * `day` must be a YYYY-MM-DD string — the same key the daily chart uses.
 */
export async function getDayDrilldown(day: string): Promise<DayDrilldown> {
  const [itemRows, userRows] = await Promise.all([
    prisma.$queryRaw<
      { kind: string; targetId: string; label: string; opens: bigint; users: bigint }[]
    >`
      SELECT "kind", "targetId",
             MAX("label") AS "label",
             COUNT(*) AS "opens",
             COUNT(DISTINCT "userId") AS "users"
      FROM "AppOpenEvent"
      WHERE to_char("openedAt" AT TIME ZONE 'America/Denver', 'YYYY-MM-DD') = ${day}
      GROUP BY "kind", "targetId"
      ORDER BY COUNT(*) DESC
    `,
    prisma.$queryRaw<{ name: string | null; email: string; opens: bigint }[]>`
      SELECT u."name", u."email", COUNT(*) AS "opens"
      FROM "AppOpenEvent" e
      JOIN "User" u ON u."id" = e."userId"
      WHERE to_char(e."openedAt" AT TIME ZONE 'America/Denver', 'YYYY-MM-DD') = ${day}
      GROUP BY u."id", u."name", u."email"
      ORDER BY COUNT(*) DESC
    `,
  ]);

  return {
    day,
    items: itemRows.map((r) => ({
      kind: r.kind,
      targetId: r.targetId,
      label: r.label,
      opens: Number(r.opens),
      users: Number(r.users),
    })),
    users: userRows.map((r) => ({
      name: r.name,
      email: r.email,
      opens: Number(r.opens),
    })),
  };
}

/**
 * Per-user totals across the whole window: opens, distinct apps/links used,
 * and total visible embed time. Sorted by opens descending (the client can
 * re-sort by time). Backs the "Active users" / "Total opens" / "Time in
 * apps" tile drill-downs.
 */
export async function getUserTotals(windowDays: WindowDays): Promise<UserTotalsRow[]> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [openRows, usageRows] = await Promise.all([
    prisma.$queryRaw<
      { name: string | null; email: string; opens: bigint; items: bigint }[]
    >`
      SELECT u."name", u."email",
             COUNT(*) AS "opens",
             COUNT(DISTINCT (e."kind" || ':' || e."targetId")) AS "items"
      FROM "AppOpenEvent" e
      JOIN "User" u ON u."id" = e."userId"
      WHERE e."openedAt" >= ${since}
      GROUP BY u."id", u."name", u."email"
      ORDER BY COUNT(*) DESC
    `,
    prisma.$queryRaw<{ email: string; seconds: bigint | null }[]>`
      SELECT u."email", SUM(s."activeSeconds") AS "seconds"
      FROM "AppUsageSession" s
      JOIN "User" u ON u."id" = s."userId"
      WHERE s."startedAt" >= ${since}
      GROUP BY u."email"
    `,
  ]);

  const secondsByEmail = new Map(
    usageRows.map((r) => [r.email, Number(r.seconds ?? 0)]),
  );

  return openRows.map((r) => ({
    name: r.name,
    email: r.email,
    opens: Number(r.opens),
    distinctItems: Number(r.items),
    activeSeconds: secondsByEmail.get(r.email) ?? 0,
  }));
}
