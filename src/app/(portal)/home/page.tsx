import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import RecentlyOpenedSection from "@/components/home/RecentlyOpenedSection";
import AllStaffSection from "@/components/home/AllStaffSection";
import { getRecentOpens } from "@/lib/recentOpens";
import { getLatestAllStaff, type AllStaffEmail } from "@/lib/allStaff";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Denver" }),
  ).getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] || "there";

  // Fetch both sections in parallel. The All Staff feed hits Microsoft Graph
  // (cached in-memory), so degrade gracefully if it's misconfigured/unreachable
  // — the rest of the page should still render.
  const [recents, allStaff] = await Promise.all([
    getRecentOpens(session.user, 3),
    getLatestAllStaff(3)
      .then((emails) => ({ emails, error: null as string | null }))
      .catch((e) => ({
        emails: [] as AllStaffEmail[],
        error: e instanceof Error ? e.message : "Unknown error",
      })),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        label="Cornerstone"
        title={`${greeting}, ${firstName}`}
        subtitle="Welcome back — here's where you left off and what's new."
      />

      <div className="space-y-10">
        <RecentlyOpenedSection items={recents} />
        <AllStaffSection emails={allStaff.emails} error={allStaff.error} />
      </div>
    </div>
  );
}
