import { auth } from "@/lib/auth";
import { hasMinRole } from "@/lib/roles";
import {
  getItemDrilldown,
  getDayDrilldown,
  getUserTotals,
  type WindowDays,
} from "@/lib/analytics";
import { NextRequest, NextResponse } from "next/server";

/**
 * Drill-down data for the /admin/analytics modal. ADMIN-only — guarded
 * exactly like the analytics page itself.
 *
 * GET /api/analytics/drilldown?view=item&kind=app&id=…&window=30
 *   → who opened this app/link in the window + its per-day opens
 * GET /api/analytics/drilldown?view=day&date=YYYY-MM-DD
 *   → that Mountain-time day's apps + active users
 * GET /api/analytics/drilldown?view=users&window=30
 *   → per-user totals for the window
 *
 * Same privacy stance as the rest of analytics: app-level only. This
 * surfaces who opened which app, when, and embed time — never anything a
 * user did inside an app.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const view = params.get("view");
  const windowParam = params.get("window");
  const windowDays: WindowDays =
    windowParam === "7" ? 7 : windowParam === "90" ? 90 : 30;

  if (view === "item") {
    const kind = params.get("kind");
    const id = params.get("id");
    if ((kind !== "app" && kind !== "link") || !id) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const data = await getItemDrilldown(kind, id, windowDays);
    if (!data) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  if (view === "day") {
    const date = params.get("date");
    // Same YYYY-MM-DD keys the daily chart's Mountain-time buckets use.
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    return NextResponse.json(await getDayDrilldown(date));
  }

  if (view === "users") {
    return NextResponse.json(await getUserTotals(windowDays));
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
