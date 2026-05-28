import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();

  // Pull departmentIds out before spreading the rest. The relation needs a
  // different Prisma write shape ({ set: [...] }) than scalar fields.
  const { departmentIds, ...scalarUpdates } = body as Record<string, unknown>;
  // Strip out fields that aren't valid Prisma columns (defensive against
  // stray client-side fields like `departments` arriving via PUT).
  delete (scalarUpdates as Record<string, unknown>).departments;

  const app = await prisma.portalApp.update({
    where: { id },
    data: {
      ...scalarUpdates,
      ...(Array.isArray(departmentIds)
        ? {
            departments: {
              set: (departmentIds as string[]).map((did) => ({ id: did })),
            },
          }
        : {}),
    },
    include: { departments: { select: { id: true, name: true } } },
  });

  return NextResponse.json(app);
}

export async function DELETE(_req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  await prisma.portalApp.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
