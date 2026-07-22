import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const departmentIds: string[] = Array.isArray(body.departmentIds)
    ? body.departmentIds
    : [];

  const app = await prisma.portalApp.create({
    data: {
      name: body.name,
      description: body.description || null,
      icon: body.icon || null,
      url: body.url,
      minRole: body.minRole || "EMPLOYEE",
      category: body.category || "general",
      section: body.section || "tool",
      sortOrder: body.sortOrder || 0,
      openIn: body.openIn || "iframe",
      stage: body.stage || "DEPLOYED",
      departments: departmentIds.length
        ? { connect: departmentIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { departments: { select: { id: true, name: true } } },
  });

  // Auto-seed a "What's New" entry so new apps announce themselves on the
  // Home page. Best-effort: a failure here must never break app creation.
  try {
    await prisma.releaseNote.create({
      data: {
        appId: app.id,
        title: `New app: ${app.name}`,
        body: app.description || null,
        kind: "new-app",
        createdBy: session.user.email || null,
      },
    });
  } catch (err) {
    console.error("Failed to seed release note for new app", app.id, err);
  }

  return NextResponse.json(app);
}
