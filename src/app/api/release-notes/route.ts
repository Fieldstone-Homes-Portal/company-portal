import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

// GET — list ALL release notes (including future-dated ones) for the admin
// manager UI. The user-facing feed doesn't use this route (it reads via
// lib/releaseNotes on the server).
// SOFT LAUNCH: ADMIN-only for now; loosen to MANAGER (matching Manage Apps)
// when the feature opens up.
export async function GET() {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const notes = await prisma.releaseNote.findMany({
    orderBy: { publishedAt: "desc" },
    include: { app: { select: { id: true, name: true } } },
  });
  return NextResponse.json(notes);
}

// POST — create a manual release note. SOFT LAUNCH: ADMIN-only for now.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const title = (body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const publishedAt = body.publishedAt ? new Date(body.publishedAt) : undefined;
  if (publishedAt && isNaN(publishedAt.getTime())) {
    return NextResponse.json(
      { error: "Invalid publish date" },
      { status: 400 },
    );
  }

  const note = await prisma.releaseNote.create({
    data: {
      title,
      body: body.body?.trim() || null,
      appId: body.appId || null,
      kind: "update",
      ...(publishedAt ? { publishedAt } : {}),
      createdBy: session.user.email || null,
    },
    include: { app: { select: { id: true, name: true } } },
  });

  return NextResponse.json(note);
}
