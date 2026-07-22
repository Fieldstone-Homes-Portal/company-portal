import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();

  // Whitelist scalar fields users can be updated with.
  const allowedFields: Record<string, unknown> = {};
  if (body.role && ["EMPLOYEE", "MANAGER", "ADMIN"].includes(body.role)) {
    allowedFields.role = body.role;
  }
  // Legacy single-department text — kept writable for backward compat,
  // but new code should use departmentIds (many-to-many) below.
  if (body.department !== undefined) {
    allowedFields.department = body.department;
  }

  // Many-to-many department assignment. `set` replaces the entire list.
  const departmentIds: string[] | undefined = Array.isArray(body.departmentIds)
    ? body.departmentIds
    : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...allowedFields,
      ...(departmentIds
        ? {
            departments: {
              set: departmentIds.map((did) => ({ id: did })),
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      departments: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(user);
}
