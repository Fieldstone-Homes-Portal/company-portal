"use client";

import { createElement, useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  MousePointerClick,
  Clock,
  Boxes,
  Link2,
  Archive,
  X,
  Loader2,
} from "lucide-react";
import { appIcon } from "@/lib/appIcons";
import type {
  AppUsageRow,
  DailyOpens,
  DayDrilldown,
  ItemDrilldown,
  LeastUsedApp,
  UserTotalsRow,
  WindowDays,
} from "@/lib/analytics";

/**
 * Client half of /admin/analytics: renders the stat tiles, daily chart, and
 * app lists, and lets every one of them drill down into detail — above all
 * WHO used the thing and how much. Detail loads on demand from the
 * admin-only /api/analytics/drilldown route; the modal follows the portal's
 * What's New modal pattern (backdrop + Escape close, scroll lock).
 */

interface AnalyticsViewProps {
  windowDays: WindowDays;
  totals: {
    opens: number;
    activeUsers: number;
    itemsUsed: number;
    activeSeconds: number;
  };
  topItems: AppUsageRow[];
  daily: DailyOpens[];
  leastUsed: LeastUsedApp[];
}

/** What the modal is currently showing. */
type DrillTarget =
  | { view: "item"; kind: "app" | "link"; id: string; label: string }
  | { view: "day"; date: string }
  | { view: "users"; sortBy: "opens" | "time"; title: string };

type DrillData =
  | { view: "item"; data: ItemDrilldown }
  | { view: "day"; data: DayDrilldown }
  | { view: "users"; data: UserTotalsRow[] };

/** "1h 24m" / "12m" / "45s" / "—" */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/** "Jul 28" from a YYYY-MM-DD key (keys are already Mountain-time days). */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Jul 28, 2:41 PM" in Mountain time, from an ISO timestamp. */
function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });
}

function displayName(name: string | null, email: string): string {
  return name || email.split("@")[0];
}

/* ------------------------------------------------------------------------- */
/*  Modal building blocks                                                     */
/* ------------------------------------------------------------------------- */

function UserBar({
  left,
  right,
  fraction,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  fraction: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">{left}</div>
        <div className="shrink-0 text-xs text-fs-copper">{right}</div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-fs-warm-white">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fs-copper to-fs-copper-light"
          style={{ width: `${Math.max(2, fraction * 100)}%` }}
        />
      </div>
    </div>
  );
}

function Sparkline({ daily }: { daily: DailyOpens[] }) {
  const max = Math.max(1, ...daily.map((d) => d.opens));
  return (
    <div>
      <div className="flex h-14 items-end gap-px">
        {daily.map((d) => (
          <div
            key={d.day}
            className="flex-1 rounded-t-sm bg-fs-copper/60"
            style={{
              height: `${Math.max(d.opens === 0 ? 0 : 6, (d.opens / max) * 100)}%`,
            }}
            title={`${formatDay(d.day)}: ${d.opens} open${d.opens === 1 ? "" : "s"}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-fs-copper-light">
        <span>{formatDay(daily[0].day)}</span>
        <span>{formatDay(daily[daily.length - 1].day)}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-fs-copper">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------------- */
/*  Modal bodies per view                                                     */
/* ------------------------------------------------------------------------- */

function ItemBody({ data, windowDays }: { data: ItemDrilldown; windowDays: WindowDays }) {
  const maxOpens = Math.max(1, ...data.users.map((u) => u.opens));
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Opens per day — last {windowDays} days</SectionLabel>
        <Sparkline daily={data.daily} />
      </div>
      <div>
        <SectionLabel>
          Who used it ({data.users.length} {data.users.length === 1 ? "user" : "users"})
        </SectionLabel>
        <div className="space-y-3">
          {data.users.map((u) => (
            <UserBar
              key={u.email}
              fraction={u.opens / maxOpens}
              left={
                <p className="truncate text-sm font-medium text-fs-espresso" title={u.email}>
                  {displayName(u.name, u.email)}
                  <span className="ml-2 text-xs font-normal text-fs-copper-light">
                    {u.email}
                  </span>
                </p>
              }
              right={
                <>
                  <span className="font-semibold text-fs-espresso">{u.opens}</span>{" "}
                  {u.opens === 1 ? "open" : "opens"}
                  {u.activeSeconds > 0 && <> · {formatDuration(u.activeSeconds)}</>}
                  {" · last "}
                  {formatWhen(u.lastOpenedAt)}
                </>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayBody({ data }: { data: DayDrilldown }) {
  const maxItemOpens = Math.max(1, ...data.items.map((i) => i.opens));
  const maxUserOpens = Math.max(1, ...data.users.map((u) => u.opens));
  if (data.items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fs-copper-light">
        Nothing was opened this day.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Apps &amp; links opened ({data.items.length})</SectionLabel>
        <div className="space-y-3">
          {data.items.map((item) => (
            <UserBar
              key={`${item.kind}:${item.targetId}`}
              fraction={item.opens / maxItemOpens}
              left={
                <p className="truncate text-sm font-medium text-fs-espresso">
                  {item.label}
                  {item.kind === "link" && (
                    <span className="ml-2 rounded-full bg-fs-warm-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-fs-copper-light">
                      link
                    </span>
                  )}
                </p>
              }
              right={
                <>
                  <span className="font-semibold text-fs-espresso">{item.opens}</span>{" "}
                  {item.opens === 1 ? "open" : "opens"} · {item.users}{" "}
                  {item.users === 1 ? "user" : "users"}
                </>
              }
            />
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Active users ({data.users.length})</SectionLabel>
        <div className="space-y-3">
          {data.users.map((u) => (
            <UserBar
              key={u.email}
              fraction={u.opens / maxUserOpens}
              left={
                <p className="truncate text-sm font-medium text-fs-espresso" title={u.email}>
                  {displayName(u.name, u.email)}
                  <span className="ml-2 text-xs font-normal text-fs-copper-light">
                    {u.email}
                  </span>
                </p>
              }
              right={
                <>
                  <span className="font-semibold text-fs-espresso">{u.opens}</span>{" "}
                  {u.opens === 1 ? "open" : "opens"}
                </>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersBody({
  data,
  sortBy,
  windowDays,
}: {
  data: UserTotalsRow[];
  sortBy: "opens" | "time";
  windowDays: WindowDays;
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fs-copper-light">
        No activity recorded in this window yet.
      </p>
    );
  }
  const rows = [...data].sort((a, b) =>
    sortBy === "time"
      ? b.activeSeconds - a.activeSeconds || b.opens - a.opens
      : b.opens - a.opens || b.activeSeconds - a.activeSeconds,
  );
  const max = Math.max(
    1,
    ...rows.map((r) => (sortBy === "time" ? r.activeSeconds : r.opens)),
  );
  return (
    <div>
      <SectionLabel>
        {rows.length} {rows.length === 1 ? "user" : "users"} active in the last{" "}
        {windowDays} days — by {sortBy === "time" ? "time in apps" : "opens"}
      </SectionLabel>
      <div className="space-y-3">
        {rows.map((u) => (
          <UserBar
            key={u.email}
            fraction={(sortBy === "time" ? u.activeSeconds : u.opens) / max}
            left={
              <p className="truncate text-sm font-medium text-fs-espresso" title={u.email}>
                {displayName(u.name, u.email)}
                <span className="ml-2 text-xs font-normal text-fs-copper-light">
                  {u.email}
                </span>
              </p>
            }
            right={
              <>
                <span className="font-semibold text-fs-espresso">{u.opens}</span>{" "}
                {u.opens === 1 ? "open" : "opens"} · {u.distinctItems}{" "}
                {u.distinctItems === 1 ? "app" : "apps"}
                {u.activeSeconds > 0 && <> · {formatDuration(u.activeSeconds)}</>}
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  The drill-down modal                                                      */
/* ------------------------------------------------------------------------- */

function DrilldownModal({
  target,
  windowDays,
  onClose,
}: {
  target: DrillTarget;
  windowDays: WindowDays;
  onClose: () => void;
}) {
  const [result, setResult] = useState<DrillData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape and lock background scroll — same behavior as the
  // What's New / All Staff modals.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // The modal is keyed by its target (see below), so it mounts fresh for
  // every drill-down — result/error start null and one fetch runs per mount.
  useEffect(() => {
    let cancelled = false;

    const qs = new URLSearchParams({ window: String(windowDays) });
    if (target.view === "item") {
      qs.set("view", "item");
      qs.set("kind", target.kind);
      qs.set("id", target.id);
    } else if (target.view === "day") {
      qs.set("view", "day");
      qs.set("date", target.date);
    } else {
      qs.set("view", "users");
    }

    fetch(`/api/analytics/drilldown?${qs.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        if (target.view === "item") setResult({ view: "item", data });
        else if (target.view === "day") setResult({ view: "day", data });
        else setResult({ view: "users", data });
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the details. Try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [target, windowDays]);

  const title =
    target.view === "item"
      ? target.label
      : target.view === "day"
        ? formatDay(target.date)
        : target.title;
  const subtitle =
    target.view === "item"
      ? `Who opened it in the last ${windowDays} days`
      : target.view === "day"
        ? "What was opened and who was active that day (Mountain time)"
        : `Per-user activity in the last ${windowDays} days`;
  const HeaderIcon =
    target.view === "item"
      ? target.kind === "link"
        ? Link2
        : appIcon(result?.view === "item" ? result.data.icon : null)
      : target.view === "day"
        ? BarChart3
        : Users;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fs-espresso/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-fs-warm-gray px-6 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fs-warm-white text-fs-copper">
              {/* createElement because the icon component is picked at render
                  time (lucide components are static module references). */}
              {createElement(HeaderIcon, { size: 22 })}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-bold leading-snug text-fs-espresso">
                {title}
              </h3>
              <p className="mt-1 text-xs text-fs-copper">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-fs-copper transition-colors hover:bg-fs-warm-white hover:text-fs-espresso"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {error ? (
            <p className="py-8 text-center text-sm text-fs-copper-light">{error}</p>
          ) : !result ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-fs-copper-light">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : result.view === "item" ? (
            <ItemBody data={result.data} windowDays={windowDays} />
          ) : result.view === "day" ? (
            <DayBody data={result.data} />
          ) : (
            <UsersBody
              data={result.data}
              sortBy={target.view === "users" ? target.sortBy : "opens"}
              windowDays={windowDays}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  The page body                                                             */
/* ------------------------------------------------------------------------- */

export default function AnalyticsView({
  windowDays,
  totals,
  daily,
  topItems,
  leastUsed,
}: AnalyticsViewProps) {
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const maxOpens = Math.max(1, ...topItems.map((r) => r.opens));
  const maxDaily = Math.max(1, ...daily.map((d) => d.opens));

  const openItem = (kind: string, id: string, label: string) =>
    setDrill({ view: "item", kind: kind === "link" ? "link" : "app", id, label });

  // "Apps & links used" has no meaningful drill-down (the most-opened list
  // below IS that breakdown), so that tile stays static.
  const stats: {
    label: string;
    value: string;
    icon: typeof Users;
    drill: DrillTarget | null;
  }[] = [
    {
      label: "Total opens",
      value: String(totals.opens),
      icon: MousePointerClick,
      drill: { view: "users", sortBy: "opens", title: "Opens by user" },
    },
    {
      label: "Active users",
      value: String(totals.activeUsers),
      icon: Users,
      drill: { view: "users", sortBy: "opens", title: "Active users" },
    },
    { label: "Apps & links used", value: String(totals.itemsUsed), icon: Boxes, drill: null },
    {
      label: "Time in apps",
      value: formatDuration(totals.activeSeconds),
      icon: Clock,
      drill: { view: "users", sortBy: "time", title: "Time in apps by user" },
    },
  ];

  return (
    <>
      {/* Stat tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const inner = (
            <>
              <div className="flex items-center gap-2 text-fs-copper">
                <s.icon size={16} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                  {s.label}
                </p>
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-fs-espresso">
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px] text-fs-copper-light">
                last {windowDays} days
              </p>
            </>
          );
          return s.drill ? (
            <button
              key={s.label}
              onClick={() => setDrill(s.drill)}
              className="rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-fs-warm-gray transition-all hover:shadow-md hover:ring-fs-copper/30"
            >
              {inner}
            </button>
          ) : (
            <div
              key={s.label}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Opens over time */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray">
        <div className="mb-1 flex items-center gap-2">
          <BarChart3 size={16} className="text-fs-copper" />
          <h2 className="font-display text-lg font-bold text-fs-espresso">
            Opens over time
          </h2>
        </div>
        <p className="mb-4 text-xs text-fs-copper-light">
          Click a bar to see that day&apos;s apps and users.
        </p>
        {totals.opens === 0 ? (
          <p className="py-8 text-center text-sm text-fs-copper-light">
            Nothing recorded in this window yet.
          </p>
        ) : (
          <>
            <div className="flex h-36 items-end gap-px">
              {daily.map((d) => (
                <button
                  key={d.day}
                  onClick={() => d.opens > 0 && setDrill({ view: "day", date: d.day })}
                  aria-label={`${formatDay(d.day)}: ${d.opens} opens`}
                  // Full-height hit area so short bars stay clickable.
                  className={`group flex h-full flex-1 items-end ${
                    d.opens > 0 ? "cursor-pointer" : "cursor-default"
                  }`}
                  title={`${formatDay(d.day)}: ${d.opens} open${d.opens === 1 ? "" : "s"}`}
                >
                  <div
                    className="w-full rounded-t-sm bg-fs-copper/70 transition-colors group-hover:bg-fs-copper"
                    style={{
                      height: `${Math.max(d.opens === 0 ? 0 : 4, (d.opens / maxDaily) * 100)}%`,
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-fs-copper-light">
              <span>{formatDay(daily[0].day)}</span>
              <span>{formatDay(daily[daily.length - 1].day)}</span>
            </div>
          </>
        )}
      </section>

      {/* Most-opened apps */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray">
        <div className="mb-1 flex items-center gap-2">
          <MousePointerClick size={16} className="text-fs-copper" />
          <h2 className="font-display text-lg font-bold text-fs-espresso">
            Most opened
          </h2>
        </div>
        <p className="mb-5 text-xs text-fs-copper-light">
          Apps and company links, ranked by opens in the last {windowDays} days.
          Time is visible time on the embedded app page (links open externally,
          so they have no time). Click a row to see who used it.
        </p>
        {topItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-fs-copper-light">
            Nothing recorded in this window yet.
          </p>
        ) : (
          <div className="space-y-1">
            {topItems.map((item) => {
              const Icon = item.kind === "app" ? appIcon(item.icon) : Link2;
              return (
                <button
                  key={`${item.kind}:${item.targetId}`}
                  onClick={() => openItem(item.kind, item.targetId, item.label)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-fs-warm-white"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fs-warm-white text-fs-copper">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-fs-espresso">
                        {item.label}
                        {item.kind === "link" && (
                          <span className="ml-2 rounded-full bg-fs-warm-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-fs-copper-light">
                            link
                          </span>
                        )}
                        {item.kind === "app" && !item.isCurrentApp && (
                          <span className="ml-2 rounded-full bg-fs-warm-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-fs-copper-light">
                            removed
                          </span>
                        )}
                      </p>
                      <p className="shrink-0 text-xs text-fs-copper">
                        <span className="font-semibold text-fs-espresso">{item.opens}</span>{" "}
                        opens · {item.users} {item.users === 1 ? "user" : "users"}
                        {item.activeSeconds > 0 && <> · {formatDuration(item.activeSeconds)}</>}
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-fs-warm-white">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-fs-copper to-fs-copper-light"
                        style={{ width: `${Math.max(2, (item.opens / maxOpens) * 100)}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Least-used apps */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray">
        <div className="mb-1 flex items-center gap-2">
          <Archive size={16} className="text-fs-copper" />
          <h2 className="font-display text-lg font-bold text-fs-espresso">
            Least used — retirement candidates
          </h2>
        </div>
        <p className="mb-5 text-xs text-fs-copper-light">
          Active portal apps with the fewest opens in the last {windowDays} days.
          Zero-open apps may be candidates for retirement (or a nudge to their
          intended users). Click an app with opens to see who used it.
        </p>
        {leastUsed.length === 0 ? (
          <p className="py-8 text-center text-sm text-fs-copper-light">
            No active apps registered.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {leastUsed.map((app) => {
              const Icon = appIcon(app.icon);
              const inner = (
                <>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-fs-copper">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fs-espresso">{app.name}</p>
                    <p className="text-[11px] text-fs-copper-light">
                      {app.section === "dashboard" ? "Dashboard" : "Tool"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      app.opens === 0
                        ? "bg-fs-espresso text-white"
                        : "bg-white text-fs-copper"
                    }`}
                  >
                    {app.opens === 0
                      ? "0 opens"
                      : `${app.opens} opens · ${app.users} ${app.users === 1 ? "user" : "users"}`}
                  </span>
                </>
              );
              // Zero-open apps have no drill-down (there's nobody to show).
              return app.opens > 0 ? (
                <button
                  key={app.id}
                  onClick={() => openItem("app", app.id, app.name)}
                  className="flex items-center gap-3 rounded-xl bg-fs-warm-white px-4 py-3 text-left transition-all hover:shadow-sm hover:ring-1 hover:ring-fs-copper/30"
                >
                  {inner}
                </button>
              ) : (
                <div
                  key={app.id}
                  className="flex items-center gap-3 rounded-xl bg-fs-warm-white px-4 py-3"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {drill && (
        <DrilldownModal
          // Remount per target so state resets and exactly one fetch runs.
          key={JSON.stringify(drill)}
          target={drill}
          windowDays={windowDays}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  );
}
