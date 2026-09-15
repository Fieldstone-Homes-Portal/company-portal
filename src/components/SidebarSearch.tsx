"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { parseTagsParam, toolboxHref } from "@/lib/toolbox";

/**
 * Always-on search, pinned above the tag navigation so it never scrolls away.
 *
 * It writes the same ?q= state the Toolbox's own box does (see toolboxHref),
 * so the two stay in lockstep and a search is shareable. Matching is handled
 * downstream by searchApps — name, description, and tags, tokenized — which is
 * why this component only has to move the query into the URL.
 *
 * From anywhere other than the Toolbox this is a real navigation: the first
 * keystroke pushes to /dashboard, and every keystroke after that replaces, so
 * typing one query leaves one history entry instead of one per character. The
 * sidebar lives in the portal layout and doesn't unmount across that
 * navigation, so focus survives it.
 */
export default function SidebarSearch({
  collapsed,
  onExpand,
}: {
  collapsed: boolean;
  onExpand: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onToolbox = pathname === "/dashboard";
  // Tags only mean anything on the Toolbox. Searching from Home starts clean
  // rather than inheriting a filter the user can't see from where they are.
  const selected = onToolbox ? parseTagsParam(searchParams.get("tags")) : [];
  const urlQuery = onToolbox ? searchParams.get("q") || "" : "";

  // Local state for instant keystrokes, debounced into the URL. Back/forward
  // (or landing on a page with no ?q=) re-syncs the box — same
  // adjust-state-during-render pattern the Toolbox box uses, no effect needed.
  const [query, setQuery] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(next: string) {
    const href = toolboxHref(selected, next);
    if (onToolbox) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  function onQueryChange(next: string) {
    setQuery(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => navigate(next), 250);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (debounce.current) clearTimeout(debounce.current);
      navigate(query);
    } else if (e.key === "Escape" && query) {
      onQueryChange("");
    }
  }

  // Icon rail: the input has nowhere to go, so the button reopens the sidebar
  // and the user lands on a focused field.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onExpand}
        title="Search tools"
        aria-label="Search tools"
        className="mb-2 flex items-center justify-center rounded-xl px-3 py-2.5 text-fs-sand/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <div className="relative mb-3">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fs-sand/50"
      />
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
        type="search"
        placeholder="Search tools…"
        aria-label="Search tools by name, description, or tag"
        className="w-full rounded-xl border border-white/10 bg-white/10 py-2 pl-9 pr-8 text-sm text-white placeholder:text-fs-sand/50 focus:border-fs-copper focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fs-copper"
      />
      {query && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-fs-sand/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
