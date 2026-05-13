"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import {
  Card,
  CardTitle,
  ProgressBar,
  formatCurrency,
} from "../AnalyticsDashboard";
import { communities } from "../dashboardData";

export default function CommunityView() {
  const [expandedCommunity, setExpandedCommunity] = useState<string | null>(
    null
  );
  const [filter, setFilter] = useState<"all" | "North" | "South">("all");

  const filtered =
    filter === "all"
      ? communities
      : communities.filter((c) => c.region === filter);

  const activeCommunities = filtered.filter(
    (c) =>
      c.certified > 0 ||
      c.spec > 0 ||
      c.model > 0 ||
      c.available > 0 ||
      c.sold > 0 ||
      c.projectedSales > 0
  );

  return (
    <div className="space-y-6">
      {/* Region Filter */}
      <div className="flex gap-2">
        {(["all", "North", "South"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === r
                ? "bg-fs-espresso text-white"
                : "bg-white text-fs-charcoal/60 ring-1 ring-fs-warm-gray hover:bg-fs-warm-white"
            }`}
          >
            {r === "all" ? "All Regions" : `${r} Region`}
          </button>
        ))}
      </div>

      {/* Community Cards */}
      <div className="space-y-3">
        {activeCommunities
          .sort((a, b) => {
            const aTotal =
              a.certified + a.spec + a.model + a.available + a.sold;
            const bTotal =
              b.certified + b.spec + b.model + b.available + b.sold;
            return bTotal - aTotal;
          })
          .map((c) => {
            const isExpanded = expandedCommunity === c.name;
            const totalActive =
              c.certified + c.spec + c.model + c.available + c.sold;
            const trafficToSale =
              c.traffic2026 > 0 && c.actualSales > 0
                ? (c.traffic2026 / c.actualSales).toFixed(1)
                : "—";

            return (
              <div
                key={c.name}
                className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-fs-warm-gray"
              >
                <button
                  onClick={() =>
                    setExpandedCommunity(isExpanded ? null : c.name)
                  }
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-fs-warm-white"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fs-copper/10">
                    <MapPin size={18} className="text-fs-copper" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-fs-espresso">
                      {c.name}
                    </p>
                    <p className="text-xs text-fs-charcoal/50">
                      {c.type} · {c.region} · {c.totalUnits} total units
                    </p>
                  </div>

                  {/* Sales Progress */}
                  <div className="w-36">
                    <div className="flex justify-between text-xs">
                      <span className="text-fs-charcoal/50">Sales</span>
                      <span className="font-semibold text-fs-espresso">
                        {c.actualSales} / {c.projectedSales}
                      </span>
                    </div>
                    <ProgressBar
                      value={c.actualSales}
                      max={c.projectedSales || 1}
                      showLabel={false}
                    />
                  </div>

                  {/* Active Lots */}
                  <div className="text-center">
                    <p className="text-lg font-bold text-fs-espresso">
                      {totalActive}
                    </p>
                    <p className="text-[10px] text-fs-charcoal/40">
                      active lots
                    </p>
                  </div>

                  {/* Traffic */}
                  <div className="text-center">
                    <p className="text-lg font-bold text-fs-copper">
                      {c.traffic2026 || "—"}
                    </p>
                    <p className="text-[10px] text-fs-charcoal/40">
                      YTD traffic
                    </p>
                  </div>

                  {isExpanded ? (
                    <ChevronUp size={16} className="text-fs-charcoal/40" />
                  ) : (
                    <ChevronDown size={16} className="text-fs-charcoal/40" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-fs-warm-gray bg-fs-warm-white px-5 py-5">
                    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                      {/* Lot Inventory */}
                      <div>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-fs-charcoal/40">
                          Lot Inventory
                        </p>
                        <div className="space-y-2">
                          {[
                            {
                              label: "Certified",
                              value: c.certified,
                              color: "bg-emerald-400",
                            },
                            {
                              label: "Spec",
                              value: c.spec,
                              color: "bg-sky-400",
                            },
                            {
                              label: "Model",
                              value: c.model,
                              color: "bg-violet-400",
                            },
                            {
                              label: "Available",
                              value: c.available,
                              color: "bg-amber-400",
                            },
                            {
                              label: "Sold",
                              value: c.sold,
                              color: "bg-fs-copper",
                            },
                          ].map((row) => (
                            <div
                              key={row.label}
                              className="flex items-center gap-2"
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${row.color}`}
                              />
                              <span className="flex-1 text-xs text-fs-charcoal/70">
                                {row.label}
                              </span>
                              <span className="text-xs font-bold text-fs-espresso">
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-fs-charcoal/40">
                          Average Pricing
                        </p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-fs-charcoal/40">
                              Base Price
                            </p>
                            <p className="text-sm font-bold text-fs-espresso">
                              {c.avgBasePrice > 0
                                ? formatCurrency(c.avgBasePrice)
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-fs-charcoal/40">
                              Avg Options
                            </p>
                            <p className="text-sm font-bold text-fs-espresso">
                              {c.avgOptionPrice > 0
                                ? formatCurrency(c.avgOptionPrice)
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-fs-charcoal/40">
                              Avg Total
                            </p>
                            <p className="text-sm font-bold text-fs-copper">
                              {c.avgBasePrice > 0
                                ? formatCurrency(
                                    c.avgBasePrice + c.avgOptionPrice
                                  )
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Performance */}
                      <div>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-fs-charcoal/40">
                          Performance
                        </p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-fs-charcoal/40">
                              Sales vs Plan
                            </p>
                            <p className="text-sm font-bold text-fs-espresso">
                              {c.actualSales} / {c.projectedSales}
                            </p>
                            <ProgressBar
                              value={c.actualSales}
                              max={c.projectedSales || 1}
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-fs-charcoal/40">
                              Traffic → Sale Ratio
                            </p>
                            <p className="text-sm font-bold text-fs-espresso">
                              {trafficToSale}
                              {trafficToSale !== "—" && (
                                <span className="text-[10px] text-fs-charcoal/40">
                                  {" "}
                                  visits / sale
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-fs-charcoal/40">
                          Details
                        </p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-fs-charcoal/40">
                              Cycle Time Goal
                            </p>
                            <p className="text-sm font-bold text-fs-espresso">
                              {c.cycleTimeGoal
                                ? `${c.cycleTimeGoal} days`
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-fs-charcoal/40">
                              Region
                            </p>
                            <p className="text-sm font-bold text-fs-espresso">
                              {c.region}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-fs-charcoal/40">
                              Total Units
                            </p>
                            <p className="text-sm font-bold text-fs-espresso">
                              {c.totalUnits}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
