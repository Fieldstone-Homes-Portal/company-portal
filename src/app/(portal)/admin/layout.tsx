import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // Everything under /admin is admin-only.
  if (session.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
