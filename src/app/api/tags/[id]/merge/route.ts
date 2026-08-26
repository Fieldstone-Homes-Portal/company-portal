import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

// POST — merge this tag INTO another: every app carrying the source tag
// gains the target tag, then the source tag is deleted. Admin-only.
// Body: { intoId: string }
export async function POST(req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await req.json();
  const intoId = typeof body.intoId === "string" ? body.intoId : "";
  if (!intoId || intoId === id) {
    return NextResponse.json(
      { error: "Pick a different tag to merge into." },
      { status: 400 },
    );
  }

  const [source, target] = await Promise.all([
    prisma.tag.findUnique({
      where: { id },
      include: { apps: { select: { id: true } } },
    }),
    prisma.tag.findUnique({ where: { id: intoId } }),
  ]);
  if (!source || !target) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.tag.update({
      where: { id: intoId },
      data: {
        apps: { connect: source.apps.map((a) => ({ id: a.id })) },
      },
    }),
    prisma.tag.delete({ where: { id } }),
  ]);

  const merged = await prisma.tag.findUnique({
    where: { id: intoId },
    include: { _count: { select: { apps: true } } },
  });
  return NextResponse.json(merged);
}
