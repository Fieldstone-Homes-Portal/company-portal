"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

interface Filters {
  search: string;
  lotWidth: string;
  lotDepth: string;
  minSf: string;
  maxSf: string;
  storyTypes: string[];
  buildingTypes: string[];
  minBeds: string;
  minBaths: string;
  foundationTypes: string[];
  hasAdu: boolean;
  hasMainMaster: boolean;
  communities: string[];
  sortBy: string;
}

const INITIAL_FILTERS: Filters = {
  search: "",
  lotWidth: "",
  lotDepth: "",
  minSf: "",
  maxSf: "",
  storyTypes: [],
  buildingTypes: [],
  minBeds: "",
  minBaths: "",
  foundationTypes: [],
  hasAdu: false,
  hasMainMaster: false,
  communities: [],
  sortBy: "planName",
};

const SORT_OPTIONS = [
  { value: "planName", label: "Plan Name" },
  { value: "sqft-asc", label: "Sq Ft (low to high)" },
  { value: "sqft-desc", label: "Sq Ft (high to low)" },
  { value: "beds-desc", label: "Bedrooms (most)" },
  { value: "width-asc", label: "Width (narrowest)" },
];

const FOUNDATION_OPTIONS = ["Basement", "Slab on Grade", "Crawlspace"];
const STORY_OPTIONS = ["Rambler", "2 Story"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function num(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray/60">
      <p className="text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-fs-espresso">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt],
    );
  };

  if (options.length === 0) return null;

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-fs-copper bg-fs-copper text-white"
                  : "border-fs-warm-gray bg-white text-fs-espresso hover:border-fs-copper-light hover:bg-fs-warm-white"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-fs-warm-gray bg-white px-3 py-2 text-sm text-fs-espresso placeholder:text-fs-sage focus:border-fs-copper focus:outline-none focus:ring-2 focus:ring-fs-copper/20"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-fs-espresso">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-fs-warm-gray text-fs-copper focus:ring-fs-copper/30"
      />
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function PlanSearch() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  /* Fetch plan data */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/plans");
        if (!res.ok) throw new Error(`Failed to load plans (${res.status})`);
        const data: PlanData[] = await res.json();
        if (!cancelled) setPlans(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* Derived option lists from data */
  const allBuildingTypes = useMemo(
    () => [...new Set(plans.flatMap((p) => p.buildingType).filter(Boolean))].sort(),
    [plans],
  );
  const allCommunities = useMemo(
    () => [...new Set(plans.flatMap((p) => p.communityName).filter(Boolean))].sort(),
    [plans],
  );

  /* Update helper */
  const set = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) =>
      setFilters((f) => ({ ...f, [key]: value })),
    [],
  );

  /* Filter + sort logic */
  const filtered = useMemo(() => {
    let result = plans;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((p) => p.planName.toLowerCase().includes(q));
    }

    const lotW = num(filters.lotWidth);
    if (lotW != null) {
      result = result.filter((p) => p.baseWidth != null && p.baseWidth <= lotW);
    }

    const lotD = num(filters.lotDepth);
    if (lotD != null) {
      result = result.filter((p) => p.baseDepth != null && p.baseDepth <= lotD);
    }

    const minSf = num(filters.minSf);
    if (minSf != null) {
      result = result.filter(
        (p) => p.appraiserTotalFinished != null && p.appraiserTotalFinished >= minSf,
      );
    }

    const maxSf = num(filters.maxSf);
    if (maxSf != null) {
      result = result.filter(
        (p) => p.appraiserTotalFinished != null && p.appraiserTotalFinished <= maxSf,
      );
    }

    if (filters.storyTypes.length > 0) {
      result = result.filter((p) => filters.storyTypes.includes(p.storyType));
    }

    if (filters.buildingTypes.length > 0) {
      result = result.filter((p) =>
        p.buildingType.some((bt) => filters.buildingTypes.includes(bt)),
      );
    }

    const minBeds = num(filters.minBeds);
    if (minBeds != null) {
      result = result.filter(
        (p) => p.bedroomCount != null && p.bedroomCount >= minBeds,
      );
    }

    const minBaths = num(filters.minBaths);
    if (minBaths != null) {
      result = result.filter(
        (p) => p.bathCount != null && p.bathCount >= minBaths,
      );
    }

    if (filters.foundationTypes.length > 0) {
      result = result.filter((p) =>
        filters.foundationTypes.includes(p.foundationType),
      );
    }

    if (filters.hasAdu) {
      result = result.filter((p) => p.hasAdu);
    }

    if (filters.hasMainMaster) {
      result = result.filter((p) => p.hasMainMaster);
    }

    if (filters.communities.length > 0) {
      result = result.filter((p) =>
        p.communityName.some((c) => filters.communities.includes(c)),
      );
    }

    /* Sort */
    const sorted = [...result];
    switch (filters.sortBy) {
      case "sqft-asc":
        sorted.sort(
          (a, b) => (a.appraiserTotalFinished ?? 0) - (b.appraiserTotalFinished ?? 0),
        );
        break;
      case "sqft-desc":
        sorted.sort(
          (a, b) => (b.appraiserTotalFinished ?? 0) - (a.appraiserTotalFinished ?? 0),
        );
        break;
      case "beds-desc":
        sorted.sort(
          (a, b) => (b.bedroomCount ?? 0) - (a.bedroomCount ?? 0),
        );
        break;
      case "width-asc":
        sorted.sort(
          (a, b) => (a.baseWidth ?? 999) - (b.baseWidth ?? 999),
        );
        break;
      default:
        sorted.sort((a, b) => a.planName.localeCompare(b.planName));
    }

    return sorted;
  }, [plans, filters]);

  /* KPI stats */
  const kpis = useMemo(() => {
    const activePlans = filtered.filter((p) => p.planStatus === "Active");
    const withSf = filtered.filter((p) => p.appraiserTotalFinished != null);
    const avgSf =
      withSf.length > 0
        ? Math.round(
            withSf.reduce((s, p) => s + (p.appraiserTotalFinished ?? 0), 0) /
              withSf.length,
          )
        : 0;
    const communityCount = new Set(filtered.flatMap((p) => p.communityName)).size;
    return {
      found: filtered.length,
      active: activePlans.length,
      avgSf,
      communities: communityCount,
    };
  }, [filtered]);

  const resetFilters = () => setFilters(INITIAL_FILTERS);
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-fs-warm-gray border-t-fs-copper" />
          <p className="text-sm font-medium text-fs-espresso/60">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-fs-warm-gray">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="font-display text-lg font-bold text-fs-espresso">Unable to load plans</h2>
        <p className="mt-1 text-sm text-fs-copper">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* ---- Sidebar filters ---- */}
      <aside className="w-72 shrink-0">
        <div className="sticky top-6 space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray/60">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-fs-espresso">
              Filters
            </h2>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-medium text-fs-copper hover:text-fs-copper-light"
              >
                Reset
              </button>
            )}
          </div>

          {/* Search */}
          <FilterInput
            label="Plan Name"
            value={filters.search}
            onChange={(v) => set("search", v)}
            placeholder="Search plans..."
          />

          {/* Lot fit */}
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
              Lot Fit (max)
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <FilterInput
                label="Width"
                type="number"
                value={filters.lotWidth}
                onChange={(v) => set("lotWidth", v)}
                placeholder="ft"
              />
              <FilterInput
                label="Depth"
                type="number"
                value={filters.lotDepth}
                onChange={(v) => set("lotDepth", v)}
                placeholder="ft"
              />
            </div>
          </fieldset>

          {/* Sq footage range */}
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
              Total Finished SF
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <FilterInput
                label="Min"
                type="number"
                value={filters.minSf}
                onChange={(v) => set("minSf", v)}
                placeholder="0"
              />
              <FilterInput
                label="Max"
                type="number"
                value={filters.maxSf}
                onChange={(v) => set("maxSf", v)}
                placeholder="Any"
              />
            </div>
          </fieldset>

          {/* Story type */}
          <MultiSelect
            label="Story Type"
            options={STORY_OPTIONS}
            selected={filters.storyTypes}
            onChange={(v) => set("storyTypes", v)}
          />

          {/* Building type */}
          <MultiSelect
            label="Building Type"
            options={allBuildingTypes}
            selected={filters.buildingTypes}
            onChange={(v) => set("buildingTypes", v)}
          />

          {/* Bed / Bath */}
          <div className="grid grid-cols-2 gap-2">
            <FilterInput
              label="Min Beds"
              type="number"
              value={filters.minBeds}
              onChange={(v) => set("minBeds", v)}
              placeholder="Any"
            />
            <FilterInput
              label="Min Baths"
              type="number"
              value={filters.minBaths}
              onChange={(v) => set("minBaths", v)}
              placeholder="Any"
            />
          </div>

          {/* Foundation */}
          <MultiSelect
            label="Foundation"
            options={FOUNDATION_OPTIONS}
            selected={filters.foundationTypes}
            onChange={(v) => set("foundationTypes", v)}
          />

          {/* Checkboxes */}
          <div className="space-y-2 border-t border-fs-warm-gray/40 pt-4">
            <Checkbox
              label="ADU Available"
              checked={filters.hasAdu}
              onChange={(v) => set("hasAdu", v)}
            />
            <Checkbox
              label="Main Level Master"
              checked={filters.hasMainMaster}
              onChange={(v) => set("hasMainMaster", v)}
            />
          </div>

          {/* Community */}
          <MultiSelect
            label="Community"
            options={allCommunities}
            selected={filters.communities}
            onChange={(v) => set("communities", v)}
          />

          {/* Sort */}
          <label className="block border-t border-fs-warm-gray/40 pt-4">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
              Sort By
            </span>
            <select
              value={filters.sortBy}
              onChange={(e) => set("sortBy", e.target.value)}
              className="w-full rounded-lg border border-fs-warm-gray bg-white px-3 py-2 text-sm text-fs-espresso focus:border-fs-copper focus:outline-none focus:ring-2 focus:ring-fs-copper/20"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <div className="min-w-0 flex-1">
        {/* KPI cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Plans Found" value={kpis.found} />
          <KpiCard label="Active Plans" value={kpis.active} />
          <KpiCard label="Avg Finished SF" value={fmt(kpis.avgSf)} />
          <KpiCard label="Communities" value={kpis.communities} />
        </div>

        {/* Results table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-fs-warm-gray/60">
          {filtered.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <p className="font-display text-lg font-bold text-fs-espresso">
                No plans match your filters
              </p>
              <p className="mt-1 text-sm text-fs-copper">
                Try adjusting or resetting your filter criteria.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-4 rounded-lg bg-fs-copper px-4 py-2 text-sm font-medium text-white hover:bg-fs-copper-light"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-fs-warm-gray/60 bg-fs-warm-white/60">
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      Plan Name
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      W&times;D
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      Finished SF
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      Story
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      Type
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      Bed/Bath
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      Foundation
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      ADU
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      Sales
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fs-espresso/70">
                      {/* Actions */}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fs-warm-gray/40">
                  {filtered.map((plan) => (
                    <tr
                      key={plan.planName}
                      className="transition-colors hover:bg-fs-warm-white/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/plans/${encodeURIComponent(plan.planName)}`}
                          className="font-medium text-fs-espresso hover:text-fs-copper"
                        >
                          {plan.planName}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-fs-charcoal">
                        {plan.baseWidth != null && plan.baseDepth != null
                          ? `${plan.baseWidth}′×${plan.baseDepth}′`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-fs-charcoal">
                        {fmt(plan.appraiserTotalFinished)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-fs-charcoal">
                        {plan.storyType || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-fs-charcoal">
                        {plan.buildingType.length > 0
                          ? plan.buildingType.join(", ")
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-fs-charcoal">
                        {plan.bedroomCount != null || plan.bathCount != null
                          ? `${plan.bedroomCount ?? "—"} / ${plan.bathCount ?? "—"}`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-fs-charcoal">
                        {plan.foundationType || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {plan.hasAdu ? (
                          <svg
                            className="mx-auto h-5 w-5 text-success"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        ) : (
                          <span className="text-fs-sage">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-fs-sage">
                        —
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {plan.planLink ? (
                          <a
                            href={plan.planLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-fs-copper hover:text-fs-copper-light"
                          >
                            View Plan
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                              />
                            </svg>
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Result count footer */}
        {filtered.length > 0 && (
          <p className="mt-3 text-right text-xs text-fs-sage">
            Showing {filtered.length} of {plans.length} plans
          </p>
        )}
      </div>
    </div>
  );
}
