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
  salesVsPlan,
  closingsVsPlan,
  startsVsPlan,
  trafficByMonth,
  cancellationsByMonth,
  kpiSummary,
  communities,
  qtdRevenue,
  wipSummary,
} from "../dashboardData";

export default function ExecutiveOverview() {
  const ytdSalesActual = kpiSummary.ytdCertifiedSales;
  const ytdSalesPlan = kpiSummary.ytdPlanSales;
  const salesPacePct = Math.round((ytdSalesActual / ytdSalesPlan) * 100);
  const fullYearPlan = salesVsPlan.reduce((s, m) => s + m.plan, 0);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard
          label="YTD Certified Sales"
          value={`${ytdSalesActual}`}
          subtitle={`of ${ytdSalesPlan} plan (${salesPacePct}%)`}
        />
        <KpiCard
          label="YTD Closings"
          value={`${kpiSummary.ytdClosings}`}
          subtitle={`of ${kpiSummary.ytdPlanClosings} plan`}
        />
        <KpiCard
          label="YTD Starts"
          value={`${kpiSummary.ytdStarts}`}
          subtitle={`of ${kpiSummary.ytdPlanStarts} plan`}
        />
        <KpiCard
          label="YTD Traffic"
          value={`${kpiSummary.ytdTraffic}`}
          subtitle="community visits"
        />
        <KpiCard
          label="Cancellation Rate"
          value={`${kpiSummary.cancellationRate}%`}
          subtitle={`${kpiSummary.ytdCancellations} cancellations`}
          trend="Low"
          trendDirection="up"
        />
        <KpiCard
          label="Lots in WIP"
          value={`${kpiSummary.lotsInWip}`}
          subtitle={`${kpiSummary.qmiPercentage}% QMI`}
        />
      </div>

      {/* Preferred Lender / Realtor / Concessions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-fs-charcoal/50">
            Preferred Lender<SampleBadge />
          </p>
          <p className="mt-1 text-[10px] text-fs-charcoal/40">
            By Closing Date 90 Day
          </p>
          <p className="mt-2 font-display text-5xl font-bold text-orange-500">
            {kpiSummary.preferredLenderPct}%
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">
            ↗ {kpiSummary.preferredLenderTrend}%
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-fs-charcoal/50">
            Realtor Co-op<SampleBadge />
          </p>
          <p className="mt-1 text-[10px] text-fs-charcoal/40">
            By Certified Date 90 Day
          </p>
          <p className="mt-2 font-display text-5xl font-bold text-orange-500">
            {kpiSummary.realtorCoopPct}%
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">
            ↗ {kpiSummary.realtorCoopTrend}%
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-fs-charcoal/50">
            Avg Concessions<SampleBadge />
          </p>
          <p className="mt-1 text-[10px] text-fs-charcoal/40">
            By Certified Date 90 Days
          </p>
          <p className="mt-2 font-display text-5xl font-bold text-orange-500">
            {formatCurrency(kpiSummary.avgConcessions, true)}
          </p>
          <p className="mt-1 text-sm font-semibold text-red-600">
            ↘ {kpiSummary.concessionsTrend}%
          </p>
        </Card>
      </div>

      {/* Sales vs Plan / Starts vs Plan / Closings vs Plan */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Sales vs Plan</CardTitle>
          <MiniBarChart
            data={salesVsPlan.map((m) => ({
              label: m.month,
              value: m.actual,
              plan: m.plan,
            }))}
            height={140}
            barColor="bg-emerald-400"
          />
          <div className="mt-3 flex items-center gap-4 text-[10px] text-fs-charcoal/50">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />
              Actual
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 border-t-2 border-dashed border-fs-charcoal/20" />
              Plan
            </span>
          </div>
          <div className="mt-2 flex justify-between rounded-lg bg-fs-warm-white px-3 py-2 text-xs">
            <span className="text-fs-charcoal/60">Full Year</span>
            <span className="font-semibold text-fs-espresso">
              {ytdSalesActual} / {fullYearPlan}
            </span>
          </div>
        </Card>
        <Card>
          <CardTitle>Starts vs Plan</CardTitle>
          <MiniBarChart
            data={startsVsPlan.map((m) => ({
              label: m.month,
              value: m.actual,
              plan: m.plan,
            }))}
            height={140}
            barColor="bg-sky-400"
          />
          <div className="mt-3 flex items-center gap-4 text-[10px] text-fs-charcoal/50">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-sky-400" />
              Actual
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 border-t-2 border-dashed border-fs-charcoal/20" />
              Plan
            </span>
          </div>
          <div className="mt-2 flex justify-between rounded-lg bg-fs-warm-white px-3 py-2 text-xs">
            <span className="text-fs-charcoal/60">Full Year</span>
            <span className="font-semibold text-fs-espresso">
              {kpiSummary.ytdStarts} / {startsVsPlan.reduce((s, m) => s + m.plan, 0)}
            </span>
          </div>
        </Card>
        <Card>
          <CardTitle>Closings vs Plan</CardTitle>
          <MiniBarChart
            data={closingsVsPlan.map((m) => ({
              label: m.month,
              value: m.actual,
              plan: m.plan,
            }))}
            height={140}
            barColor="bg-violet-400"
          />
          <div className="mt-3 flex items-center gap-4 text-[10px] text-fs-charcoal/50">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-violet-400" />
              Actual
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 border-t-2 border-dashed border-fs-charcoal/20" />
              Plan
            </span>
          </div>
          <div className="mt-2 flex justify-between rounded-lg bg-fs-warm-white px-3 py-2 text-xs">
            <span className="text-fs-charcoal/60">Full Year</span>
            <span className="font-semibold text-fs-espresso">
              {kpiSummary.ytdClosings} / {closingsVsPlan.reduce((s, m) => s + m.plan, 0)}
            </span>
          </div>
        </Card>
      </div>

      {/* Traffic + Cancellations row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Monthly Traffic</CardTitle>
          <MiniBarChart
            data={trafficByMonth.map((m) => ({
              label: m.month,
              value: m.count,
            }))}
            height={120}
            barColor="bg-fs-copper"
          />
        </Card>
        <Card>
          <CardTitle>Cancellations by Month</CardTitle>
          <MiniBarChart
            data={cancellationsByMonth.map((m) => ({
              label: m.month,
              value: m.count,
            }))}
            height={120}
            barColor="bg-red-400"
          />
          <p className="mt-2 text-xs text-fs-charcoal/50">
            YTD Cancellation Rate: <strong>{kpiSummary.cancellationRate}%</strong> ({kpiSummary.ytdCancellations} of {ytdSalesActual} gross sales)
          </p>
        </Card>
      </div>

      {/* WIP Report + QTD Revenue */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>WIP Report</CardTitle>
          <div className="space-y-3">
            {[
              { label: "Certified", value: wipSummary.certified },
              { label: "Spec", value: wipSummary.spec },
              { label: "Model", value: wipSummary.model },
              { label: "Available", value: wipSummary.available },
              { label: "Dirt Sale", value: wipSummary.dirtSale },
              { label: "Sold", value: wipSummary.sold },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg bg-fs-warm-white px-3 py-2"
              >
                <span className="text-sm text-fs-charcoal/70">{row.label}</span>
                <span className="text-sm font-bold text-fs-espresso">
                  {row.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-fs-warm-gray pt-2">
              <span className="text-sm font-semibold text-fs-espresso">
                Total in WIP
              </span>
              <span className="text-lg font-bold text-fs-espresso">
                {kpiSummary.lotsInWip}
              </span>
            </div>
          </div>
        </Card>
        <div className="lg:col-span-2">
          <Card>
            <CardTitle>
              QTD Revenue through End of Last Month
              <SampleBadge />
            </CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fs-warm-gray text-left">
                    <th className="pb-2 pr-4 text-xs font-semibold text-fs-charcoal/50">
                      Community
                    </th>
                    <th className="pb-2 pr-4 text-right text-xs font-semibold text-fs-charcoal/50">
                      Budget Total
                    </th>
                    <th className="pb-2 pr-4 text-right text-xs font-semibold text-fs-charcoal/50">
                      Actuals Total
                    </th>
                    <th className="pb-2 text-right text-xs font-semibold text-fs-charcoal/50">
                      Variance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {qtdRevenue.map((row) => (
                    <tr
                      key={row.community}
                      className="border-b border-fs-warm-white"
                    >
                      <td className="py-2 pr-4 font-medium text-orange-600">
                        {row.community}
                      </td>
                      <td className="py-2 pr-4 text-right text-orange-500">
                        {formatCurrency(row.budgetTotal)}
                      </td>
                      <td className="py-2 pr-4 text-right text-orange-500">
                        {formatCurrency(row.actualsTotal)}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          row.variance >= 0
                            ? "text-orange-500"
                            : "text-orange-500"
                        }`}
                      >
                        {row.variance >= 0 ? "" : "("}
                        {formatCurrency(Math.abs(row.variance))}
                        {row.variance < 0 ? ")" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-fs-warm-gray font-bold">
                    <td className="pt-2 pr-4 text-orange-600">GRAND TOTAL</td>
                    <td className="pt-2 pr-4 text-right text-orange-500">
                      {formatCurrency(
                        qtdRevenue.reduce((s, r) => s + r.budgetTotal, 0)
                      )}
                    </td>
                    <td className="pt-2 pr-4 text-right text-orange-500">
                      {formatCurrency(
                        qtdRevenue.reduce((s, r) => s + r.actualsTotal, 0)
                      )}
                    </td>
                    <td className="pt-2 text-right text-orange-500">
                      {formatCurrency(
                        qtdRevenue.reduce((s, r) => s + r.variance, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
