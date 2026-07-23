"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { appIcon } from "@/lib/appIcons";
import type { WhatsNewItem } from "@/lib/releaseNotes";

function NoteCard({
  item,
  onOpen,
}: {
  item: WhatsNewItem;
  onOpen: () => void;
}) {
  const Icon = appIcon(item.appIcon);
  // Clicking a card only expands the note — never jumps to the app.
  // Navigation lives on the explicit "Open app" button in the modal.
  return (
    <button
      onClick={onOpen}
      className="group flex h-full w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-fs-warm-gray transition-all hover:shadow-md hover:ring-fs-copper/30"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fs-warm-white text-fs-copper transition-colors group-hover:bg-fs-espresso group-hover:text-white">
        {item.appName ? <Icon size={22} /> : <Sparkles size={22} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-fs-espresso group-hover:text-fs-copper">
            {item.title}
          </p>
          {item.kind === "new-app" && (
            <span className="shrink-0 rounded-full bg-fs-copper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              New
            </span>
          )}
        </div>
        {item.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-fs-copper">
            {item.body}
          </p>
        )}
        <p className="mt-1 text-xs text-fs-copper-light">{item.dateLabel}</p>
      </div>
    </button>
  );
}

export default function WhatsNewSection({ items }: { items: WhatsNewItem[] }) {
  const [open, setOpen] = useState<WhatsNewItem | null>(null);

  // Close on Escape and lock background scroll while the modal is open —
  // same behavior as the All Staff announcement modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Nothing published yet → keep the Home page clean rather than showing
  // an empty shell.
  if (items.length === 0) return null;

  const OpenIcon = open ? appIcon(open.appIcon) : Sparkles;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-fs-copper" />
          <h2 className="font-display text-xl font-bold text-fs-espresso">
            What&apos;s new
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <NoteCard key={item.id} item={item} onOpen={() => setOpen(item)} />
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fs-espresso/40 p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-fs-warm-gray px-6 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fs-warm-white text-fs-copper">
                  {open.appName ? <OpenIcon size={22} /> : <Sparkles size={22} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-bold leading-snug text-fs-espresso">
                      {open.title}
                    </h3>
                    {open.kind === "new-app" && (
                      <span className="shrink-0 rounded-full bg-fs-copper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-fs-copper">
                    {open.appName ? `${open.appName} · ` : ""}
                    {open.dateLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-fs-copper transition-colors hover:bg-fs-warm-white hover:text-fs-espresso"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto whitespace-pre-line px-6 py-5 text-sm leading-relaxed text-fs-charcoal">
              {open.body || "(No further details.)"}
            </div>
            {open.appHref && (
              <div className="flex justify-end border-t border-fs-warm-gray px-6 py-4">
                <Link
                  href={open.appHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-fs-espresso px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fs-copper"
                >
                  Open {open.appName ?? "app"}
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
