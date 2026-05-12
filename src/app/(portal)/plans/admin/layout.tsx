import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PlansAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user?.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
