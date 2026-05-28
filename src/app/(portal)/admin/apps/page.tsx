import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/roles";
import AppManager from "./AppManager";
import PageHeader from "@/components/PageHeader";

export default async function AdminAppsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasMinRole(session.user.role, "MANAGER")) redirect("/dashboard");

  // Load apps with their current department assignments so the form can
  // pre-fill the multi-select when editing.
  const apps = await prisma.portalApp.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    include: { departments: { select: { id: true, name: true } } },
  });

  // Departments power the multi-select dropdown. Even managers can read
  // these (they don't manage them, just assign them).
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Management"
        title="Manage Apps"
        subtitle="Add, edit, or remove apps from the portal"
      />
      <AppManager initialApps={apps} allDepartments={departments} />
    </div>
  );
}
