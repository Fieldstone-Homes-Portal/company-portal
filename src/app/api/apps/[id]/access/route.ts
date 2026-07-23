import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * Replace an app's entire access policy in one atomic write. Access Studio
 * PUTs the full policy on every drag/drop/remove — full replacement keeps
 * undo trivial (undo = re-PUT the previous policy).
 *
 * Body: { allStaff: boolean, deptIds: string[], userIds: string[] }
 */
export async function PUT(req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();

  const allStaff = body.allStaff === true;
  const deptIds: string[] = Array.isArray(body.deptIds)
    ? body.deptIds.filter((d: unknown) => typeof d === "string")
    : [];
  const userIds: string[] = [
    ...new Set(
      Array.isArray(body.userIds)
        ? (body.userIds.filter((u: unknown) => typeof u === "string") as string[])
        : [],
    ),
  ];

  const grantedBy = session.user.email || null;

  try {
    const [, , , app] = await prisma.$transaction([
      prisma.portalApp.update({
        where: { id },
        data: {
          allStaff,
          departments: { set: deptIds.map((did) => ({ id: did })) },
        },
      }),
      // Individual grants: replace the set wholesale. createdAt/grantedBy
      // are fresh for re-added rows — acceptable for this audit breadcrumb.
      prisma.appGrant.deleteMany({
        where: { appId: id, userId: { notIn: userIds } },
      }),
      prisma.appGrant.createMany({
        data: userIds.map((uid) => ({ appId: id, userId: uid, grantedBy })),
        skipDuplicates: true,
      }),
      prisma.portalApp.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          allStaff: true,
          departments: { select: { id: true } },
          grants: { select: { userId: true } },
        },
      }),
    ]);

    return NextResponse.json({
      id: app.id,
      allStaff: app.allStaff,
      deptIds: app.departments.map((d) => d.id),
      userIds: app.grants.map((g) => g.userId),
    });
  } catch {
    // Unknown app id, or a dept/user id that no longer exists.
    return NextResponse.json({ error: "Invalid app, department, or user" }, { status: 400 });
  }
}
