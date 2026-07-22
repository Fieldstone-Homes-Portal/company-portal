import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Time-on-app heartbeat for embedded apps, powering the "time spent" numbers
 * on /admin/analytics.
 *
 * AppEmbed generates a random `sessionKey` when it mounts and POSTs here every
 * HEARTBEAT_SECONDS while the tab is visible (plus a final beacon when the tab
 * is hidden/closed). Body: { kind: "app", id: string, sessionKey: string }.
 *
 * Server-side accounting: each heartbeat adds the elapsed time since the
 * session's `lastSeenAt` to `activeSeconds`, capped at MAX_DELTA_SECONDS — so
 * a laptop lid closed for an hour adds at most one heartbeat's worth, and a
 * client can't inflate time by lying (durations are computed from server
 * clocks only; the client sends no numbers).
 *
 * Privacy: app-level only — this records that the app's embed page was open
 * and visible, never anything the user did inside the iframe.
 *
 * Best-effort like /api/track-open: unknown targets and malformed beacons get
 * a quiet 204/400 and never surface to the user.
 */

// Must comfortably exceed the client heartbeat interval (60s) so normal
// heartbeats are fully counted, while long invisible gaps are clamped.
const MAX_DELTA_SECONDS = 90;
// Client keys are crypto.randomUUID(); accept a sane charset/length so junk
// can't be stored, without being brittle about exact UUID formatting.
const SESSION_KEY_RE = /^[A-Za-z0-9-]{16,64}$/;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });

  let body: { kind?: unknown; id?: unknown; sessionKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const { kind, id, sessionKey } = body;
  if (
    kind !== "app" ||
    typeof id !== "string" ||
    typeof sessionKey !== "string" ||
    !SESSION_KEY_RE.test(sessionKey)
  ) {
    return new Response(null, { status: 400 });
  }

  const existing = await prisma.appUsageSession.findUnique({
    where: { sessionKey },
  });

  if (!existing) {
    // First heartbeat of a session — verify the app exists before creating.
    const app = await prisma.portalApp.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!app) return new Response(null, { status: 204 });
    await prisma.appUsageSession.create({
      data: { sessionKey, userId: session.user.id, kind, targetId: id },
    });
    return new Response(null, { status: 204 });
  }

  // A session key belongs to the user who created it.
  if (existing.userId !== session.user.id) {
    return new Response(null, { status: 204 });
  }

  const now = new Date();
  const deltaSeconds = Math.min(
    Math.max(0, Math.round((now.getTime() - existing.lastSeenAt.getTime()) / 1000)),
    MAX_DELTA_SECONDS,
  );

  await prisma.appUsageSession.update({
    where: { sessionKey },
    data: {
      lastSeenAt: now,
      activeSeconds: { increment: deltaSeconds },
    },
  });

  return new Response(null, { status: 204 });
}
