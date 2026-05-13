"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Megaphone,
  Building2,
  Layers,
  Users,
} from "lucide-react";
import ExecutiveOverview from "./tabs/ExecutiveOverview";
import SalesPerformance from "./tabs/SalesPerformance";
import MarketingPerformance from "./tabs/MarketingPerformance";
import CommunityView from "./tabs/CommunityView";
import PipelineInventory from "./tabs/PipelineInventory";

const tabs = [
  { id: "executive", label: "Executive Overview", icon: BarChart3 },
  { id: "sales", label: "Sales Performance", icon: TrendingUp },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "communities", label: "Communities", icon: Building2 },
  { id: "pipeline", label: "Pipeline & Inventory", icon: Layers },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("executive");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-fs-warm-gray">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-fs-espresso text-white shadow-sm"
                  : "text-fs-charcoal/70 hover:bg-fs-warm-white hover:text-fs-espresso"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sample Data Legend */}
      <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-2 text-xs text-orange-700 ring-1 ring-orange-200">
        <span className="inline-block h-3 w-3 rounded-sm bg-orange-400" />
        <span>
          <strong>Orange-highlighted</strong> values indicate sample data — real
          data source not yet connected
        </span>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "executive" && <ExecutiveOverview />}
        {activeTab === "sales" && <SalesPerformance />}
        {activeTab === "marketing" && <MarketingPerformance />}
        {activeTab === "communities" && <CommunityView />}
        {activeTab === "pipeline" && <PipelineInventory />}
      </div>
    </div>
  );
}

// Shared card components used across tabs
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`mb-4 text-sm font-semibold uppercase tracking-wide text-fs-charcoal/60 ${className}`}
    >
      {children}
    </h3>
  );
}

export function KpiCard({
  label,
  value,
  subtitle,
  trend,
  trendDirection,
  isSample,
}: {
  label: string;
  value: string;
  subtitle?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  isSample?: boolean;
}) {
  const trendColor =
    trendDirection === "up"
      ? "text-emerald-600"
      : trendDirection === "down"
        ? "text-red-600"
        : "text-fs-charcoal/50";
  const trendIcon =
    trendDirection === "up" ? "↗" : trendDirection === "down" ? "↘" : "→";

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-fs-charcoal/50">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-3xl font-bold ${isSample ? "text-orange-500" : "text-fs-espresso"}`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-fs-charcoal/50">{subtitle}</p>
      )}
      {trend && (
        <p className={`mt-2 text-sm font-semibold ${trendColor}`}>
          {trendIcon} {trend}
        </p>
      )}
    </Card>
  );
}

export function SampleBadge() {
  return (
    <span className="ml-2 inline-block rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-600">
      Sample
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  isSample,
  showLabel = true,
}: {
  value: number;
  max: number;
  isSample?: boolean;
  showLabel?: boolean;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const overPlan = value > max;
  const barColor = isSample
    ? "bg-orange-400"
    : overPlan
      ? "bg-emerald-500"
      : pct >= 70
        ? "bg-fs-copper"
        : pct >= 40
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-fs-warm-white">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[3rem] text-right text-xs font-semibold text-fs-charcoal/70">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

export function MiniBarChart({
  data,
  height = 120,
  barColor = "bg-fs-copper",
  planColor = "text-fs-charcoal/40",
  isSample,
}: {
  data: { label: string; value: number; plan?: number }[];
  height?: number;
  barColor?: string;
  planColor?: string;
  isSample?: boolean;
}) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.value, d.plan || 0)), 1);
  const effectiveBarColor = isSample ? "bg-orange-400" : barColor;

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-fs-charcoal/70">
            {d.value > 0 ? d.value : ""}
          </span>
          <div className="relative flex w-full justify-center" style={{ height: height - 30 }}>
            {d.plan !== undefined && d.plan > 0 && (
              <div
                className="absolute w-full border-t-2 border-dashed border-fs-charcoal/20"
                style={{ bottom: `${(d.plan / maxVal) * 100}%` }}
              />
            )}
            <div
              className={`w-5/6 rounded-t ${effectiveBarColor} transition-all`}
              style={{
                height: `${(d.value / maxVal) * 100}%`,
                minHeight: d.value > 0 ? 4 : 0,
              }}
            />
          </div>
          <span className="text-[9px] text-fs-charcoal/50">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function formatCurrency(n: number, compact = false): string {
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
