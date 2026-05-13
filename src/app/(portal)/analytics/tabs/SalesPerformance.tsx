"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, User } from "lucide-react";
import {
  Card,
  CardTitle,
  KpiCard,
  ProgressBar,
  SampleBadge,
  formatCurrency,
} from "../AnalyticsDashboard";
import {
  agents,
  communities,
  salesVsPlan,
  kpiSummary,
} from "../dashboardData";

export default function SalesPerformance() {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"totalSales" | "taskCompletion" | "avgResponseTime">("totalSales");

  const sorted = [...agents].sort((a, b) => {
    if (sortField === "totalSales") return b.totalSales - a.totalSales;
    if (sortField === "taskCompletion") return (b.taskCompletion || 0) - (a.taskCompletion || 0);
    return parseFloat(a.avgResponseTime || "99") - parseFloat(b.avgResponseTime || "99");
  });

  const activeCommunities = communities.filter((c) => c.actualSales > 0 || c.projectedSales > 0);

  return (
    <div className="space-y-6">
      {/* Team KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Active Agents"
          value={`${agents.length}`}
          subtitle="across all communities"
        />
        <KpiCard
          label="Total Certified Sales"
          value={`${kpiSummary.ytdCertifiedSales}`}
          subtitle={`of ${kpiSummary.ytdPlanSales} YTD plan`}
        />
        <KpiCard
          label="Avg Sales / Agent"
          value={`${(kpiSummary.ytdCertifiedSales / agents.length).toFixed(1)}`}
          subtitle="YTD average"
        />
        <KpiCard
          label="Avg Response Time"
          value="1.6 hrs"
          subtitle="lead first-touch"
          isSample
        />
        <KpiCard
          label="Avg Task Completion"
          value="89%"
          subtitle="HubSpot tasks"
          isSample
        />
      </div>

      {/* Agent Leaderboard */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle className="mb-0">Agent Leaderboard — 2026 YTD</CardTitle>
          <div className="flex gap-2">
            {(
              [
                { key: "totalSales", label: "By Sales" },
                { key: "taskCompletion", label: "By Tasks" },
                { key: "avgResponseTime", label: "By Response" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.key}
                onClick={() => setSortField(btn.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortField === btn.key
                    ? "bg-fs-espresso text-white"
                    : "bg-fs-warm-white text-fs-charcoal/60 hover:bg-fs-warm-gray"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {sorted.map((agent, i) => {
            const isExpanded = expandedAgent === agent.name;
            return (
              <div
                key={agent.name}
                className="overflow-hidden rounded-xl ring-1 ring-fs-warm-gray"
              >
                <button
                  onClick={() =>
                    setExpandedAgent(isExpanded ? null : agent.name)
                  }
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-fs-warm-white"
                >
                  {/* Rank */}
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                          ? "bg-gray-100 text-gray-600"
                          : i === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-fs-warm-white text-fs-charcoal/50"
                    }`}
                  >
                    {i + 1}
                  </span>

                  {/* Name + communities */}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-fs-espresso">
                      {agent.name}
                    </p>
                    <p className="text-xs text-fs-charcoal/50">
                      {agent.communities.map((c) => c.name).join(", ")}
                    </p>
                  </div>

                  {/* Sales */}
                  <div className="text-center">
                    <p className="text-lg font-bold text-fs-espresso">
                      {agent.totalSales}
                    </p>
                    <p className="text-[10px] text-fs-charcoal/40">sales</p>
                  </div>

                  {/* Response Time */}
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${agent.isSampleExtras ? "text-orange-500" : "text-fs-espresso"}`}>
                      {agent.avgResponseTime}
                    </p>
                    <p className="text-[10px] text-fs-charcoal/40">
                      avg response
                    </p>
                  </div>

                  {/* Task Completion */}
                  <div className="w-20">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${agent.isSampleExtras ? "text-orange-500" : "text-fs-espresso"}`}>
                        {agent.taskCompletion}%
                      </span>
                    </div>
                    <ProgressBar
                      value={agent.taskCompletion || 0}
                      max={100}
                      showLabel={false}
                      isSample={agent.isSampleExtras}
                    />
                  </div>

                  {isExpanded ? (
                    <ChevronUp size={16} className="text-fs-charcoal/40" />
                  ) : (
                    <ChevronDown size={16} className="text-fs-charcoal/40" />
                  )}
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-fs-warm-gray bg-fs-warm-white px-4 py-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-fs-charcoal/40">
                          Leads Assigned<SampleBadge />
                        </p>
                        <p className="mt-1 text-lg font-bold text-orange-500">
                          {agent.leadsAssigned}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-fs-charcoal/40">
                          Tour Conversion<SampleBadge />
                        </p>
                        <p className="mt-1 text-lg font-bold text-orange-500">
                          {agent.tourConversion}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-fs-charcoal/40">
                          Certified Sales
                        </p>
                        <p className="mt-1 text-lg font-bold text-fs-espresso">
                          {agent.totalSales}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-fs-charcoal/40">
                          Lead → Sale Rate<SampleBadge />
                        </p>
                        <p className="mt-1 text-lg font-bold text-orange-500">
                          {agent.leadsAssigned
                            ? (
                                (agent.totalSales / agent.leadsAssigned) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>

                    {/* Sales by Community */}
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-fs-charcoal/40">
                        Sales by Community
                      </p>
                      <div className="space-y-2">
                        {agent.communities.map((c) => (
                          <div key={c.name} className="flex items-center gap-3">
                            <span className="w-40 text-xs text-fs-charcoal/70">
                              {c.name}
                            </span>
                            <div className="flex-1">
                              <ProgressBar
                                value={c.sales}
                                max={Math.max(
                                  ...agent.communities.map((x) => x.sales)
                                )}
                              />
                            </div>
                            <span className="w-8 text-right text-xs font-bold text-fs-espresso">
                              {c.sales}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Conversion Funnel */}
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-fs-charcoal/40">
                        Conversion Funnel<SampleBadge />
                      </p>
                      <div className="flex items-center gap-2">
                        {[
                          {
                            label: "Leads",
                            value: agent.leadsAssigned || 0,
                          },
                          {
                            label: "Tours",
                            value: Math.round(
                              ((agent.leadsAssigned || 0) *
                                (agent.tourConversion || 0)) /
                                100
                            ),
                          },
                          {
                            label: "Contracts",
                            value: agent.totalSales + 1,
                          },
                          { label: "Closed", value: agent.totalSales },
                        ].map((step, si) => (
                          <div key={step.label} className="flex flex-1 items-center">
                            <div className="flex-1 rounded-lg bg-orange-50 px-3 py-2 text-center ring-1 ring-orange-200">
                              <p className="text-lg font-bold text-orange-500">
                                {step.value}
                              </p>
                              <p className="text-[10px] text-orange-400">
                                {step.label}
                              </p>
                            </div>
                            {si < 3 && (
                              <span className="px-1 text-fs-charcoal/20">
                                →
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Community Sales vs Plan */}
      <Card>
        <CardTitle>Community Sales vs Plan — 2026 YTD</CardTitle>
        <div className="space-y-3">
          {activeCommunities
            .sort(
              (a, b) =>
                b.actualSales / Math.max(b.projectedSales, 1) -
                a.actualSales / Math.max(a.projectedSales, 1)
            )
            .map((c) => {
              const monthsElapsed = 4.4;
              const monthsInYear = 12;
              const expectedPace = Math.round(
                c.projectedSales * (monthsElapsed / monthsInYear)
              );
              const onPace = c.actualSales >= expectedPace;

              return (
                <div
                  key={c.name}
                  className="flex items-center gap-4 rounded-lg bg-fs-warm-white px-4 py-3"
                >
                  <div className="w-44">
                    <p className="text-sm font-semibold text-fs-espresso">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-fs-charcoal/40">
                      {c.type} · {c.region}
                    </p>
                  </div>
                  <div className="flex-1">
                    <ProgressBar
                      value={c.actualSales}
                      max={c.projectedSales}
                    />
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm font-bold text-fs-espresso">
                      {c.actualSales}
                    </span>
                    <span className="text-sm text-fs-charcoal/40">
                      {" "}
                      / {c.projectedSales}
                    </span>
                  </div>
                  <span
                    className={`w-20 rounded-full px-2 py-0.5 text-center text-[10px] font-semibold ${
                      onPace
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {onPace ? "On Pace" : "Behind"}
                  </span>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}
