import { prisma } from "@/lib/prisma";
import { canAccessApp } from "@/lib/roles";
import type { Role } from "@prisma/client";

/** Apps created within this many days get a "New" badge on their Toolbox tile. */
export const NEW_APP_WINDOW_DAYS = 14;

/** True if a createdAt timestamp falls inside the "New" badge window. */
export function isNewApp(createdAt: Date, now = new Date()): boolean {
  const ageMs = now.getTime() - createdAt.getTime();
  return ageMs >= 0 && ageMs < NEW_APP_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** A resolved, render-ready "What's New" entry. */
export interface WhatsNewItem {
  id: string;
  /** "new-app" for auto-seeded entries, "update" for manual notes. */
  kind: string;
  title: string;
  body: string | null;
  /** Short human label like "Today", "Yesterday", or "Jul 18" (Denver time). */
  dateLabel: string;
  /** Name of the linked app, if any (survives app deletion as null). */
  appName: string | null;
  /** Lucide icon key of the linked app (see lib/appIcons). */
  appIcon: string | null;
  /**
   * Link to open the app — set ONLY when the app is still active AND the
   * viewing user passes canAccessApp. Notes about apps the user can't open
   * still appear, just without the link.
   */
  appHref: string | null;
}

interface UserForNotes {
  id?: string;
  role: Role;
  departments?: { id: string; name: string }[];
}

/**
 * Format a note date for the feed, in company (Denver) time:
 * "Today" / "Yesterday" / "Jul 18" / "Dec 30, 2025" (year only when different).
 */
export function formatNoteDate(date: Date, now = new Date()): string {
  const denverYmd = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
  const today = denverYmd(now);
  const noteDay = denverYmd(date);
  if (noteDay === today) return "Today";
  const yesterday = denverYmd(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (noteDay === yesterday) return "Yesterday";
  const sameYear = noteDay.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * The `limit` newest published release notes, resolved for a specific viewer.
 *
 * Everyone sees every published note (announcements are portal-wide); access
 * gating only controls whether the "Open app →" link renders. Future-dated
 * notes are excluded so admins can stage announcements ahead of a rollout.
 */
export async function getWhatsNew(
  user: UserForNotes,
  limit = 4,
): Promise<WhatsNewItem[]> {
  const notes = await prisma.releaseNote.findMany({
    where: { publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: {
      app: {
        select: {
          id: true,
          name: true,
          icon: true,
          isActive: true,
          allStaff: true,
          departments: { select: { id: true, name: true } },
          grants: { select: { userId: true } },
        },
      },
    },
  });

  const now = new Date();
  return notes.map((note) => {
    const app = note.app;
    const linkable = !!app && app.isActive && canAccessApp(user, app);
    return {
      id: note.id,
      kind: note.kind,
      title: note.title,
      body: note.body,
      dateLabel: formatNoteDate(note.publishedAt, now),
      appName: app?.name ?? null,
      appIcon: app?.icon ?? null,
      appHref: linkable ? `/apps/${app.id}` : null,
    };
  });
}
