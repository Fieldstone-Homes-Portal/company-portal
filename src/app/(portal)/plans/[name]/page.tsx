import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlanDetail from "./PlanDetail";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name } = await params;
  const planName = decodeURIComponent(name);

  return (
    <div className="mx-auto max-w-7xl">
      <PlanDetail planName={planName} />
    </div>
  );
}
