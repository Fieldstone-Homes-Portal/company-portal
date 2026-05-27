import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default async function DashboardsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Fieldstone Homes"
        title="Dashboards"
        subtitle="Live business intelligence and analytics, surfaced where you work."
      />

      <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-fs-warm-gray">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-fs-warm-white">
          <BarChart3 size={32} className="text-fs-copper" />
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-fs-copper">
          Coming Soon
        </p>
        <h2 className="font-display text-2xl font-bold text-fs-espresso">
          Data Dashboards
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-fs-copper">
          We&apos;re building a home for live sales, construction, and
          operations dashboards so you can see what&apos;s happening across
          Fieldstone without leaving Cornerstone. Check back soon.
        </p>
      </div>
    </div>
  );
}
