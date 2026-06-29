import { CalendarClock, Users, PartyPopper, Coffee, type LucideIcon } from "lucide-react";
import type { CalEvent } from "@/lib/companyCalendar";

const MON_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const KIND_ICON: Record<CalEvent["kind"], LucideIcon> = {
  meeting: Users,
  holiday: PartyPopper,
  "office-closed": Coffee,
};

function dateChip(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return { mon: MON_ABBR[m - 1], day: d };
}

export default function UpcomingSection({ items }: { items: CalEvent[] }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock size={16} className="text-fs-copper" />
        <h2 className="font-display text-xl font-bold text-fs-espresso">Upcoming</h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <p className="text-sm text-fs-copper">Nothing on the company calendar in the next several weeks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e, i) => {
            const { mon, day } = dateChip(e.date);
            const Icon = KIND_ICON[e.kind];
            return (
              <div
                key={`${e.date}-${i}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-fs-warm-gray"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-fs-warm-white">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-fs-copper">{mon}</span>
                  <span className="text-lg font-bold leading-none text-fs-espresso">{day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-fs-espresso">
                    <Icon size={13} className="shrink-0 text-fs-copper" />
                    <span className="truncate">{e.title}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-fs-copper-light">
                    {[e.time, e.meta].filter(Boolean).join(" · ") ||
                      (e.kind === "office-closed" ? "Office closed" : "All day")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
