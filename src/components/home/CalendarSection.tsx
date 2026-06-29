"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import type { MonthData, CalEvent } from "@/lib/companyCalendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

export default function CalendarSection({ initial }: { initial: MonthData }) {
  const [data, setData] = useState<MonthData>(initial);
  const [loading, setLoading] = useState(false);
  // Computed after mount so server/client initial HTML match (no hydration mismatch).
  const [today, setToday] = useState<{ y: number; m: number; d: number } | null>(null);
  useEffect(() => {
    const n = new Date();
    setToday({ y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() });
  }, []);

  async function go(delta: number) {
    let y = data.year;
    let m = data.month + delta;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${y}-${pad(m)}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* keep current month on failure */
    }
    setLoading(false);
  }

  const byDay = new Map<number, CalEvent[]>();
  for (const e of data.events) {
    const d = Number(e.date.slice(8, 10));
    const arr = byDay.get(d);
    if (arr) arr.push(e);
    else byDay.set(d, [e]);
  }

  const firstDow = new Date(Date.UTC(data.year, data.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(data.year, data.month, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const navBtn =
    "rounded-lg p-1.5 text-fs-copper ring-1 ring-fs-warm-gray transition-colors hover:bg-fs-warm-white hover:text-fs-espresso";

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-xl font-bold text-fs-espresso">
            {data.monthName} {data.year}
          </h2>
          {loading && <span className="text-xs text-fs-copper-light">updating…</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} aria-label="Previous month" className={navBtn}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => go(1)} aria-label="Next month" className={navBtn}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-fs-warm-gray">
        <div className="grid grid-cols-7 border-b border-fs-warm-gray bg-fs-warm-white">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-fs-copper">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, idx) => {
            const isToday =
              d !== null && today !== null &&
              data.year === today.y && data.month === today.m && d === today.d;
            const evs = d !== null ? byDay.get(d) ?? [] : [];
            return (
              <div
                key={idx}
                className={`min-h-[84px] border-b border-r border-fs-warm-gray/50 p-1.5 ${
                  d === null ? "bg-fs-warm-white/40" : ""
                }`}
              >
                {d !== null && (
                  <>
                    <div
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? "bg-fs-espresso text-white" : "text-fs-charcoal"
                      }`}
                    >
                      {d}
                    </div>
                    <div className="space-y-1">
                      {evs.slice(0, 2).map((e, i) => (
                        <div
                          key={i}
                          title={`${e.title}${e.time ? ` · ${e.time}` : ""}${e.meta ? ` · ${e.meta}` : ""}`}
                          className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight ${
                            e.kind === "meeting"
                              ? "bg-fs-espresso/10 text-fs-espresso"
                              : e.kind === "holiday"
                                ? "bg-fs-copper/15 text-fs-copper"
                                : "bg-fs-sage/25 text-fs-charcoal"
                          }`}
                        >
                          {e.time ? `${e.time} ` : ""}
                          {e.title}
                        </div>
                      ))}
                      {evs.length > 2 && (
                        <div className="px-1 text-[10px] text-fs-copper-light">+{evs.length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.anniversaries.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-fs-warm-gray">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fs-copper">
            <PartyPopper size={13} /> Work anniversaries in {data.monthName}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.anniversaries.map((a, i) => (
              <span key={i} className="rounded-full bg-fs-warm-white px-3 py-1 text-xs text-fs-espresso">
                <span className="font-semibold">{a.name}</span> · {a.years} yr{a.years === 1 ? "" : "s"}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-fs-copper-light">Approximate (month-level), from All Staff history.</p>
        </div>
      )}
    </section>
  );
}
