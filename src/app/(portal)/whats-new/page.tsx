import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { appIcon } from "@/lib/appIcons";
import { getWhatsNew } from "@/lib/releaseNotes";

export default async function WhatsNewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // The full feed — same resolver the Home page uses, just deeper.
  const items = await getWhatsNew(session.user, 50);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        label="Cornerstone"
        title="What's New"
        subtitle="Recently added apps and notable updates across the portal."
      />

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fs-warm-white">
            <Sparkles size={28} className="text-fs-copper" />
          </div>
          <h2 className="font-display text-lg font-bold text-fs-espresso">
            Nothing yet
          </h2>
          <p className="mt-1 text-sm text-fs-copper">
            New apps and updates will be announced here as they roll out.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = appIcon(item.appIcon);
            return (
              <div
                key={item.id}
                className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fs-warm-white text-fs-copper">
                  {item.appName ? <Icon size={22} /> : <Sparkles size={22} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold text-fs-espresso">
                      {item.title}
                    </h3>
                    {item.kind === "new-app" && (
                      <span className="rounded-full bg-fs-copper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        New
                      </span>
                    )}
                    <span className="text-xs text-fs-copper-light">
                      {item.dateLabel}
                    </span>
                  </div>
                  {item.body && (
                    <p className="mt-1 whitespace-pre-line text-sm text-fs-copper">
                      {item.body}
                    </p>
                  )}
                  {item.appHref && (
                    <Link
                      href={item.appHref}
                      className="mt-2 inline-flex items-center text-xs font-semibold text-fs-copper hover:text-fs-espresso"
                    >
                      Open {item.appName} &rarr;
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
