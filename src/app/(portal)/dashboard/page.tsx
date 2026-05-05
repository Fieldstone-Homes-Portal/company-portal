import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import AppTile from "@/components/AppTile";
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

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Branded welcome banner */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-fs-espresso via-fs-charcoal to-fs-espresso shadow-lg">
        <div className="relative px-8 py-8">
          {/* Decorative pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          {/* Decorative accent line */}
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-fs-copper via-fs-copper/60 to-transparent" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fs-copper">
              Fieldstone Homes
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white">
              {greeting}, {session.user.name?.split(" ")[0] || "there"}
            </h1>
            <p className="mt-2 text-sm font-light text-fs-sand">
              Your tools and resources are ready below.
            </p>
          </div>
        </div>
      </div>

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
