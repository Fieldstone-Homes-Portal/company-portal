"use client";

import { useState } from "react";
import { Shield, ShieldCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import DepartmentMultiSelect from "@/components/DepartmentMultiSelect";

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
  const router = useRouter();

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
      {users.map((user) => {
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
