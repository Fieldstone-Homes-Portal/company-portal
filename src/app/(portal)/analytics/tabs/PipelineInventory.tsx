"use client";

import {
  Card,
  CardTitle,
  ProgressBar,
  formatCurrency,
} from "../AnalyticsDashboard";
import { communities, wipSummary, kpiSummary } from "../dashboardData";

export default function PipelineInventory() {
  const specCommunities = communities
    .filter((c) => c.spec > 0)
    .sort((a, b) => b.spec - a.spec);

  const certifiedCommunities = communities
    .filter((c) => c.certified > 0)
    .sort((a, b) => b.certified - a.certified);

  const totalSpec = communities.reduce((s, c) => s + c.spec, 0);
  const totalCertified = communities.reduce((s, c) => s + c.certified, 0);
  const totalModel = communities.reduce((s, c) => s + c.model, 0);
  const totalAvailable = communities.reduce((s, c) => s + c.available, 0);

  const statusBreakdown = [
    { label: "Certified", count: wipSummary.certified, color: "bg-emerald-400", desc: "Contract ratified, deposit made" },
    { label: "Spec", count: wipSummary.spec, color: "bg-sky-400", desc: "Built on speculation, unsold" },
    { label: "Model", count: wipSummary.model, color: "bg-violet-400", desc: "Show homes" },
    { label: "Available", count: wipSummary.available, color: "bg-amber-400", desc: "Ready for sale" },
    { label: "Dirt Sale", count: wipSummary.dirtSale, color: "bg-fs-copper", desc: "Sold before design complete" },
    { label: "Sold", count: wipSummary.sold, color: "bg-teal-400", desc: "Under contract" },
  ];

  const totalPipeline = statusBreakdown.reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-fs-charcoal/50">
            Total in Pipeline
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-fs-espresso">
            {totalPipeline}
          </p>
          <p className="mt-1 text-xs text-fs-charcoal/50">active lots</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-fs-charcoal/50">
            Unsold Specs
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-sky-600">
            {totalSpec}
          </p>
          <p className="mt-1 text-xs text-fs-charcoal/50">
            across {specCommunities.length} communities
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-fs-charcoal/50">
            Certified / Sold
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-emerald-600">
            {totalCertified + wipSummary.sold}
          </p>
          <p className="mt-1 text-xs text-fs-charcoal/50">moving to close</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-fs-charcoal/50">
            QMI Percentage
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-fs-copper">
            {kpiSummary.qmiPercentage}%
          </p>
          <p className="mt-1 text-xs text-fs-charcoal/50">quick move-in ready</p>
        </Card>
      </div>

      {/* Status Breakdown Visual */}
      <Card>
        <CardTitle>Pipeline by Status</CardTitle>
        <div className="mb-4 flex h-8 overflow-hidden rounded-full">
          {statusBreakdown.map((s) => (
            <div
              key={s.label}
              className={`${s.color} flex items-center justify-center transition-all`}
              style={{
                width: `${(s.count / totalPipeline) * 100}%`,
                minWidth: s.count > 0 ? 20 : 0,
              }}
            >
              {s.count > 3 && (
                <span className="text-[10px] font-bold text-white">
                  {s.count}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {statusBreakdown.map((s) => (
            <div
              key={s.label}
              className="rounded-lg bg-fs-warm-white px-3 py-3 text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${s.color}`}
                />
                <span className="text-xs font-semibold text-fs-charcoal/70">
                  {s.label}
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold text-fs-espresso">
                {s.count}
              </p>
              <p className="text-[10px] text-fs-charcoal/40">{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Spec Inventory by Community */}
      <Card>
        <CardTitle>Spec Inventory by Community</CardTitle>
        <p className="mb-4 text-xs text-fs-charcoal/50">
          Unsold spec homes — ranked by count. High spec counts may indicate
          need for pricing adjustments or targeted marketing.
        </p>
        <div className="space-y-2">
          {specCommunities.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-4 rounded-lg bg-fs-warm-white px-4 py-3"
            >
              <div className="w-44">
                <p className="text-sm font-semibold text-fs-espresso">
                  {c.name}
                </p>
                <p className="text-[10px] text-fs-charcoal/40">{c.type}</p>
              </div>
              <div className="flex-1">
                <ProgressBar
                  value={c.spec}
                  max={Math.max(...specCommunities.map((x) => x.spec))}
                  showLabel={false}
                />
              </div>
              <div className="w-16 text-right">
                <span className="text-lg font-bold text-sky-600">
                  {c.spec}
                </span>
                <span className="text-xs text-fs-charcoal/40"> specs</span>
              </div>
              <div className="w-28 text-right">
                <p className="text-xs text-fs-charcoal/50">
                  {c.avgBasePrice > 0
                    ? `avg ${formatCurrency(c.avgBasePrice + c.avgOptionPrice, true)}`
                    : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Certified Pipeline by Community */}
      <Card>
        <CardTitle>Certified Pipeline by Community</CardTitle>
        <p className="mb-4 text-xs text-fs-charcoal/50">
          Lots with ratified contracts — moving toward closing.
        </p>
        <div className="space-y-2">
          {certifiedCommunities.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-4 rounded-lg bg-fs-warm-white px-4 py-3"
            >
              <div className="w-44">
                <p className="text-sm font-semibold text-fs-espresso">
                  {c.name}
                </p>
                <p className="text-[10px] text-fs-charcoal/40">{c.region}</p>
              </div>
              <div className="flex-1">
                <ProgressBar
                  value={c.certified}
                  max={Math.max(
                    ...certifiedCommunities.map((x) => x.certified)
                  )}
                  showLabel={false}
                />
              </div>
              <div className="w-16 text-right">
                <span className="text-lg font-bold text-emerald-600">
                  {c.certified}
                </span>
              </div>
              <div className="w-28 text-right">
                <p className="text-xs text-fs-charcoal/50">
                  {c.avgBasePrice > 0
                    ? `avg ${formatCurrency(c.avgBasePrice + c.avgOptionPrice, true)}`
                    : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Full Community Inventory Table */}
      <Card>
        <CardTitle>Full Inventory Snapshot</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fs-warm-gray text-left">
                <th className="pb-2 pr-3 text-xs font-semibold text-fs-charcoal/50">
                  Community
                </th>
                <th className="pb-2 pr-3 text-center text-xs font-semibold text-emerald-600">
                  Cert
                </th>
                <th className="pb-2 pr-3 text-center text-xs font-semibold text-sky-600">
                  Spec
                </th>
                <th className="pb-2 pr-3 text-center text-xs font-semibold text-violet-600">
                  Model
                </th>
                <th className="pb-2 pr-3 text-center text-xs font-semibold text-amber-600">
                  Avail
                </th>
                <th className="pb-2 pr-3 text-center text-xs font-semibold text-teal-600">
                  Sold
                </th>
                <th className="pb-2 pr-3 text-center text-xs font-semibold text-fs-charcoal/50">
                  Total
                </th>
                <th className="pb-2 text-right text-xs font-semibold text-fs-charcoal/50">
                  Avg Price
                </th>
              </tr>
            </thead>
            <tbody>
              {communities
                .filter(
                  (c) =>
                    c.certified > 0 ||
                    c.spec > 0 ||
                    c.model > 0 ||
                    c.available > 0 ||
                    c.sold > 0
                )
                .sort(
                  (a, b) =>
                    b.certified +
                    b.spec +
                    b.model +
                    b.available +
                    b.sold -
                    (a.certified +
                      a.spec +
                      a.model +
                      a.available +
                      a.sold)
                )
                .map((c) => {
                  const total =
                    c.certified +
                    c.spec +
                    c.model +
                    c.available +
                    c.sold;
                  return (
                    <tr
                      key={c.name}
                      className="border-b border-fs-warm-white hover:bg-fs-warm-white"
                    >
                      <td className="py-2 pr-3">
                        <p className="font-medium text-fs-espresso">
                          {c.name}
                        </p>
                        <p className="text-[10px] text-fs-charcoal/40">
                          {c.region}
                        </p>
                      </td>
                      <td className="py-2 pr-3 text-center font-semibold text-emerald-600">
                        {c.certified || "—"}
                      </td>
                      <td className="py-2 pr-3 text-center font-semibold text-sky-600">
                        {c.spec || "—"}
                      </td>
                      <td className="py-2 pr-3 text-center font-semibold text-violet-600">
                        {c.model || "—"}
                      </td>
                      <td className="py-2 pr-3 text-center font-semibold text-amber-600">
                        {c.available || "—"}
                      </td>
                      <td className="py-2 pr-3 text-center font-semibold text-teal-600">
                        {c.sold || "—"}
                      </td>
                      <td className="py-2 pr-3 text-center font-bold text-fs-espresso">
                        {total}
                      </td>
                      <td className="py-2 text-right text-fs-charcoal/70">
                        {c.avgBasePrice > 0
                          ? formatCurrency(
                              c.avgBasePrice + c.avgOptionPrice,
                              true
                            )
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-fs-warm-gray font-bold">
                <td className="pt-2 text-fs-espresso">TOTAL</td>
                <td className="pt-2 text-center text-emerald-600">
                  {totalCertified}
                </td>
                <td className="pt-2 text-center text-sky-600">{totalSpec}</td>
                <td className="pt-2 text-center text-violet-600">
                  {totalModel}
                </td>
                <td className="pt-2 text-center text-amber-600">
                  {totalAvailable}
                </td>
                <td className="pt-2 text-center text-teal-600">
                  {wipSummary.sold}
                </td>
                <td className="pt-2 text-center text-fs-espresso">
                  {totalPipeline}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
