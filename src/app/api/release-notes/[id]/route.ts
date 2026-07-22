import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

// PUT — edit a release note (title/body/app link/publish date). Manager-level.
export async function PUT(req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
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

  const note = await prisma.releaseNote.update({
    where: { id },
    data: {
      title,
      body: body.body?.trim() || null,
      appId: body.appId || null,
      ...(publishedAt ? { publishedAt } : {}),
    },
    include: { app: { select: { id: true, name: true } } },
  });

  return NextResponse.json(note);
}

// DELETE — remove a release note. Manager-level.
export async function DELETE(_req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  await prisma.releaseNote.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
