"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Boxes, Clock, Flame, LifeBuoy, Star, X } from "lucide-react";
import type { ToolboxData } from "@/lib/toolboxData";
import {
  SMART_COMPANY_HITS,
  SMART_FAVORITES,
  SMART_MOST_USED,
  SMART_TAG_LABELS,
  buildTagSets,
  coOccurringTags,
  filterByTags,
  isSmartKey,
  parseTagsParam,
  restingTagList,
  searchApps,
  toggleKey,
  toolboxHref,
} from "@/lib/toolbox";

/**
 * The tag navigation that lives in the global left sidebar — it replaced the
 * old Toolbox/Dashboards links. Every entry is a link into the unified
 * Toolbox (/dashboard) with the tag toggled in the ?tags= query, so it works
 * from any page and the selection is shareable. Counts follow the current
 * filter + search on the Toolbox itself (co-occurrence: a tag never shows if
 * adding it would yield zero results).
 *
 * All data arrives access-scoped from the server (getToolboxData) — the
 * sidebar can only ever narrow it.
 */
export default function SidebarTagNav({
  toolbox,
  collapsed,
}: {
  toolbox: ToolboxData;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onToolbox = pathname === "/dashboard";
  const selected = useMemo(
    () => (onToolbox ? parseTagsParam(searchParams.get("tags")) : []),
    [onToolbox, searchParams],
  );
  const query = onToolbox ? searchParams.get("q") || "" : "";

  const { apps, favoriteIds, mostUsedIds, companyHitIds, opensByApp } = toolbox;

  const sets = useMemo(
    () =>
      buildTagSets(apps, {
        favorites: new Set(favoriteIds),
        mostUsed: new Set(mostUsedIds),
        companyHits: new Set(companyHitIds),
      }),
    [apps, favoriteIds, mostUsedIds, companyHitIds],
  );
  const opensMap = useMemo(
    () => new Map(Object.entries(opensByApp)),
    [opensByApp],
  );

  const displayNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const app of apps)
      for (const t of app.tags) m.set(t.name, t.displayName);
    return m;
  }, [apps]);
  const labelFor = (key: string) =>
    SMART_TAG_LABELS[key] ?? displayNames.get(key) ?? key;

  // Mirror of the Toolbox grid's pipeline so counts match what's on screen.
  const results = useMemo(
    () => searchApps(filterByTags(apps, selected, sets), query),
    [apps, selected, sets, query],
  );
  const resting = useMemo(
    () => restingTagList(apps, sets, opensMap),
    [apps, sets, opensMap],
  );
  const coOccur = useMemo(
    () => coOccurringTags(results, sets, selected),
    [results, sets, selected],
  );
  const coOccurByKey = useMemo(
    () => new Map(coOccur.map((r) => [r.key, r.count])),
    [coOccur],
  );

  const hasSelection = selected.length > 0;
  // Search narrows the co-occurrence view too — while any filter is active,
  // never offer a tag that would yield zero results.
  const hasFilter = hasSelection || query.trim().length > 0;

  /* -------------------------------- entries ------------------------------ */

  function smartIcon(key: string) {
    if (key === SMART_FAVORITES) return <Star size={15} className="shrink-0" />;
    if (key === SMART_MOST_USED) return <Clock size={15} className="shrink-0" />;
    return <Flame size={15} className="shrink-0" />;
  }

  function entry(key: string, count: number, opts?: { coverage?: boolean }) {
    const active = selected.includes(key);
    return (
      <Link
        key={key}
        href={toolboxHref(toggleKey(selected, key), query)}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-white/15 text-white shadow-sm"
            : "text-fs-sand/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        {isSmartKey(key) && smartIcon(key)}
        <span className="min-w-0 flex-1 truncate">{labelFor(key)}</span>
        {opts?.coverage && (
          <span title="Shown so every tool stays reachable">
            <LifeBuoy size={11} className="text-fs-sand/40" />
          </span>
        )}
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            active ? "bg-white/20 text-white" : "bg-white/10 text-fs-sand/70"
          }`}
        >
          {count}
        </span>
        {active && <X size={11} className="shrink-0 text-white/70" />}
      </Link>
    );
  }

  // Resting: every non-empty entry. Active: pinned selections + only tags
  // that still co-occur with the current results.
  function groupEntries(keys: string[]) {
    return keys
      .map((key) => {
        if (selected.includes(key)) return entry(key, results.length);
        if (!hasFilter) {
          const size = sets.get(key)?.size ?? 0;
          return size > 0 ? entry(key, size) : null;
        }
        const count = coOccurByKey.get(key);
        return count ? entry(key, count) : null;
      })
      .filter((n): n is React.ReactElement => n !== null);
  }

  const publisherEntries = hasFilter
    ? [
        ...selected
          .filter((k) => !isSmartKey(k))
          .map((k) => entry(k, results.length)),
        ...coOccur
          .filter((r) => !isSmartKey(r.key))
          .map((r) => entry(r.key, r.count)),
      ]
    : resting.map((r) => entry(r.key, r.count, { coverage: r.coverage }));

  /* -------------------------------- render ------------------------------- */

  if (collapsed) {
    // Icon rail: one Toolbox icon; tags need the expanded sidebar.
    return (
      <Link
        href="/dashboard"
        title="Toolbox"
        className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          onToolbox
            ? "bg-white/15 text-white shadow-sm"
            : "text-fs-sand/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Boxes size={18} />
      </Link>
    );
  }

  // Personal entries sit right under All Tools; Company Hits leads the tag
  // list below the divider (it behaves like a tag, it's just computed).
  const personalEntries = groupEntries([SMART_FAVORITES, SMART_MOST_USED]);
  const tagEntries = [
    ...groupEntries([SMART_COMPANY_HITS]),
    ...publisherEntries,
  ];

  const allToolsActive = onToolbox && !hasFilter;

  return (
    <div className="mt-4">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-fs-copper">
        Navigation
      </p>
      <div className="space-y-0.5">
        {/* All Tools — the always-available reset back to the full grid. */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            allToolsActive
              ? "bg-white/15 text-white shadow-sm"
              : "text-fs-sand/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Boxes size={15} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">All Tools</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              allToolsActive
                ? "bg-white/20 text-white"
                : "bg-white/10 text-fs-sand/70"
            }`}
          >
            {apps.length}
          </span>
        </Link>
        {personalEntries}
        {/* Appears only while a tag or search filter is active — drops
            everything and lands back on All Tools. */}
        {hasFilter && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-fs-copper transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={15} className="shrink-0" />
            Clear all filters
          </Link>
        )}
      </div>

      {tagEntries.length > 0 && (
        <>
          <div className="mb-1 mt-4 flex items-center gap-2 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fs-copper">
              Tags
            </p>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="space-y-0.5">{tagEntries}</div>
        </>
      )}
    </div>
  );
}
