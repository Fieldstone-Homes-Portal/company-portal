import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessApp } from "@/lib/roles";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import AppTile from "@/components/AppTile";
import PageHeader from "@/components/PageHeader";

export default async function DashboardsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Dashboards page only shows apps in the "dashboard" section.
  // Include departments so canAccessApp() can apply the dept gate.
  const apps = await prisma.portalApp.findMany({
    where: { isActive: true, section: "dashboard" },
    include: { departments: { select: { id: true, name: true } } },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const visibleApps = apps.filter((app) =>
    canAccessApp(session.user, app),
  );

  const categories = [...new Set(visibleApps.map((app) => app.category))];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        label="Fieldstone Homes"
        title="Dashboards"
        subtitle="Live business intelligence and analytics, surfaced where you work."
      />

      {visibleApps.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-fs-warm-white">
            <BarChart3 size={32} className="text-fs-copper" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-fs-copper">
            Coming Soon
          </p>
          <h2 className="font-display text-2xl font-bold text-fs-espresso">
            Data Dashboards
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-fs-copper">
            We&apos;re building a home for live sales, construction, and
            operations dashboards so you can see what&apos;s happening across
            Fieldstone without leaving Cornerstone. Check back soon.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleApps
                  .filter((app) => app.category === category)
                  .map((app) => (
                    <AppTile
                      key={app.id}
                      id={app.id}
                      name={app.name}
                      description={app.description}
                      icon={app.icon}
                      url={app.url}
                      category={app.category}
                      openIn={app.openIn}
                      departments={app.departments}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
