"use client";

import Link from "next/link";
import { appIcon } from "@/lib/appIcons";
import StageBadge from "@/components/StageBadge";

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
}: AppTileProps) {
  const Icon = appIcon(icon);
  const restricted = departments.length > 0;

  const content = (
    <div className="group flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray transition-all hover:shadow-md hover:ring-fs-copper/30">
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
            <span className="rounded-full bg-fs-warm-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fs-copper">
              {category}
            </span>
          </div>
          <StageBadge stage={stage} />
        </div>
      </div>
      <h3 className="font-display text-lg font-bold text-fs-espresso">
        {name}
      </h3>
      {description && (
        <p className="mt-1 line-clamp-2 text-sm text-fs-copper">
          {description}
        </p>
      )}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
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
