import { prisma } from "@/lib/prisma";
import { canAccessApp } from "@/lib/roles";
import type { Role } from "@prisma/client";

/** A resolved, render-ready "recently opened" item for the Home page. */
export interface RecentItem {
  kind: "app" | "link";
  /** Where the tile navigates: /apps/{id} for apps, the external URL for links. */
  href: string;
  label: string;
  /** Lucide icon key for apps; emoji for links. */
  icon: string | null;
  /** True for links (open in a new tab + record the re-open). */
  external: boolean;
  /** Lifecycle stage (AppStage) for apps — drives the stage badge. Null for links. */
  stage: string | null;
}

interface UserForRecents {
  id: string;
  role: Role;
  departments?: { id: string; name: string }[];
}

/**
 * The user's `limit` most-recently-opened items (apps + links, newest first).
 *
 * App rows are re-validated against the *current* PortalApp state and the user's
 * access, so deactivated/removed apps — or apps the user has since lost access to
 * (role/department change) — silently drop off rather than showing a dead tile.
 * We over-fetch to backfill those gaps before slicing to `limit`.
 */
export async function getRecentOpens(
  user: UserForRecents,
  limit = 3,
): Promise<RecentItem[]> {
  const rows = await prisma.recentOpen.findMany({
    where: { userId: user.id },
    orderBy: { openedAt: "desc" },
    take: limit * 4,
  });
  if (rows.length === 0) return [];

  // Batch-load the apps referenced by app-kind rows so we can verify each is
  // still active and accessible.
  const appIds = rows.filter((r) => r.kind === "app").map((r) => r.targetId);
  const apps = appIds.length
    ? await prisma.portalApp.findMany({
        where: { id: { in: appIds }, isActive: true },
        include: { departments: { select: { id: true, name: true } } },
      })
    : [];
  const appMap = new Map(apps.map((a) => [a.id, a]));

  const items: RecentItem[] = [];
  for (const r of rows) {
    if (items.length >= limit) break;
    if (r.kind === "app") {
      const app = appMap.get(r.targetId);
      if (!app || !canAccessApp(user, app)) continue;
      items.push({
        kind: "app",
        href: `/apps/${app.id}`,
        label: app.name,
        icon: app.icon,
        external: false,
        // SOFT LAUNCH: lifecycle-stage badges are admin-only for now. Drop
        // this gate (always pass app.stage) when stages go live for everyone.
        stage: user.role === "ADMIN" ? app.stage : null,
      });
    } else {
      if (!r.url) continue;
      items.push({
        kind: "link",
        href: r.url,
        label: r.label,
        icon: r.icon,
        external: true,
        stage: null,
      });
    }
  }
  return items;
}
