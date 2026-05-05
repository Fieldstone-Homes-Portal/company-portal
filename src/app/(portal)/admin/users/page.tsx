import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import UserManager from "./UserManager";
import PageHeader from "@/components/PageHeader";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasMinRole(session.user.role, "MANAGER")) redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Management"
        title="Manage Users"
        subtitle="View portal users and assign roles"
      />
      <UserManager initialUsers={users} currentUserId={session.user.id} />
    </div>
  );
}
