import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import AppTile from "@/components/AppTile";
import PageHeader from "@/components/PageHeader";
import type { Role } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const apps = await prisma.portalApp.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const visibleApps = apps.filter((app) =>
    hasMinRole(session.user.role, app.minRole)
  );

  const categories = [
    ...new Set(visibleApps.map((app) => app.category)),
  ];

  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Denver" })
  ).getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        label="Fieldstone Homes"
        title={`${greeting}, ${firstName}`}
        subtitle="Your tools and resources are ready below."
      />

      {visibleApps.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fs-warm-white">
            <svg
              className="h-8 w-8 text-fs-copper"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h2 className="font-display text-lg font-bold text-fs-espresso">
            No apps yet
          </h2>
          <p className="mt-1 text-sm text-fs-copper">
            Apps will appear here once a manager adds them to the portal.
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
