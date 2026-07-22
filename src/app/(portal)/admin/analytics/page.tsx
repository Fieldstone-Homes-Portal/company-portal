import { auth } from "@/lib/auth";
import { getAnalytics, type WindowDays } from "@/lib/analytics";
import { appIcon } from "@/lib/appIcons";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Users,
  MousePointerClick,
  Clock,
  Boxes,
  Link2,
  Archive,
  Info,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const WINDOWS: { days: WindowDays; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/** "1h 24m" / "12m" / "45s" / "—" */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface Props {
  searchParams: Promise<{ window?: string }>;
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Admin-only feature.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { window: windowParam } = await searchParams;
  const windowDays: WindowDays =
    windowParam === "7" ? 7 : windowParam === "90" ? 90 : 30;

  const data = await getAnalytics(windowDays);
  const maxOpens = Math.max(1, ...data.topItems.map((r) => r.opens));
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.opens));
  const topItems = data.topItems.slice(0, 15);
  const leastUsed = data.leastUsed.slice(0, 8);

  const stats = [
    { label: "Total opens", value: String(data.totals.opens), icon: MousePointerClick },
    { label: "Active users", value: String(data.totals.activeUsers), icon: Users },
    { label: "Apps & links used", value: String(data.totals.itemsUsed), icon: Boxes },
    { label: "Time in apps", value: formatDuration(data.totals.activeSeconds), icon: Clock },
  ];

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
              })}{" "}
              — earlier opens weren&apos;t recorded.
            </>
          ) : (
            "No usage recorded yet — collection starts with this deploy."
          )}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray"
          >
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
          </div>
        ))}
      </div>

      {/* Opens over time */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-fs-copper" />
          <h2 className="font-display text-lg font-bold text-fs-espresso">
            Opens over time
          </h2>
        </div>
        {data.totals.opens === 0 ? (
          <p className="py-8 text-center text-sm text-fs-copper-light">
            Nothing recorded in this window yet.
          </p>
        ) : (
          <>
            <div className="flex h-36 items-end gap-px">
              {data.daily.map((d) => (
                <div
                  key={d.day}
                  className="group relative flex-1 rounded-t-sm bg-fs-copper/70 transition-colors hover:bg-fs-copper"
                  style={{
                    height: `${Math.max(d.opens === 0 ? 0 : 4, (d.opens / maxDaily) * 100)}%`,
                  }}
                  title={`${formatDay(d.day)}: ${d.opens} open${d.opens === 1 ? "" : "s"}`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-fs-copper-light">
              <span>{formatDay(data.daily[0].day)}</span>
              <span>{formatDay(data.daily[data.daily.length - 1].day)}</span>
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
          so they have no time).
        </p>
        {topItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-fs-copper-light">
            Nothing recorded in this window yet.
          </p>
        ) : (
          <div className="space-y-3">
            {topItems.map((item) => {
              const Icon = item.kind === "app" ? appIcon(item.icon) : Link2;
              return (
                <div key={`${item.kind}:${item.targetId}`} className="flex items-center gap-3">
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
                </div>
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
          intended users).
        </p>
        {leastUsed.length === 0 ? (
          <p className="py-8 text-center text-sm text-fs-copper-light">
            No active apps registered.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {leastUsed.map((app) => {
              const Icon = appIcon(app.icon);
              return (
                <div
                  key={app.id}
                  className="flex items-center gap-3 rounded-xl bg-fs-warm-white px-4 py-3"
                >
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
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
