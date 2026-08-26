import { prisma } from "@/lib/prisma";
import { canAccessApp } from "@/lib/roles";
import type { Role } from "@prisma/client";
import {
  COMPANY_HITS_CAP,
  MY_MOST_USED_CAP,
  TRAILING_WINDOW_DAYS,
  topAppsByOpens,
} from "@/lib/toolbox";

/**
 * Server-side data assembly for the tag-based Toolbox page. Fetches ONLY
 * what the current user can access (canAccessApp) and everything downstream
 * (tag counts, smart tags, search) is computed from that set — the guardrail
 * that keeps tags out of the access-control model.
 */

/** Serializable app shape handed to the client explorer. */
export interface ToolboxApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  url: string;
  openIn: string;
  stage: string;
  section: string;
  sortOrder: number;
  createdAt: string;
  departments: { id: string; name: string }[];
  tags: { name: string; displayName: string }[];
}

export interface ToolboxData {
  apps: ToolboxApp[];
  /** App ids the user has starred. */
  favoriteIds: string[];
  /** The user's own top apps by opens in the window (already access-scoped). */
  mostUsedIds: string[];
  /**
   * Org-wide top apps by opens — computed across ALL apps first, then
   * intersected with the user's accessible set, so it never reveals an app
   * the user can't see (they just get fewer than the cap).
   */
  companyHitIds: string[];
  /** Org-wide opens per accessible app id — ranks sidebar tags by real usage. */
  opensByApp: Record<string, number>;
}

type SessionUser = {
  id: string;
  role: Role;
  departments?: { id: string; name: string }[];
};

/* ---------------------------------------------------------------------- */
/*  Company-wide opens aggregate — identical for every user, so cache it   */
/*  in-process for a few minutes instead of re-aggregating per request.    */
/* ---------------------------------------------------------------------- */

const COMPANY_OPENS_TTL_MS = 5 * 60 * 1000;
let companyOpensCache: { expires: number; data: Map<string, number> } | null =
  null;

async function getCompanyOpens(): Promise<Map<string, number>> {
  const now = Date.now();
  if (companyOpensCache && companyOpensCache.expires > now) {
    return companyOpensCache.data;
  }
  const since = new Date(now - TRAILING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.appOpenEvent.groupBy({
    by: ["targetId"],
    where: { kind: "app", openedAt: { gte: since } },
    _count: { _all: true },
  });
  const data = new Map(rows.map((r) => [r.targetId, r._count._all]));
  companyOpensCache = { expires: now + COMPANY_OPENS_TTL_MS, data };
  return data;
}

/** Test/admin hook: drop the cached aggregate (e.g. after bulk imports). */
export function clearCompanyOpensCache() {
  companyOpensCache = null;
}

/* ---------------------------------------------------------------------- */

export async function getToolboxData(user: SessionUser): Promise<ToolboxData> {
  const since = new Date(
    Date.now() - TRAILING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const [apps, favorites, ownOpenRows, companyOpens] = await Promise.all([
    // The Toolbox is the tag-driven browser over EVERY active app the user
    // can access — tools and dashboards alike (the "tool"/"dashboard" type
    // tags take over the old section split; /dashboards still exists).
    prisma.portalApp.findMany({
      where: { isActive: true },
      include: {
        departments: { select: { id: true, name: true } },
        grants: { select: { userId: true } },
        tags: {
          select: { name: true, displayName: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.favorite.findMany({
      where: { userId: user.id },
      select: { appId: true },
    }),
    prisma.appOpenEvent.groupBy({
      by: ["targetId"],
      where: { userId: user.id, kind: "app", openedAt: { gte: since } },
      _count: { _all: true },
    }),
    getCompanyOpens(),
  ]);

  const visible = apps.filter((app) => canAccessApp(user, app));
  const visibleIds = new Set(visible.map((a) => a.id));

  // Favorites can go stale (access revoked later) — scope them too.
  const favoriteIds = favorites
    .map((f) => f.appId)
    .filter((id) => visibleIds.has(id));

  // My Most Used: the user's own opens, scoped to what they can still
  // access, THEN capped — losing access to an old favorite shouldn't
  // burn one of the 8 slots.
  const ownOpens = new Map(
    ownOpenRows
      .filter((r) => visibleIds.has(r.targetId))
      .map((r) => [r.targetId, r._count._all]),
  );
  const mostUsedIds = topAppsByOpens(ownOpens, MY_MOST_USED_CAP);

  // Company Hits: org-wide top N first, intersect with accessible after.
  const companyHitIds = topAppsByOpens(companyOpens, COMPANY_HITS_CAP).filter(
    (id) => visibleIds.has(id),
  );

  // Org-wide opens for tag ranking — but only for apps this user can see.
  const opensByApp: Record<string, number> = {};
  for (const id of visibleIds) {
    const n = companyOpens.get(id);
    if (n) opensByApp[id] = n;
  }

  return {
    apps: visible.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      url: a.url,
      openIn: a.openIn,
      stage: a.stage,
      section: a.section,
      sortOrder: a.sortOrder,
      createdAt: a.createdAt.toISOString(),
      departments: a.departments,
      tags: a.tags,
    })),
    favoriteIds,
    mostUsedIds,
    companyHitIds,
    opensByApp,
  };
}
