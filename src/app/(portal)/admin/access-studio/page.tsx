import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AccessStudio from "./AccessStudio";

// Access Studio — PROTOTYPE of the drag-and-drop access manager.
// Reads real apps/departments/users so it feels true to life, but every
// grant lives in client-side state only. Nothing on this page writes to
// the database; real access rules are untouched.
export default async function AccessStudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Admin-only feature.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [apps, departments, users] = await Promise.all([
    prisma.portalApp.findMany({
      where: { isActive: true },
      include: { departments: { select: { id: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({
      select: { id: true, name: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departments: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        label="Management"
        title="Access Studio"
        subtitle="Drag departments and people onto apps to grant access."
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-fs-copper/10 p-4 text-sm text-fs-espresso ring-1 ring-fs-copper/30">
        <FlaskConical size={18} className="mt-0.5 shrink-0 text-fs-copper" />
        <p>
          <span className="font-semibold">Prototype sandbox.</span> Everything
          here starts from today&apos;s real apps, departments, and people, but
          access changes live only on this page — nothing is saved, and{" "}
          <span className="font-semibold">
            real access is never affected
          </span>
          . Reload to start over. One exception:{" "}
          <span className="font-semibold">
            the lifecycle stage pipeline on each app card saves immediately
          </span>{" "}
          (stage is informational only — it never changes who has access).
        </p>
      </div>

      <AccessStudio
        apps={apps.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          section: a.section,
          minRole: a.minRole,
          stage: a.stage,
          deptIds: a.departments.map((d) => d.id),
        }))}
        departments={departments.map((d) => ({
          id: d.id,
          name: d.name,
          memberCount: d._count.users,
        }))}
        people={users.map((u) => ({
          id: u.id,
          name: u.name || u.email.split("@")[0],
          email: u.email,
          role: u.role,
          deptIds: u.departments.map((d) => d.id),
        }))}
      />
    </div>
  );
}
