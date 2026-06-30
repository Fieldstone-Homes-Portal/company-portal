/**
 * Fieldstone company holidays + the "first Friday off" perk, computed per year
 * from the rules in the Employee Handbook (May 2026), so the calendar stays
 * correct every year with no manual upkeep.
 *
 * Office holidays: New Year's, MLK, Presidents', Memorial, Independence,
 * Pioneer Day (Jul 24, Utah), Labor, Thanksgiving + the day after, Christmas
 * Eve, Christmas. Weekend holidays are observed on the nearest weekday. The
 * office is also closed the first Friday of every month except Jan, Jul, Dec.
 * (Sales offices observe a shorter list — not modeled here.)
 */

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  kind: "holiday" | "office-closed";
  observed?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const dow = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

function nthWeekday(y: number, m: number, weekday: number, n: number): number {
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
}

function lastWeekday(y: number, m: number, weekday: number): number {
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(y, m - 1, daysInMonth)).getUTCDay();
  return daysInMonth - ((lastDow - weekday + 7) % 7);
}

/** Shift a fixed-date holiday off the weekend: Sat → Fri, Sun → Mon. */
function observe(y: number, m: number, d: number): { ymd: string; observed: boolean } {
  const wd = dow(y, m, d);
  if (wd === 6) {
    const dt = new Date(Date.UTC(y, m - 1, d - 1));
    return { ymd: ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()), observed: true };
  }
  if (wd === 0) {
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    return { ymd: ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()), observed: true };
  }
  return { ymd: ymd(y, m, d), observed: false };
}

/** All company holidays + first-Friday closures for a calendar year. */
export function holidaysForYear(year: number): Holiday[] {
  const out: Holiday[] = [];
  const fixed = (m: number, d: number, name: string) => {
    const o = observe(year, m, d);
    out.push({ date: o.ymd, name, kind: "holiday", observed: o.observed });
  };
  const floating = (m: number, day: number, name: string) =>
    out.push({ date: ymd(year, m, day), name, kind: "holiday" });

  fixed(1, 1, "New Year's Day");
  floating(1, nthWeekday(year, 1, 1, 3), "Martin Luther King Jr. Day");
  floating(2, nthWeekday(year, 2, 1, 3), "Presidents' Day");
  floating(5, lastWeekday(year, 5, 1), "Memorial Day");
  fixed(7, 4, "Independence Day");
  fixed(7, 24, "Pioneer Day");
  floating(9, nthWeekday(year, 9, 1, 1), "Labor Day");
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  floating(11, thanksgiving, "Thanksgiving Day");
  floating(11, thanksgiving + 1, "Day after Thanksgiving");
  fixed(12, 24, "Christmas Eve");
  fixed(12, 25, "Christmas Day");

  // First Friday of each month except Jan, Jul, Dec. If it lands on a holiday,
  // the closure moves to the next Friday.
  const holidayDates = new Set(out.map((h) => h.date));
  for (let m = 1; m <= 12; m++) {
    if (m === 1 || m === 7 || m === 12) continue;
    let day = nthWeekday(year, m, 5, 1); // 5 = Friday
    if (holidayDates.has(ymd(year, m, day))) day += 7;
    out.push({ date: ymd(year, m, day), name: "Office closed (first Friday)", kind: "office-closed" });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Holidays whose (observed) date falls in the given month. */
export function holidaysInMonth(year: number, month: number): Holiday[] {
  return holidaysForYear(year).filter((h) => Number(h.date.slice(5, 7)) === month);
}

/** Holidays with date in [startYmd, endYmd] inclusive (spans year boundaries). */
export function holidaysBetween(startYmd: string, endYmd: string): Holiday[] {
  const y0 = Number(startYmd.slice(0, 4));
  const y1 = Number(endYmd.slice(0, 4));
  const all: Holiday[] = [];
  for (let y = y0; y <= y1; y++) all.push(...holidaysForYear(y));
  return all.filter((h) => h.date >= startYmd && h.date <= endYmd);
}
