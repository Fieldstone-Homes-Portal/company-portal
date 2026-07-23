import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import AccessStudio from "./AccessStudio";

// Access Studio — THE management surface for portal apps and access.
// Drag departments and people onto apps to grant access, click chips to
// revoke, edit app details on each card, and manage a person's role and
// departments from their profile. Every change saves immediately (with
// undo). Departments themselves are created under /admin/departments.
export default async function AccessStudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Admin-only feature.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [apps, departments, users] = await Promise.all([
    // Include disabled apps — they're managed here too (shown dimmed).
    prisma.portalApp.findMany({
      include: {
        departments: { select: { id: true } },
        grants: { select: { userId: true } },
      },
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
        createdAt: true,
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
        subtitle="Apps, access, and people — drag departments and people onto apps to grant access."
      />

      <AccessStudio
        apps={apps.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          url: a.url,
          category: a.category,
          section: a.section,
          sortOrder: a.sortOrder,
          isActive: a.isActive,
          openIn: a.openIn,
          stage: a.stage,
          allStaff: a.allStaff,
          deptIds: a.departments.map((d) => d.id),
          userIds: a.grants.map((g) => g.userId),
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
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
