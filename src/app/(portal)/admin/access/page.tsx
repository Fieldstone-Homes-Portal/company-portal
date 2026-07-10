import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessApp, getRoleLabel } from "@/lib/roles";
import { appIcon } from "@/lib/appIcons";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import type { Role } from "@prisma/client";

// Admins first, then managers, then employees — so the "always-on" roles group
// at the top of each app's access list.
const ROLE_RANK: Record<Role, number> = { ADMIN: 0, MANAGER: 1, EMPLOYEE: 2 };
const SECTIONS: { key: string; label: string }[] = [
  { key: "tool", label: "Tools" },
  { key: "dashboard", label: "Dashboards" },
];

function roleTagClass(role: Role): string {
  if (role === "ADMIN") return "bg-fs-copper/15 text-fs-copper";
  if (role === "MANAGER") return "bg-fs-espresso/10 text-fs-espresso";
  return "bg-fs-warm-white text-fs-copper-light";
}

export default async function AdminAccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Admin-only feature.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [apps, users] = await Promise.all([
    prisma.portalApp.findMany({
      where: { isActive: true },
      include: { departments: { select: { id: true, name: true } } },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departments: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalUsers = users.length;

  const accessFor = (app: (typeof apps)[number]) =>
    users
      .filter((u) => canAccessApp({ role: u.role, departments: u.departments }, app))
      .sort(
        (a, b) =>
          ROLE_RANK[a.role] - ROLE_RANK[b.role] ||
          (a.name || a.email).localeCompare(b.name || b.email),
      );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        label="Management"
        title="App Access"
        subtitle="Exactly who can open each tool and dashboard, based on role and department."
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-white p-4 text-sm text-fs-copper shadow-sm ring-1 ring-fs-warm-gray">
        <Shield size={18} className="mt-0.5 shrink-0 text-fs-copper" />
        <p>
          Access is granted by <span className="font-semibold">minimum role</span> plus any{" "}
          <span className="font-semibold">department</span> restriction. Managers and admins can
          open everything (they bypass department limits); employees need a matching department.
          Change access under <span className="font-semibold">Manage Apps</span>,{" "}
          <span className="font-semibold">Manage Users</span>, and{" "}
          <span className="font-semibold">Departments</span>.
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <p className="text-sm text-fs-copper">No active apps yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map(({ key, label }) => {
            const sectionApps = apps.filter((a) => a.section === key);
            if (sectionApps.length === 0) return null;
            return (
              <section key={key}>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
                  {label}
                </h2>
                <div className="space-y-4">
                  {sectionApps.map((app) => {
                    const Icon = appIcon(app.icon);
                    const depts = app.departments.map((d) => d.name);
                    const withAccess = accessFor(app);
                    return (
                      <div
                        key={app.id}
                        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fs-warm-white text-fs-copper">
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display text-lg font-bold text-fs-espresso">
                                {app.name}
                              </h3>
                              <span className="rounded-full bg-fs-warm-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fs-copper">
                                {app.category}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-fs-copper">
                              Min role:{" "}
                              <span className="font-semibold">{getRoleLabel(app.minRole)}</span>
                              {" · "}
                              {depts.length === 0 ? (
                                "Any department"
                              ) : (
                                <>
                                  Departments:{" "}
                                  <span className="font-semibold">{depts.join(", ")}</span>{" "}
                                  <span className="text-fs-copper-light">
                                    (managers &amp; admins bypass)
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-fs-espresso px-3 py-1 text-xs font-semibold text-white">
                            {withAccess.length} / {totalUsers}
                          </span>
                        </div>

                        <div className="mt-4 border-t border-fs-warm-gray pt-3">
                          {withAccess.length === 0 ? (
                            <p className="text-xs text-fs-copper-light">
                              No one currently has access.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {withAccess.map((u) => (
                                <span
                                  key={u.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-fs-warm-white py-1 pl-3 pr-1.5 text-xs text-fs-espresso"
                                  title={u.email}
                                >
                                  {u.name || u.email.split("@")[0]}
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${roleTagClass(u.role)}`}
                                  >
                                    {getRoleLabel(u.role)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
