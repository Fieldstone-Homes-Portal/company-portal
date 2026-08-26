"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { appIcon } from "@/lib/appIcons";
import StageBadge, { stageMeta } from "@/components/StageBadge";

interface AppTileProps {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  url: string;
  category: string;
  openIn: string;
  // Lifecycle stage (AppStage enum). Non-DEPLOYED stages show a badge so
  // users can tell an app's maturity before clicking. Informational only.
  stage?: string;
  // When non-empty, the app is restricted to these departments —
  // a subtle "Restricted: X, Y" badge appears at the bottom of the tile.
  departments?: { id: string; name: string }[];
  // True for apps registered within the last NEW_APP_WINDOW_DAYS —
  // shows a copper "New" badge next to the category chip.
  isNew?: boolean;
  // Publisher tags on the app. When provided (the Toolbox), tag chips
  // replace the legacy category chip and are clickable filters. Pages that
  // don't pass tags (e.g. /dashboards) keep the category chip unchanged.
  tags?: { name: string; displayName: string }[];
  // Toggles the tag in the Toolbox filter state. Chips render as plain
  // labels when omitted.
  onTagClick?: (tagName: string) => void;
  // Filter keys currently active — matching chips render highlighted.
  selectedTags?: string[];
  // Favorites star. The star only renders when onToggleFavorite is provided
  // (i.e. on the Toolbox); existing pages are untouched.
  favorited?: boolean;
  onToggleFavorite?: (appId: string) => void;
}

export default function AppTile({
  id,
  name,
  description,
  icon,
  category,
  openIn,
  stage = "DEPLOYED",
  departments = [],
  isNew = false,
  tags,
  onTagClick,
  selectedTags = [],
  favorited = false,
  onToggleFavorite,
}: AppTileProps) {
  const Icon = appIcon(icon);
  const restricted = departments.length > 0;
  // Stage-colored accent bar across the top of the tile — a not-yet-deployed
  // flag that reads at a glance. DEPLOYED has no bar (mature is the norm).
  const stageBar = stageMeta(stage).bar;
  const showTags = tags !== undefined;

  const content = (
    // h-64 pins every tile to the same size regardless of content — name and
    // description are clamped below, and mt-auto keeps the footer on the
    // bottom edge, so short tiles and full tiles render identically.
    <div className="group relative flex h-64 flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray transition-all hover:shadow-md hover:ring-fs-copper/30">
      {stageBar && (
        <div className={`absolute inset-x-0 top-0 h-1 ${stageBar}`} />
      )}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fs-warm-white text-fs-copper transition-colors group-hover:bg-fs-espresso group-hover:text-white">
          <Icon size={24} />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            {isNew && (
              <span className="rounded-full bg-fs-copper px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                New
              </span>
            )}
            {!showTags && (
              <span className="rounded-full bg-fs-warm-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fs-copper">
                {category}
              </span>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
                title={favorited ? "Remove from favorites" : "Add to favorites"}
                onClick={(e) => {
                  // The whole tile is a link — keep the star from opening it.
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(id);
                }}
                className={`rounded-full p-1 transition-colors ${
                  favorited
                    ? "text-fs-copper"
                    : "text-fs-warm-gray hover:text-fs-copper"
                }`}
              >
                <Star
                  size={16}
                  fill={favorited ? "currentColor" : "none"}
                  strokeWidth={2}
                />
              </button>
            )}
          </div>
          <StageBadge stage={stage} />
        </div>
      </div>
      <h3 className="line-clamp-2 font-display text-lg font-bold text-fs-espresso">
        {name}
      </h3>
      {description && (
        <p className="mt-1 line-clamp-2 text-sm text-fs-copper">
          {description}
        </p>
      )}
      {showTags && tags.length > 0 && (
        // Single row pinned above the footer; overflow beyond 2 chips is
        // summarized as "+N" so tall tag lists never blow the h-64 tile.
        <div className="mt-auto flex items-center gap-1.5 overflow-hidden pt-3">
          {tags.slice(0, 2).map((tag) => {
            const active = selectedTags.includes(tag.name);
            const chipClass = `shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              active
                ? "bg-fs-espresso text-white"
                : "bg-fs-warm-white text-fs-copper hover:bg-fs-espresso hover:text-white"
            }`;
            return onTagClick ? (
              <button
                key={tag.name}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick(tag.name);
                }}
                className={chipClass}
              >
                {tag.displayName}
              </button>
            ) : (
              <span key={tag.name} className={chipClass}>
                {tag.displayName}
              </span>
            );
          })}
          {tags.length > 2 && (
            <span
              className="shrink-0 text-[10px] font-semibold text-fs-copper-light"
              title={tags.slice(2).map((t) => t.displayName).join(", ")}
            >
              +{tags.length - 2}
            </span>
          )}
        </div>
      )}
      <div
        className={`${
          showTags && tags.length > 0 ? "" : "mt-auto"
        } flex items-end justify-between gap-3 pt-3`}
      >
        <span className="inline-flex items-center text-xs font-semibold text-fs-copper group-hover:text-fs-espresso">
          Open app &rarr;
        </span>
        {restricted && (
          <span
            title={`Restricted to: ${departments.map((d) => d.name).join(", ")}`}
            className="rounded-full bg-fs-espresso/5 px-2 py-0.5 text-[10px] font-medium text-fs-espresso/70 ring-1 ring-fs-espresso/10"
          >
            {departments.length === 1
              ? departments[0].name
              : `${departments.length} departments`}
          </span>
        )}
      </div>
    </div>
  );

  if (openIn === "external") {
    return (
      <a href={`/apps/${id}`} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={`/apps/${id}`}>{content}</Link>;
}
