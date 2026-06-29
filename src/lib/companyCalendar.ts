/**
 * Company calendar for the Home page. Merges three sources:
 *   1. All Staff Group calendar meetings with >= 10 attendees (live, Graph)
 *   2. Company holidays + first-Friday closures (computed, holidays.ts)
 *   3. Work anniversaries for the month (static, anniversaries.ts)
 *
 * Only the All Staff *group* calendar is read (no personal mailboxes), so a
 * meeting invited to individuals rather than allstaff@ (e.g. Claude
 * Collaboration) won't appear. Group calendar reads use the existing
 * Group.Read.All app credentials. Meeting fetches degrade to [] on any error
 * so holidays + anniversaries always render.
 */
import { graphGet, groupId } from "./graphClient";
import { holidaysInMonth, holidaysBetween } from "./holidays";
import { anniversariesForMonth, type AnniversaryMilestone } from "./anniversaries";

export interface CalEvent {
  date: string; // YYYY-MM-DD, Mountain time
  title: string;
  kind: "meeting" | "holiday" | "office-closed";
  time?: string; // "4:30 PM" for timed meetings
  meta?: string; // e.g. "45 attending"
}

export interface MonthData {
  year: number;
  month: number; // 1-12
  monthName: string;
  events: CalEvent[];
  anniversaries: AnniversaryMilestone[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return ymd(new Date(Date.UTC(y, m - 1, d + n)));
}
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatTime(dateTime: string): string | undefined {
  const t = dateTime.slice(11, 16); // "HH:MM"
  const [hStr, m] = t.split(":");
  let h = Number(hStr);
  if (Number.isNaN(h)) return undefined;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

interface GraphCalEvent {
  subject?: string;
  isAllDay?: boolean;
  start?: { dateTime?: string };
  attendees?: unknown[];
}

const meetingCache = new Map<string, { data: CalEvent[]; exp: number }>();

/**
 * All Staff group-calendar meetings with >= `minAttendees`, whose Mountain-time
 * date falls in [startYmd, endYmd]. Returns [] on any Graph error.
 */
export async function getGroupMeetings(
  startYmd: string,
  endYmd: string,
  minAttendees = 10,
): Promise<CalEvent[]> {
  const key = `${startYmd}|${endYmd}|${minAttendees}`;
  const ttl = parseInt(process.env.CALENDAR_CACHE_TTL ?? "600", 10);
  const now = Date.now() / 1000;
  const hit = meetingCache.get(key);
  if (hit && now < hit.exp) return hit.data;

  let events: CalEvent[] = [];
  try {
    const gid = await groupId();
    // Pad the query window so events near the Mountain-time month edges aren't
    // dropped by the UTC window; filter precisely by local date afterward.
    const data = await graphGet<{ value: GraphCalEvent[] }>(
      `/groups/${gid}/calendarView`,
      {
        startDateTime: `${addDays(startYmd, -1)}T00:00:00Z`,
        endDateTime: `${addDays(endYmd, 2)}T00:00:00Z`,
        $select: "subject,start,end,attendees,isAllDay",
        $top: "100",
      },
      { Prefer: 'outlook.timezone="America/Denver"' },
    );
    events = (data.value ?? [])
      .map((ev): CalEvent | null => {
        const dt = ev.start?.dateTime;
        if (!dt) return null;
        const date = dt.slice(0, 10);
        const attending = Array.isArray(ev.attendees) ? ev.attendees.length : 0;
        if (attending < minAttendees) return null;
        if (date < startYmd || date > endYmd) return null;
        return {
          date,
          title: (ev.subject || "(untitled)").trim(),
          kind: "meeting",
          time: ev.isAllDay ? undefined : formatTime(dt),
          meta: `${attending} attending`,
        };
      })
      .filter((e): e is CalEvent => e !== null);
  } catch {
    events = [];
  }

  meetingCache.set(key, { data: events, exp: now + ttl });
  return events;
}

function sortEvents(a: CalEvent, b: CalEvent): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  // All-day / holidays (no time) sort before timed meetings.
  if (!a.time && b.time) return -1;
  if (a.time && !b.time) return 1;
  return (a.time ?? "").localeCompare(b.time ?? "");
}

/** Everything for one month: dated events (meetings + holidays) + anniversaries. */
export async function getCalendarMonth(year: number, month: number): Promise<MonthData> {
  const startYmd = `${year}-${pad(month)}-01`;
  const endYmd = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`;
  const meetings = await getGroupMeetings(startYmd, endYmd);
  const holidays: CalEvent[] = holidaysInMonth(year, month).map((h) => ({
    date: h.date,
    title: h.observed ? `${h.name} (observed)` : h.name,
    kind: h.kind,
  }));
  return {
    year,
    month,
    monthName: MONTHS[month - 1],
    events: [...meetings, ...holidays].sort(sortEvents),
    anniversaries: anniversariesForMonth(month, year),
  };
}

/** Next dated items (meetings + holidays) from `fromYmd`, soonest first. */
export async function getUpcoming(fromYmd: string, days = 45, limit = 6): Promise<CalEvent[]> {
  const endYmd = addDays(fromYmd, days);
  const meetings = await getGroupMeetings(fromYmd, endYmd);
  const holidays: CalEvent[] = holidaysBetween(fromYmd, endYmd).map((h) => ({
    date: h.date,
    title: h.observed ? `${h.name} (observed)` : h.name,
    kind: h.kind,
  }));
  return [...meetings, ...holidays].sort(sortEvents).slice(0, limit);
}
