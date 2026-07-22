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
  /** YYYY-MM-DD (UTC day). */
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

interface RawOpenRow {
  kind: string;
  targetId: string;
  label: string;
  opens: bigint;
  users: bigint;
}

interface RawDailyRow {
  day: Date;
  opens: bigint;
}

interface RawUsageRow {
  targetId: string;
  seconds: bigint | null;
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
      // Opens per UTC day.
      prisma.$queryRaw<RawDailyRow[]>`
        SELECT date_trunc('day', "openedAt") AS "day", COUNT(*) AS "opens"
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

  // Zero-fill days so the chart shows the whole window.
  const opensByDay = new Map(
    dailyRows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.opens)]),
  );
  const daily: DailyOpens[] = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ day: key, opens: opensByDay.get(key) ?? 0 });
  }

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
