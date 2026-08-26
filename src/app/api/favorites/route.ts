import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessApp } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

// POST — toggle the current user's favorite star on an app.
// Body: { appId: string }  →  { favorited: boolean }
//
// Favorites are the ONE piece of tagging users control themselves. Like
// track-open, the target is validated server-side: you can only favorite an
// active app you can access, so the Favorites pseudo-tag can never become a
// side channel to apps outside your access set.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { appId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const appId = body.appId;
  if (typeof appId !== "string" || !appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  const app = await prisma.portalApp.findUnique({
    where: { id: appId },
    include: {
      departments: { select: { id: true, name: true } },
      grants: { select: { userId: true } },
    },
  });
  if (!app || !app.isActive || !canAccessApp(session.user, app)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const where = {
    userId_appId: { userId: session.user.id, appId },
  };
  const existing = await prisma.favorite.findUnique({ where });
  if (existing) {
    await prisma.favorite.delete({ where });
    return NextResponse.json({ favorited: false });
  }
  await prisma.favorite.create({
    data: { userId: session.user.id, appId },
  });
  return NextResponse.json({ favorited: true });
}
