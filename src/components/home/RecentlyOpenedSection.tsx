import Link from "next/link";
import { ArrowRight, ExternalLink, Clock } from "lucide-react";
import { appIcon } from "@/lib/appIcons";
import TrackedLink from "@/components/TrackedLink";
import type { RecentItem } from "@/lib/recentOpens";

function CardInner({ item }: { item: RecentItem }) {
  const Icon = item.kind === "app" ? appIcon(item.icon) : null;
  return (
    <div className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-fs-warm-gray transition-all hover:shadow-md hover:ring-fs-copper/30">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fs-warm-white text-fs-copper transition-colors group-hover:bg-fs-espresso group-hover:text-white">
        {Icon ? <Icon size={22} /> : <span className="text-xl leading-none">{item.icon}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fs-espresso group-hover:text-fs-copper">
          {item.label}
        </p>
        <p className="text-xs text-fs-copper-light">
          {item.external ? "Link" : "Tool"}
        </p>
      </div>
      {item.external ? (
        <ExternalLink size={14} className="shrink-0 text-fs-copper-light opacity-0 transition-opacity group-hover:opacity-100" />
      ) : (
        <ArrowRight size={14} className="shrink-0 text-fs-copper-light opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );
}

export default function RecentlyOpenedSection({ items }: { items: RecentItem[] }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Clock size={16} className="text-fs-copper" />
        <h2 className="font-display text-xl font-bold text-fs-espresso">Jump back in</h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <p className="text-sm text-fs-copper">
            The tools and links you open will show up here for quick access.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/dashboard" className="font-semibold text-fs-copper hover:text-fs-espresso">
              Browse the Toolbox
            </Link>
            <span className="mx-2 text-fs-warm-gray">·</span>
            <Link href="/links" className="font-semibold text-fs-copper hover:text-fs-espresso">
              See company links
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) =>
            item.external ? (
              <TrackedLink key={`${item.kind}:${item.href}`} href={item.href} trackId={item.href}>
                <CardInner item={item} />
              </TrackedLink>
            ) : (
              <Link key={`${item.kind}:${item.href}`} href={item.href}>
                <CardInner item={item} />
              </Link>
            ),
          )}
        </div>
      )}
    </section>
  );
}
