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
  BarChart3,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  role: string;
}

const employeeNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
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
      className={`relative flex flex-col overflow-hidden bg-gradient-to-br from-fs-espresso via-fs-charcoal to-fs-espresso transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Decorative grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sidebarGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sidebarGrid)" />
        </svg>
      </div>

      {/* Copper accent line on the right edge */}
      <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-fs-copper via-fs-copper/40 to-transparent" />

      {/* Logo area */}
      <div className="relative flex h-16 items-center border-b border-white/10 px-4">
        {!collapsed ? (
          <>
            <Link href="/dashboard" className="flex flex-1 items-center">
              <img
                src="/fieldstone-logo-white.png"
                alt="Fieldstone Homes"
                className="h-8 w-auto"
              />
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-2 rounded-lg p-1.5 text-fs-sand/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mx-auto rounded-lg p-1.5 text-fs-sand/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 space-y-1 p-3">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-fs-copper">
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
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-fs-sand/70 hover:bg-white/10 hover:text-white"
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
              <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-fs-copper">
                Management
              </p>
            )}
            {collapsed && <div className="my-4 border-t border-white/10" />}
            {managerNav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-fs-sand/70 hover:bg-white/10 hover:text-white"
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
        <div className="relative border-t border-white/10 px-4 py-3">
          <p className="text-[10px] font-medium tracking-[0.2em] text-fs-copper">
            EMPLOYEE PORTAL
          </p>
        </div>
      )}
    </aside>
  );
}
