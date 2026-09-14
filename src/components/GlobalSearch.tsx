"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, X, ArrowUpRight } from "lucide-react";
import { searchApps } from "@/lib/toolbox";
import type { ToolboxApp } from "@/lib/toolboxData";

export default function GlobalSearch({ apps }: { apps: ToolboxApp[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  const results = searchApps(apps, query);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); input.current?.focus(); setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", shortcut);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", shortcut);
    };
  }, []);
  useEffect(() => {
    if (open) document.getElementById(`app-search-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  return (
    <div ref={root} className="relative w-full max-w-xl" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
    }}>
      <Search size={18} className="pointer-events-none absolute left-3 top-3 text-fs-copper" />
      <input ref={input} role="combobox" aria-label="Search all apps" aria-expanded={open}
        aria-controls="app-search-results" aria-autocomplete="list"
        aria-activedescendant={open && results.length ? `app-search-${active}` : undefined}
        autoComplete="off" placeholder="Search all apps…" value={query}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault(); setOpen(true);
            setActive((i) => results.length ? (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length : 0);
          }
          if (e.key === "Enter" && open && results[active]) {
            e.preventDefault(); document.getElementById(`app-search-link-${active}`)?.click();
          }
        }}
        className="h-10 w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white pl-10 pr-14 text-sm text-fs-espresso outline-none focus:border-fs-copper focus:ring-2 focus:ring-fs-copper/20" />
      {query ? <button aria-label="Clear app search" onClick={() => {setQuery("");setActive(0);input.current?.focus();}}
        className="absolute right-3 top-2.5 text-fs-copper"><X size={18}/></button>
        : <span className="pointer-events-none absolute right-3 top-3 text-xs text-fs-copper-light">⌘ K</span>}
      {open && <button tabIndex={-1} aria-label="Close app search" onClick={() => setOpen(false)} className="fixed inset-x-0 bottom-0 top-16 -z-10 bg-black/10" />}
      {open && <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-fs-warm-gray bg-white shadow-2xl">
        <div className="border-b border-fs-warm-gray px-4 py-3 text-xs text-fs-copper" role="status">
          {query.trim() ? `${results.length} matching apps` : "Your apps · type to search names, descriptions, and tags"}
        </div>
        <ul id="app-search-results" role="listbox" aria-label="App results" className="max-h-[60vh] overflow-y-auto p-2">
          {results.map((app, i) => <li key={app.id} id={`app-search-${i}`} role="option" aria-selected={i === active}>
            <Link id={`app-search-link-${i}`} href={`/apps/${app.id}`} onClick={() => setOpen(false)}
              onMouseEnter={() => setActive(i)} className={`flex items-center gap-3 rounded-xl p-3 ${i === active ? "bg-fs-warm-white" : "hover:bg-fs-warm-white"}`}>
              <div className="min-w-0 flex-1"><p className="font-semibold text-fs-espresso">{app.name}{apps.find(a => a.id === app.id)?.isActive === false && <span className="ml-2 text-xs font-normal text-fs-copper">Archived</span>}</p>
              <p className="truncate text-xs text-fs-copper">{app.description || "Open app"}</p></div><ArrowUpRight size={16} className="shrink-0 text-fs-copper"/>
            </Link>
          </li>)}
          {!results.length && <li className="px-4 py-8 text-center text-sm text-fs-copper">No apps found. Try a shorter name or another keyword.</li>}
        </ul>
        <div className="border-t border-fs-warm-gray px-4 py-2 text-xs text-fs-copper-light">↑ ↓ to browse · Enter to open · Esc to close</div>
      </div>}
    </div>
  );
}
