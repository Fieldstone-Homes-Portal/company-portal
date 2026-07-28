import { auth } from "@/lib/auth";
import { getAnalytics, type WindowDays } from "@/lib/analytics";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AnalyticsView from "./AnalyticsView";

export const dynamic = "force-dynamic";

const WINDOWS: { days: WindowDays; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

interface Props {
  searchParams: Promise<{ window?: string }>;
}

// Server shell: auth + window selection + headline chrome. The tiles,
// charts, and lists live in AnalyticsView (client) so each one can drill
// down into a detail modal fed by /api/analytics/drilldown.
export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Admin-only feature.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { window: windowParam } = await searchParams;
  const windowDays: WindowDays =
    windowParam === "7" ? 7 : windowParam === "90" ? 90 : 30;

  const data = await getAnalytics(windowDays);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        label="Management"
        title="Analytics"
        subtitle="Which apps get opened, by how many people, and where time is spent."
      />

      {/* Window selector + data-since note */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-fs-warm-gray">
          {WINDOWS.map((w) => (
            <Link
              key={w.days}
              href={`/admin/analytics?window=${w.days}`}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                w.days === windowDays
                  ? "bg-fs-espresso text-white"
                  : "text-fs-copper hover:bg-fs-warm-white hover:text-fs-espresso"
              }`}
            >
              {w.label}
            </Link>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-fs-copper-light">
          <Info size={13} />
          {data.dataSince ? (
            <>
              Data since{" "}
              {data.dataSince.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "America/Denver",
              })}{" "}
              — earlier opens weren&apos;t recorded.
            </>
          ) : (
            "No usage recorded yet — collection starts with this deploy."
          )}
        </p>
      </div>

      <AnalyticsView
        windowDays={windowDays}
        totals={data.totals}
        topItems={data.topItems.slice(0, 15)}
        daily={data.daily}
        leastUsed={data.leastUsed.slice(0, 8)}
      />
    </div>
  );
}
