import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { landingPath } from "@/lib/roles";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect(landingPath(session.user.role));
  redirect("/login");
}
