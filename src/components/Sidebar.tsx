"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  Settings,
  Users,
  AppWindow,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  role: string;
}

const employeeNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Links", href: "/links", icon: Link2 },
];

const managerNav = [
  { label: "Manage Apps", href: "/admin/apps", icon: AppWindow },
  { label: "Manage Users", href: "/admin/users", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isManager = role === "MANAGER" || role === "ADMIN";

  return (
    <aside
      className={`flex flex-col border-r border-fs-warm-gray bg-gradient-to-b from-white to-fs-sand/30 transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo area */}
      <div className="flex h-16 items-center justify-between border-b border-fs-warm-gray px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/fieldstone-logo.png"
              alt="Fieldstone Homes"
              className="h-8 w-auto"
            />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fs-espresso">
              <span className="text-sm font-bold text-white">F</span>
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-fs-sage hover:bg-fs-sand hover:text-fs-espresso"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-fs-sage">
            Main
          </p>
        )}
        {employeeNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-fs-espresso text-white shadow-sm"
                  : "text-fs-charcoal hover:bg-fs-sand hover:text-fs-espresso"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              {!collapsed && item.label}
            </Link>
          );
        })}

        {isManager && (
          <>
            {!collapsed && (
              <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-fs-sage">
                Management
              </p>
            )}
            {collapsed && <div className="my-4 border-t border-fs-warm-gray" />}
            {managerNav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-fs-espresso text-white shadow-sm"
                      : "text-fs-charcoal hover:bg-fs-sand hover:text-fs-espresso"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer branding */}
      {!collapsed && (
        <div className="border-t border-fs-warm-gray px-4 py-3">
          <p className="text-[10px] font-medium tracking-wide text-fs-sage">
            EMPLOYEE PORTAL
          </p>
        </div>
      )}
    </aside>
  );
}
