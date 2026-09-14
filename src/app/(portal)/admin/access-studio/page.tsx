import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import AccessStudio from "./AccessStudio";

// Select people and groups to apply immediate software grants.
export default async function AccessStudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Admin-only feature.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [apps, departments, users, tags] = await Promise.all([
    // Include disabled apps — they're managed here too (shown dimmed).
    prisma.portalApp.findMany({
      include: {
        departments: { select: { id: true } },
        grants: { select: { userId: true } },
        tags: { select: { id: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        source: true,
        externalId: true,
        description: true,
        users: { select: { id: true } },
        _count: { select: { users: true } },
      },
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
    // Navigation tags for the app editor's tag picker (admin-assigned here).
    prisma.tag.findMany({
      select: { id: true, name: true, displayName: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        label="Management"
        title="Access Studio"
        subtitle="Select people or groups, choose software, and grant access immediately."
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
          tagIds: a.tags.map((t) => t.id),
        }))}
        tags={tags}
        departments={departments.map((d) => ({
          id: d.id,
          name:
            d.source === "microsoft"
              ? d.name.split(" (Microsoft 365")[0]
              : d.name,
          source: d.source,
          description: d.description,
          userIds: d.users.map((u) => u.id),
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
