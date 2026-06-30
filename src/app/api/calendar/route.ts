import { auth } from "@/lib/auth";
import { getCalendarMonth } from "@/lib/companyCalendar";

/**
 * Month data for the Home page calendar's prev/next navigation.
 * GET /api/calendar?month=YYYY-MM → { year, month, monthName, events, anniversaries }
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response(null, { status: 401 });
  // The Home calendar is admin-only for now; keep its data endpoint in step.
  if (session.user.role !== "ADMIN") return new Response(null, { status: 403 });

  const month = new URL(request.url).searchParams.get("month") ?? "";
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return Response.json({ error: "month must be YYYY-MM" }, { status: 400 });
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return Response.json({ error: "invalid month" }, { status: 400 });

  return Response.json(await getCalendarMonth(year, mon));
}
