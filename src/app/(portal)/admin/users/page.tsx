import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import UserManager from "./UserManager";
import PageHeader from "@/components/PageHeader";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasMinRole(session.user.role, "ADMIN")) redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true, // legacy single-department string
      departments: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        label="Management"
        title="Manage Users"
        subtitle="View portal users, assign roles, and manage department membership."
      />
      <UserManager
        initialUsers={users}
        allDepartments={departments}
        currentUserId={session.user.id}
      />
    </div>
  );
}
