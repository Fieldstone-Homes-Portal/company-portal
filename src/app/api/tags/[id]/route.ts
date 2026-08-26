import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { slugifyTag } from "@/lib/toolbox";
import { NextRequest, NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

// PUT — rename a tag (displayName and/or slug) or change its sort order.
// Admin-only. Renaming keeps all app assignments — the slug is just the
// stable filter key, and even that can change safely because filter state
// lives only in client memory, never in stored data.
export async function PUT(req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await req.json();

  const data: { displayName?: string; name?: string; sortOrder?: number } = {};
  if (typeof body.displayName === "string" && body.displayName.trim()) {
    data.displayName = body.displayName.trim();
  }
  if (typeof body.name === "string") {
    const slug = slugifyTag(body.name);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    data.name = slug;
  }
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

  try {
    const tag = await prisma.tag.update({
      where: { id },
      data,
      include: { _count: { select: { apps: true } } },
    });
    return NextResponse.json(tag);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Another tag already uses that slug." },
        { status: 409 },
      );
    }
    throw err;
  }
}

// DELETE — remove a tag everywhere. The implicit join rows go with it;
// apps themselves are untouched (tags are navigation only).
export async function DELETE(_req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
