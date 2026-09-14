import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Preserve old bookmarks without exposing the request form to employees.
export default async function RequestsRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/home");
  redirect("/admin/request-center");
}
