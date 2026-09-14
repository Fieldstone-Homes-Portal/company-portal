import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { graphPages } from "@/lib/accessGroups";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    if (body.action === "sync") {
      const groups = await graphPages<{
        id: string;
        displayName: string;
        mail?: string;
      }>(
        "/groups?$select=id,displayName,mail&$filter=groupTypes/any(c:c%20eq%20%27Unified%27)",
      );
      // Complete the remote read before any local mutations; retain grants if Graph fails.
      await prisma.$transaction(
        groups.map((g) =>
          prisma.department.upsert({
            where: { externalId: g.id },
            create: {
              name: `${g.displayName} (Microsoft 365 · ${g.id})`,
              source: "microsoft",
              description: g.mail ?? null,
              externalId: g.id,
            },
            update: { name: `${g.displayName} (Microsoft 365 · ${g.id})`, description: g.mail ?? null },
          }),
        ),
      );
      return NextResponse.json({ count: groups.length });
    }
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 120 ||
      !Array.isArray(body.userIds) ||
      body.userIds.some((id: unknown) => typeof id !== "string")
    )
      return NextResponse.json(
        { error: "A name and valid members are required" },
        { status: 400 },
      );
    const existing = body.id
      ? await prisma.department.findUnique({ where: { id: body.id } })
      : null;
    if (body.id && (!existing || existing.source !== "custom"))
      return NextResponse.json(
        { error: "Only custom groups can be edited here" },
        { status: 400 },
      );
    const data = {
      name: body.name.trim(),
      users: {
        set: [...new Set(body.userIds as string[])].map((id) => ({ id })),
      },
    };
    const group = body.id
      ? await prisma.department.update({ where: { id: body.id }, data })
      : await prisma.department.create({
          data: { name: data.name, users: { connect: data.users.set } },
        });
    return NextResponse.json({ id: group.id });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to save groups. Check the name, members, and Microsoft Graph connection.",
      },
      { status: 400 },
    );
  }
}
