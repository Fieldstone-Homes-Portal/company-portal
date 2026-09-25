import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canUseRequestCenter } from "@/lib/requestCenterAccess";

// Preserve old bookmarks (including the retired /admin/request-center era)
// without exposing the request form beyond the limited-launch allowlist.
export default async function RequestsRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canUseRequestCenter(session.user)) redirect("/home");
  redirect("/request-center");
}
