import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import AnalyticsDashboard from "./AnalyticsDashboard";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <PageHeader
        label="Sales & Marketing"
        title="Analytics Dashboard"
        subtitle="Real-time performance metrics across sales, marketing, communities, and pipeline"
      />
      <AnalyticsDashboard />
    </>
  );
}
