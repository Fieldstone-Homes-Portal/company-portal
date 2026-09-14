"use client";

import { LogOut, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import GlobalSearch from "./GlobalSearch";
import type { ToolboxApp } from "@/lib/toolboxData";

interface HeaderProps {
  apps: ToolboxApp[];
  user: {
    name: string | null;
    email: string;
    role: string;
    image: string | null;
  };
}

export default function Header({ user, apps }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const roleLabel =
    user.role === "ADMIN"
      ? "Admin"
      : user.role === "MANAGER"
        ? "Manager"
        : "Employee";

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-fs-warm-gray bg-white px-6">
      <GlobalSearch apps={apps} />
      <div className="relative shrink-0" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 rounded-full px-3 py-1.5 transition-colors hover:bg-fs-warm-gray"
        >
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-fs-espresso">
              {user.name || user.email.split("@")[0]}
            </p>
            <p className="flex items-center gap-1 text-xs text-fs-copper">
              {(user.role === "MANAGER" || user.role === "ADMIN") && (
                <Shield size={10} />
              )}
              {roleLabel}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fs-espresso text-sm font-semibold text-white">
            {(user.name || user.email)[0].toUpperCase()}
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white p-2 shadow-lg ring-1 ring-fs-warm-gray">
            <div className="border-b border-fs-warm-gray px-3 py-2">
              <p className="text-sm font-medium text-fs-espresso">
                {user.name}
              </p>
              <p className="text-xs text-fs-copper">{user.email}</p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fs-copper transition-colors hover:bg-fs-warm-gray hover:text-fs-espresso"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
