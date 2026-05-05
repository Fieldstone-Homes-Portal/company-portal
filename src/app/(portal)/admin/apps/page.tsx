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

  const apps = await prisma.portalApp.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Management"
        title="Manage Apps"
        subtitle="Add, edit, or remove apps from the portal"
      />
      <AppManager initialApps={apps} />
    </div>
  );
}
