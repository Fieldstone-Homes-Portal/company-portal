import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessApp } from "@/lib/roles";
import { findCompanyLink } from "@/lib/companyLinks";

/**
 * Records that the signed-in user opened an app or a company link, powering the
 * Home page's "recently opened" row. One row per (user, kind, target): a repeat
 * open just bumps `openedAt`.
 *
 * Body: { kind: "app" | "link", id: string }
 *   - kind "app":  id = PortalApp.id   (we resolve canonical name/icon server-side)
 *   - kind "link": id = the link's URL (validated against the company-links list)
 *
 * The payload is never trusted for display data — we look up the canonical
 * label/icon/url from the DB or the links list, so a user can't inject arbitrary
 * entries into their own history. Returns 204 on success or when the target is
 * unknown/inaccessible (tracking is best-effort and must never surface an error
 * to the user's click).
 *
 * Besides the RecentOpen upsert (which keeps only each user's LATEST open per
 * target), every valid open also appends a row to AppOpenEvent — the
 * append-only log behind /admin/analytics. App-level only: which app/link,
 * which user, when. Nothing about activity inside the app is recorded.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });

  let body: { kind?: unknown; id?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const kind = body.kind;
  const id = body.id;
  if (typeof id !== "string" || (kind !== "app" && kind !== "link")) {
    return new Response(null, { status: 400 });
  }

  let label: string;
  let icon: string | null = null;
  let url: string | null = null;
  let targetId: string;

  if (kind === "app") {
    const app = await prisma.portalApp.findUnique({
      where: { id },
      include: { departments: { select: { id: true, name: true } } },
    });
    // Silently ignore unknown / inactive / inaccessible apps.
    if (!app || !app.isActive || !canAccessApp(session.user, app)) {
      return new Response(null, { status: 204 });
    }
    targetId = app.id;
    label = app.name;
    icon = app.icon;
    url = null;
  } else {
    const link = findCompanyLink(id);
    if (!link) return new Response(null, { status: 204 });
    targetId = link.url;
    label = link.name;
    icon = link.icon;
    url = link.url;
  }

  await prisma.$transaction([
    // Recents: one row per (user, kind, target) — unchanged behavior.
    prisma.recentOpen.upsert({
      where: {
        userId_kind_targetId: { userId: session.user.id, kind, targetId },
      },
      update: { openedAt: new Date(), label, icon, url },
      create: { userId: session.user.id, kind, targetId, label, icon, url },
    }),
    // Analytics: append-only — every open is a new row.
    prisma.appOpenEvent.create({
      data: { userId: session.user.id, kind, targetId, label },
    }),
  ]);

  return new Response(null, { status: 204 });
}
