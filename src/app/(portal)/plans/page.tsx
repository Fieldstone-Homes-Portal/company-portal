import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PlanSearch from "./PlanSearch";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        label="Plan Intelligence"
        title="Search Plans"
        subtitle="Search, evaluate, and compare home plans from Smartsheet data"
      />
      <PlanSearch />
    </div>
  );
}
