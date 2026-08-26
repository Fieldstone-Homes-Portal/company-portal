import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { slugifyTag } from "@/lib/toolbox";
import { NextRequest, NextResponse } from "next/server";

// GET — list all tags with usage counts. Any signed-in user can read (the
// admin UI and tag pickers both consume this). Counts here are raw app
// counts for management purposes — user-facing counts on the Toolbox are
// always computed from the viewer's accessible set instead.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { apps: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(tags);
}

// POST — create a tag. Admin-only: tags are publisher-managed.
// Body: { displayName: string, name?: string (slug — derived if omitted) }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const displayName = (body.displayName || "").trim();
  const name = slugifyTag(body.name || displayName);
  if (!displayName || !name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    const tag = await prisma.tag.create({
      data: {
        name,
        displayName,
        sortOrder: Number(body.sortOrder) || 0,
      },
      include: { _count: { select: { apps: true } } },
    });
    return NextResponse.json(tag);
  } catch (err) {
    // Unique constraint on the slug
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: `A tag with the slug "${name}" already exists.` },
        { status: 409 },
      );
    }
    throw err;
  }
}
