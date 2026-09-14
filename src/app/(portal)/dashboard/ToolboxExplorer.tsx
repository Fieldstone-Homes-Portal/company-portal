"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Boxes, X } from "lucide-react";
import AppTile from "@/components/AppTile";
import type { ToolboxApp } from "@/lib/toolboxData";
import {
  SMART_TAG_LABELS,
  buildTagSets,
  filterByTags,
  parseTagsParam,
  searchApps,
  selectionHeading,
  toggleKey,
  toolboxHref,
} from "@/lib/toolbox";

/**
 * The unified Toolbox grid: every app the user can access (tools AND
 * dashboards — one bucket), filtered by the tag selection in the URL
 * (?tags=a,b) and the search box. The tag sidebar itself lives in the
 * global left nav (SidebarTagNav); this component renders the header,
 * search, and tiles, and toggles the same URL state from tile chips.
 *
 * Everything is computed client-side over data the server already scoped
 * to the current user's accessible apps.
 */

interface ExplorerApp extends ToolboxApp {
  isNew: boolean;
}

interface ToolboxExplorerProps {
  apps: ExplorerApp[];
  favoriteIds: string[];
  mostUsedIds: string[];
  companyHitIds: string[];
}

export default function ToolboxExplorer({
  apps,
  favoriteIds,
  mostUsedIds,
  companyHitIds,
}: ToolboxExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selection lives in the URL — the sidebar, tile chips, and the clear
  // button all read and write the same ?tags= state.
  const selected = useMemo(
    () => parseTagsParam(searchParams.get("tags")),
    [searchParams],
  );
  const urlQuery = searchParams.get("q") || "";

  const query = urlQuery;

  // Favorites are optimistic; router.refresh() re-syncs the sidebar counts.
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(favoriteIds),
  );

  const mostUsed = useMemo(() => new Set(mostUsedIds), [mostUsedIds]);
  const companyHits = useMemo(() => new Set(companyHitIds), [companyHitIds]);
  const sets = useMemo(
    () => buildTagSets(apps, { favorites, mostUsed, companyHits }),
    [apps, favorites, mostUsed, companyHits],
  );

  const displayNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const app of apps)
      for (const t of app.tags) m.set(t.name, t.displayName);
    return m;
  }, [apps]);
  const labelFor = (key: string) =>
    SMART_TAG_LABELS[key] ?? displayNames.get(key) ?? key;

  // Filter pipeline: tags (AND) → search (AND across words, cross-field).
  const results = useMemo(() => {
    const afterTags = filterByTags(apps, selected, sets);
    return searchApps(afterTags, query);
  }, [apps, selected, sets, query]);

  const hasSelection = selected.length > 0;
  const hasAnyFilter = hasSelection || query.trim().length > 0;

  function toggleTag(key: string) {
    router.push(toolboxHref(toggleKey(selected, key), query), {
      scroll: false,
    });
  }

  function clearFilters() {
    router.push("/dashboard", { scroll: false });
  }

  async function toggleFavorite(appId: string) {
    // Optimistic flip; revert if the request fails.
    const was = favorites.has(appId);
    setFavorites((f) => {
      const next = new Set(f);
      if (was) next.delete(appId);
      else next.add(appId);
      return next;
    });
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });
      if (!res.ok) throw new Error();
      // Re-fetch server data so the sidebar's Favorites count follows.
      router.refresh();
    } catch {
      setFavorites((f) => {
        const next = new Set(f);
        if (was) next.add(appId);
        else next.delete(appId);
        return next;
      });
    }
  }

  const heading = hasSelection
    ? selectionHeading(selected, labelFor)
    : "All tools";

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold text-fs-espresso">
          {heading}
        </h2>
        <span className="text-sm text-fs-copper">
          {hasAnyFilter
            ? `${results.length} of ${apps.length} tools`
            : `${apps.length} tools`}
        </span>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full bg-fs-warm-gray/50 px-3 py-1 text-xs font-semibold text-fs-espresso transition-colors hover:bg-fs-warm-gray"
          >
            <X size={12} />
            Clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fs-warm-white">
            <Boxes size={32} className="text-fs-copper" />
          </div>
          <h2 className="font-display text-lg font-bold text-fs-espresso">
            {apps.length === 0
              ? "No apps yet"
              : "Nothing matches that combination"}
          </h2>
          <p className="mt-1 text-sm text-fs-copper">
            {apps.length === 0
              ? "Apps will appear here once an admin adds them to the portal."
              : "Try removing a tag or simplifying your search."}
          </p>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-full bg-fs-espresso px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-fs-copper"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((app) => {
            const a = app as ExplorerApp;
            return (
              <AppTile
                key={a.id}
                id={a.id}
                name={a.name}
                description={a.description}
                icon={a.icon}
                url={a.url}
                category=""
                openIn={a.openIn}
                stage={a.stage}
                departments={a.departments}
                isNew={a.isNew}
                isActive={a.isActive}
                tags={a.tags}
                onTagClick={toggleTag}
                selectedTags={selected}
                favorited={favorites.has(a.id)}
                onToggleFavorite={toggleFavorite}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
