import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

// PUT — rename / update description. Admin-only.
export async function PUT(req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const body = await req.json();
  const dept = await prisma.department.update({
    where: { id },
    data: {
      name: body.name?.trim(),
      description: body.description?.trim() || null,
    },
  });
  return NextResponse.json(dept);
}

// DELETE — remove a department. Admin-only. Prisma cascade-deletes the
// join-table rows automatically, so users/apps lose this dept but aren't
// otherwise affected.
export async function DELETE(_req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
