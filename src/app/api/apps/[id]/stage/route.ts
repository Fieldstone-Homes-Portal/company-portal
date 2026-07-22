import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppStage } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

// PATCH /api/apps/[id]/stage — move an app along the lifecycle pipeline.
//
// Deliberately updates ONLY `stage`, nothing else. This is what the pipeline
// control in Access Studio calls: unlike the studio's sandboxed access
// grants, stage changes persist immediately (stage is informational — it
// never changes who can access what, so saving it live is safe).
// Admin-only, matching Access Studio itself.
export async function PATCH(req: NextRequest, context: Context) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const stage = body?.stage as AppStage;
  if (!Object.values(AppStage).includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const app = await prisma.portalApp.update({
    where: { id },
    data: { stage },
    select: { id: true, stage: true },
  });

  return NextResponse.json(app);
}
