"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PlanData {
  planName: string;
  planStatus: string;
  planLink: string;
  communityName: string[];
  buildingType: string[];
  planFeatures: string[];
  baseWidth: number | null;
  baseDepth: number | null;
  bedroomCount: number | null;
  bathCount: number | null;
  appraiserLevel1: number | null;
  appraiserLevel2: number | null;
  appraiserTotalFinished: number | null;
  appraiserBasement: number | null;
  appraiserTotalSqFt: number | null;
  appraiserOpenToBelow: number | null;
  appraiserAduOpt: number | null;
  constructionLevel1: number | null;
  constructionLevel2: number | null;
  constructionLevel3: number | null;
  constructionTotal: number | null;
  constructionBasement: number | null;
  storyType: string;
  foundationType: string;
  hasAdu: boolean;
  hasMainMaster: boolean;
}

function formatSqFt(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString() + " SF";
}

function formatDimension(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value + "'";
}

function StatusBadge({ status }: { status: string }) {
  const isActive =
    status.toLowerCase() === "active" || status.toLowerCase() === "current";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        isActive
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {status}
    </span>
  );
}

function SqFtRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 ${
        highlight
          ? "rounded-lg bg-fs-copper/10 px-3 font-semibold text-fs-espresso"
          : "px-3 text-fs-charcoal"
      }`}
    >
      <span className="text-sm">{label}</span>
      <span className={`text-sm tabular-nums ${highlight ? "text-fs-copper" : ""}`}>
        {formatSqFt(value)}
      </span>
    </div>
  );
}

export default function PlanDetail({ planName }: { planName: string }) {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch("/api/plans");
        if (!res.ok) throw new Error("Failed to fetch plans");
        const data = await res.json();
        const plans: PlanData[] = data.plans ?? data;
        const found = plans.find(
          (p) => p.planName.toLowerCase() === planName.toLowerCase()
        );
        if (!found) {
          setError("Plan not found");
        } else {
          setPlan(found);
        }
      } catch {
        setError("Failed to load plan data");
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [planName]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fs-copper border-t-transparent" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-fs-charcoal">{error ?? "Plan not found"}</p>
        <Link
          href="/plans"
          className="mt-4 inline-block text-sm font-medium text-fs-copper hover:underline"
        >
          &larr; Back to Plans
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-fs-copper hover:text-fs-copper-light"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Plans
      </Link>

      {/* Hero header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-fs-espresso via-fs-charcoal to-fs-espresso shadow-lg">
        <div className="relative px-8 py-8">
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="planDetailGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#planDetailGrid)" />
            </svg>
          </div>
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-fs-copper via-fs-copper/60 to-transparent" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fs-copper">
                Floor Plan
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold text-white">
                {plan.planName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {plan.buildingType.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-fs-sand"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
            <StatusBadge status={plan.planStatus} />
          </div>
        </div>
      </div>

      {/* Sq Footage Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Appraiser Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fs-copper">
            Appraiser Square Footage
          </h2>
          <div className="space-y-1">
            <SqFtRow label="Finished SF" value={plan.appraiserTotalFinished} highlight />
            <SqFtRow label="Level 1" value={plan.appraiserLevel1} />
            <SqFtRow label="Level 2" value={plan.appraiserLevel2} />
            <SqFtRow label="Basement" value={plan.appraiserBasement} />
            <SqFtRow label="Open to Below" value={plan.appraiserOpenToBelow} />
            <SqFtRow label="ADU Opt" value={plan.appraiserAduOpt} />
            <div className="my-2 border-t border-border" />
            <SqFtRow label="Total" value={plan.appraiserTotalSqFt} />
          </div>
        </div>

        {/* Construction Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fs-copper">
            Construction Square Footage
          </h2>
          <div className="space-y-1">
            <SqFtRow label="Total" value={plan.constructionTotal} highlight />
            <SqFtRow label="Level 1" value={plan.constructionLevel1} />
            <SqFtRow label="Level 2" value={plan.constructionLevel2} />
            <SqFtRow label="Level 3" value={plan.constructionLevel3} />
            <SqFtRow label="Basement" value={plan.constructionBasement} />
          </div>
        </div>
      </div>

      {/* Specifications Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fs-copper">
          Specifications
        </h2>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <SpecItem label="Base Width" value={formatDimension(plan.baseWidth)} />
          <SpecItem label="Base Depth" value={formatDimension(plan.baseDepth)} />
          <SpecItem label="Bedrooms" value={plan.bedroomCount?.toString() ?? "—"} />
          <SpecItem label="Bathrooms" value={plan.bathCount?.toString() ?? "—"} />
          <SpecItem label="Story Type" value={plan.storyType || "—"} />
          <SpecItem label="Foundation" value={plan.foundationType || "—"} />
          <SpecItem
            label="Building Type"
            value={plan.buildingType.length > 0 ? plan.buildingType.join(", ") : "—"}
          />
          <SpecItem label="Status" value={plan.planStatus || "—"} />
          <SpecItem
            label="Communities"
            value={
              plan.communityName.length > 0
                ? plan.communityName.join(", ")
                : "—"
            }
          />
        </div>
      </div>

      {/* Features */}
      {plan.planFeatures.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fs-copper">
            Features
          </h2>
          <div className="flex flex-wrap gap-2">
            {plan.planFeatures.map((feature) => (
              <span
                key={feature}
                className="rounded-full bg-fs-sand/50 px-3 py-1.5 text-xs font-medium text-fs-espresso"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Plan Documents Link */}
      {plan.planLink && (
        <div className="flex justify-center pb-4">
          <a
            href={plan.planLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-fs-copper px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-fs-copper-light"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Plan Documents
          </a>
        </div>
      )}
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-fs-sage">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-fs-espresso">{value}</dd>
    </div>
  );
}
