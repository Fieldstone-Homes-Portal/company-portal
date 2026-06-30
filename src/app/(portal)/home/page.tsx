import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import RecentlyOpenedSection from "@/components/home/RecentlyOpenedSection";
import AllStaffSection from "@/components/home/AllStaffSection";
import UpcomingSection from "@/components/home/UpcomingSection";
import CalendarSection from "@/components/home/CalendarSection";
import { getRecentOpens } from "@/lib/recentOpens";
import { getLatestAllStaff, type AllStaffEmail } from "@/lib/allStaff";
import { getUpcoming, getCalendarMonth } from "@/lib/companyCalendar";

const pad = (n: number) => String(n).padStart(2, "0");

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Admin-only for now (soft launch). Everyone else lands on the Toolbox.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const denverNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Denver" }),
  );
  const hour = denverNow.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] || "there";
  const year = denverNow.getFullYear();
  const month = denverNow.getMonth() + 1;
  const todayYmd = `${year}-${pad(month)}-${pad(denverNow.getDate())}`;

  // All four sections load in parallel. All Staff and the calendar both hit
  // Microsoft Graph (cached); the calendar helpers swallow Graph errors and
  // still return holidays + anniversaries, so the page never breaks.
  const [recents, allStaff, upcoming, monthData] = await Promise.all([
    getRecentOpens(session.user, 3),
    getLatestAllStaff(3)
      .then((emails) => ({ emails, error: null as string | null }))
      .catch((e) => ({
        emails: [] as AllStaffEmail[],
        error: e instanceof Error ? e.message : "Unknown error",
      })),
    getUpcoming(todayYmd, 45),
    getCalendarMonth(year, month),
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
        <UpcomingSection items={upcoming} />
        <CalendarSection initial={monthData} />
      </div>
    </div>
  );
}
