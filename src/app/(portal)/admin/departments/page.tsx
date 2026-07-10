import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import DepartmentManager from "./DepartmentManager";

export default async function AdminDepartmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Only ADMINs can manage departments — they affect access for everyone.
  if (!hasMinRole(session.user.role, "ADMIN")) redirect("/dashboard");

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, apps: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        label="Administration"
        title="Departments"
        subtitle="Departments group employees and gate access to apps. Members of a department can access apps restricted to that department; only admins bypass department gates."
      />
      <DepartmentManager initialDepartments={departments} />
    </div>
  );
}
