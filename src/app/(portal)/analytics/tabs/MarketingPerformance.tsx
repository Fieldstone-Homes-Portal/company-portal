"use client";

import {
  Card,
  CardTitle,
  KpiCard,
  MiniBarChart,
  ProgressBar,
  SampleBadge,
  formatCurrency,
} from "../AnalyticsDashboard";
import {
  marketingSpend,
  marketingChannels,
  kpiSummary,
  trafficByMonth,
} from "../dashboardData";

export default function MarketingPerformance() {
  const ytdActualSpend = marketingSpend
    .filter((m) => m.actualSpend > 0)
    .reduce((s, m) => s + m.actualSpend, 0);
  const ytdPlanSpend = marketingSpend
    .slice(0, 4)
    .reduce((s, m) => s + m.planSpend, 0);
  const fullYearPlan = marketingSpend.reduce((s, m) => s + m.planSpend, 0);
  const totalLeads = marketingChannels.reduce((s, c) => s + c.leads, 0);
  const totalChannelSpend = marketingChannels
    .filter((c) => c.spend > 0)
    .reduce((s, c) => s + c.spend, 0);
  const cpl =
    totalChannelSpend > 0 ? totalChannelSpend / totalLeads : 0;
  const cpa =
    ytdActualSpend > 0 ? ytdActualSpend / kpiSummary.ytdCertifiedSales : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="YTD Spend"
          value={formatCurrency(ytdActualSpend, true)}
          subtitle={`of ${formatCurrency(ytdPlanSpend, true)} plan`}
        />
        <KpiCard
          label="Full Year Budget"
          value={formatCurrency(fullYearPlan, true)}
          subtitle="all communities"
        />
        <KpiCard
          label="Cost per Lead"
          value={formatCurrency(cpl)}
          subtitle="paid channels"
          isSample
        />
        <KpiCard
          label="Cost per Acquisition"
          value={formatCurrency(cpa)}
          subtitle="spend / certified sales"
        />
        <KpiCard
          label="YTD Traffic"
          value={`${kpiSummary.ytdTraffic}`}
          subtitle="community visits"
        />
      </div>

      {/* Marketing Spend Chart */}
      <Card>
        <CardTitle>Marketing Spend — Plan vs Actuals (2026)</CardTitle>
        <div className="flex items-end gap-2" style={{ height: 180 }}>
          {marketingSpend.map((m) => {
            const maxVal = Math.max(
              ...marketingSpend.map((x) => Math.max(x.planSpend, x.actualSpend))
            );
            return (
              <div
                key={m.month}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className="flex w-full gap-0.5" style={{ height: 150 }}>
                  {/* Plan bar */}
                  <div className="flex flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t bg-sky-200"
                      style={{
                        height: `${(m.planSpend / maxVal) * 100}%`,
                      }}
                    />
                  </div>
                  {/* Actual bar */}
                  <div className="flex flex-1 flex-col justify-end">
                    <div
                      className={`w-full rounded-t ${m.actualSpend > 0 ? "bg-emerald-400" : "bg-transparent"}`}
                      style={{
                        height: `${(m.actualSpend / maxVal) * 100}%`,
                        minHeight: m.actualSpend > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-fs-charcoal/50">
                  {m.month}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-6 text-[10px] text-fs-charcoal/50">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-sky-200" />
            Plan
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />
            Actuals
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {marketingSpend
            .filter((m) => m.actualSpend > 0)
            .map((m) => (
              <div
                key={m.month}
                className="rounded-lg bg-fs-warm-white px-3 py-2 text-center"
              >
                <p className="text-[10px] font-semibold text-fs-charcoal/40">
                  {m.month}
                </p>
                <p className="text-xs font-bold text-fs-espresso">
                  {formatCurrency(m.actualSpend, true)}
                </p>
                <p className="text-[10px] text-fs-charcoal/40">
                  of {formatCurrency(m.planSpend, true)}
                </p>
              </div>
            ))}
        </div>
      </Card>

      {/* Channel Performance */}
      <Card>
        <CardTitle>
          Channel Performance<SampleBadge />
        </CardTitle>
        <p className="mb-4 text-xs text-orange-500">
          Data below is sample — HubSpot lead source attribution not yet connected
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fs-warm-gray text-left">
                <th className="pb-2 pr-4 text-xs font-semibold text-fs-charcoal/50">
                  Channel
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold text-fs-charcoal/50">
                  Leads
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold text-fs-charcoal/50">
                  Tours
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold text-fs-charcoal/50">
                  Sales
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold text-fs-charcoal/50">
                  Spend
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold text-fs-charcoal/50">
                  CPL
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold text-fs-charcoal/50">
                  CPA
                </th>
                <th className="pb-2 text-right text-xs font-semibold text-fs-charcoal/50">
                  Lead→Sale
                </th>
              </tr>
            </thead>
            <tbody>
              {marketingChannels
                .sort((a, b) => b.sales - a.sales)
                .map((ch) => {
                  const chCpl = ch.spend > 0 ? ch.spend / ch.leads : 0;
                  const chCpa = ch.spend > 0 ? ch.spend / ch.sales : 0;
                  const convRate =
                    ch.leads > 0
                      ? ((ch.sales / ch.leads) * 100).toFixed(1)
                      : "—";
                  return (
                    <tr
                      key={ch.channel}
                      className="border-b border-fs-warm-white"
                    >
                      <td className="py-2.5 pr-4 font-medium text-orange-600">
                        {ch.channel}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-orange-500">
                        {ch.leads}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-orange-500">
                        {ch.tours}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-orange-500">
                        {ch.sales}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-orange-500">
                        {ch.spend > 0 ? formatCurrency(ch.spend, true) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-orange-500">
                        {chCpl > 0 ? formatCurrency(chCpl) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-orange-500">
                        {chCpa > 0 ? formatCurrency(chCpa) : "—"}
                      </td>
                      <td className="py-2.5 text-right text-orange-500">
                        {convRate}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-fs-warm-gray font-bold">
                <td className="pt-2 text-orange-600">TOTAL</td>
                <td className="pt-2 text-right text-orange-500">
                  {totalLeads}
                </td>
                <td className="pt-2 text-right text-orange-500">
                  {marketingChannels.reduce((s, c) => s + c.tours, 0)}
                </td>
                <td className="pt-2 text-right text-orange-500">
                  {marketingChannels.reduce((s, c) => s + c.sales, 0)}
                </td>
                <td className="pt-2 text-right text-orange-500">
                  {formatCurrency(totalChannelSpend, true)}
                </td>
                <td className="pt-2 text-right text-orange-500">
                  {formatCurrency(cpl)}
                </td>
                <td className="pt-2 text-right text-orange-500" />
                <td className="pt-2 text-right text-orange-500">
                  {(
                    (marketingChannels.reduce((s, c) => s + c.sales, 0) /
                      totalLeads) *
                    100
                  ).toFixed(1)}
                  %
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Traffic by Month */}
      <Card>
        <CardTitle>Community Traffic by Month</CardTitle>
        <MiniBarChart
          data={trafficByMonth.map((m) => ({
            label: m.month,
            value: m.count,
          }))}
          height={140}
          barColor="bg-fs-copper"
        />
        <p className="mt-2 text-xs text-fs-charcoal/50">
          May data is partial (month in progress)
        </p>
      </Card>
    </div>
  );
}
