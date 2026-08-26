"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Link2,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Shield,
  BarChart3,
  Megaphone,
  Tags,
} from "lucide-react";
import { Suspense, useState } from "react";
import SidebarTagNav from "@/components/SidebarTagNav";
import type { ToolboxData } from "@/lib/toolboxData";

interface SidebarProps {
  role: string;
  // Async server-rendered slot composed in by the portal layout. Lives
  // above the CORNERSTONE footer tag. Kept generic so we can drop in
  // additional live data points later without re-plumbing the sidebar.
  footerSlot?: React.ReactNode;
  // Access-scoped tag-navigation data (see getToolboxData). Drives the
  // tag nav that replaced the old Toolbox/Dashboards links — tools and
  // dashboards now live in one bucket, navigated by tags.
  toolbox?: ToolboxData;
}

// Home sits above the tag navigation; Links is pinned to the bottom of the
// nav pane (above Management).
const homeItem = { label: "Home", href: "/home", icon: Home };
const linksItem = { label: "Links", href: "/links", icon: Link2 };

// Management links — ADMIN-only, like everything under /admin.
// Access Studio replaced the old Manage Apps / Manage Users / App Access
// pages: apps, access grants, and people are all managed there now.
const managerNav = [
  { label: "Access Studio", href: "/admin/access-studio", icon: Shield },
  { label: "Departments", href: "/admin/departments", icon: Building2 },
  // Navigation tags for the Toolbox (create/rename/merge/delete).
  { label: "Tags", href: "/admin/tags", icon: Tags },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  // Write/edit the "What's New" announcements (auto-seeded on new apps).
  { label: "Release Notes", href: "/admin/releases", icon: Megaphone },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function Sidebar({ role, footerSlot, toolbox }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Management is collapsed by default so the tag navigation gets the room;
  // admins click the header to expand it (starts open on /admin pages).
  const [managementOpen, setManagementOpen] = useState(() =>
    pathname.startsWith("/admin"),
  );
  // The entire Management section is admin-only.
  const isAdmin = role === "ADMIN";

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
            <Link href="/home" className="flex flex-1 items-center">
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

      {/* Navigation — tag nav scrolls in the middle; Links (and Management
          for admins) stay pinned to the bottom of the pane. */}
      <nav className="relative flex min-h-0 flex-1 flex-col p-3">
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {[homeItem].map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
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

          {/* Tag navigation — replaced the old Toolbox/Dashboards links.
              useSearchParams inside needs a Suspense boundary. */}
          {toolbox && (
            <Suspense fallback={null}>
              <SidebarTagNav toolbox={toolbox} collapsed={collapsed} />
            </Suspense>
          )}
        </div>

        <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
          {(() => {
            const active =
              pathname === linksItem.href ||
              pathname.startsWith(linksItem.href + "/");
            return (
              <Link
                href={linksItem.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-fs-sand/70 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? linksItem.label : undefined}
              >
                <linksItem.icon size={18} />
                {!collapsed && linksItem.label}
              </Link>
            );
          })()}

          {isAdmin && (
            <>
            {!collapsed && (
              <button
                type="button"
                onClick={() => setManagementOpen((o) => !o)}
                className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-fs-copper transition-colors hover:text-white"
              >
                Management
                <ChevronDown
                  size={12}
                  className={`transition-transform ${
                    managementOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
            {collapsed && <div className="my-4 border-t border-white/10" />}
            {(managementOpen || collapsed) &&
              managerNav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
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
        </div>
      </nav>

      {/* Live data slot — sits just above the Cornerstone footer tag. */}
      {!collapsed && footerSlot}

      {/* Footer branding — Cornerstone tag with subtle icon */}
      {!collapsed && (
        <div className="relative flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <img
            src="/cornerstone-icon-light.svg"
            alt=""
            aria-hidden="true"
            className="h-5 w-auto opacity-80"
          />
          <p className="text-[10px] font-semibold tracking-[0.2em] text-fs-copper">
            CORNERSTONE
          </p>
        </div>
      )}
    </aside>
  );
}
