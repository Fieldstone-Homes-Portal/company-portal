"use client";

import { useMemo, useState } from "react";
import { Search, Shield, ShieldCheck, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import DepartmentMultiSelect from "@/components/DepartmentMultiSelect";
import { getRoleLabel } from "@/lib/roles";
import type { Role } from "@prisma/client";

interface Department {
  id: string;
  name: string;
}

interface PortalUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  department: string | null; // legacy single text field (preserved)
  departments: Department[];
  createdAt: string | Date;
}

const ROLE_ICONS: Record<string, typeof User> = {
  EMPLOYEE: User,
  MANAGER: Shield,
  ADMIN: ShieldCheck,
};

export default function UserManager({
  initialUsers,
  allDepartments,
  currentUserId,
}: {
  initialUsers: PortalUser[];
  allDepartments: Department[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Client-side filter over the already-loaded list. Matches name, email,
  // role, and department names so the search box covers every visible field.
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [
        u.name ?? "",
        u.email,
        getRoleLabel(u.role as Role),
        ...u.departments.map((d) => d.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query]);

  async function updateRole(userId: string, role: string) {
    setSaving(userId);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(users.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      router.refresh();
    }
    setSaving(null);
  }

  async function updateDepartments(userId: string, departmentIds: string[]) {
    // Optimistic update so the multi-select chips feel snappy
    const optimisticDepts = allDepartments.filter((d) =>
      departmentIds.includes(d.id),
    );
    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, departments: optimisticDepts } : u,
      ),
    );
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentIds }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(users.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
    }
  }

  return (
    <div className="space-y-3">
      {/* Search + count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fs-copper-light"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, role, or department…"
            className="w-full rounded-xl border border-fs-warm-gray bg-white py-2 pl-9 pr-9 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-fs-copper-light transition-colors hover:bg-fs-warm-white hover:text-fs-copper"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <p className="shrink-0 text-sm text-fs-copper">
          {query ? (
            <>
              <span className="font-semibold text-fs-espresso">
                {filteredUsers.length}
              </span>{" "}
              of {users.length} {users.length === 1 ? "user" : "users"}
            </>
          ) : (
            <>
              <span className="font-semibold text-fs-espresso">
                {users.length}
              </span>{" "}
              {users.length === 1 ? "user" : "users"}
            </>
          )}
        </p>
      </div>

      {filteredUsers.map((user) => {
        const Icon = ROLE_ICONS[user.role] || User;
        const isCurrentUser = user.id === currentUserId;
        const selectedIds = user.departments.map((d) => d.id);

        return (
          <div
            key={user.id}
            className="rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-fs-warm-gray"
          >
            <div className="grid gap-4 lg:grid-cols-[1.4fr_2fr_1fr_0.7fr] lg:items-start">
              {/* Identity */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fs-warm-white text-fs-copper">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fs-espresso">
                    {user.name || "—"}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs text-fs-copper">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-fs-copper">{user.email}</p>
                </div>
              </div>

              {/* Departments multi-select */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-fs-copper-light">
                  Departments
                </label>
                <DepartmentMultiSelect
                  allDepartments={allDepartments}
                  selectedIds={selectedIds}
                  onChange={(ids) => updateDepartments(user.id, ids)}
                  emptyLabel="No departments — can't access dept-restricted apps."
                  placeholder="Assign departments…"
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-fs-copper-light">
                  Role
                </label>
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  disabled={isCurrentUser || saving === user.id}
                  className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-3 py-2 text-sm text-fs-espresso focus:border-fs-copper focus:outline-none disabled:opacity-50"
                  title={
                    isCurrentUser
                      ? "You can't change your own role."
                      : undefined
                  }
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Joined date */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-fs-copper-light">
                  Joined
                </label>
                <p className="text-sm text-fs-copper">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {users.length === 0 && (
        <p className="py-8 text-center text-sm text-fs-copper">
          No users have signed in yet.
        </p>
      )}

      {users.length > 0 && filteredUsers.length === 0 && (
        <p className="py-8 text-center text-sm text-fs-copper">
          No users match &ldquo;{query}&rdquo;.
        </p>
      )}

      <div className="rounded-xl bg-fs-warm-white p-4 text-xs text-fs-copper">
        <p>
          <strong>Note:</strong> Users appear here after their first sign-in via
          Microsoft SSO. You can&apos;t add users manually — they must
          authenticate with their @fieldstonehomes.com account first, then you
          can assign their role and departments. Department changes save as you
          edit; role changes save when you pick a new value.
        </p>
      </div>
    </div>
  );
}
