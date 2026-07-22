import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { appIcon } from "@/lib/appIcons";
import type { WhatsNewItem } from "@/lib/releaseNotes";

function NoteCard({ item }: { item: WhatsNewItem }) {
  const Icon = appIcon(item.appIcon);
  const inner = (
    <div className="group flex h-full items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-fs-warm-gray transition-all hover:shadow-md hover:ring-fs-copper/30">
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
      {item.appHref && (
        <ArrowRight
          size={14}
          className="mt-1 shrink-0 text-fs-copper-light opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}
    </div>
  );

  // Cards for apps the viewer can open link straight to the app; the rest
  // (general notes, inaccessible apps) are plain announcement cards.
  return item.appHref ? <Link href={item.appHref}>{inner}</Link> : inner;
}

export default function WhatsNewSection({ items }: { items: WhatsNewItem[] }) {
  // Nothing published yet → keep the Home page clean rather than showing
  // an empty shell.
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-fs-copper" />
          <h2 className="font-display text-xl font-bold text-fs-espresso">
            What&apos;s new
          </h2>
        </div>
        <Link
          href="/whats-new"
          className="text-xs font-semibold text-fs-copper hover:text-fs-espresso"
        >
          View all &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <NoteCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
