"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import DepartmentMultiSelect from "@/components/DepartmentMultiSelect";
// Stage is read-only here (the chip on each row). Editing the lifecycle
// stage lives in Access Studio — the pipeline control on each app card.
import StageBadge from "@/components/StageBadge";

interface Department {
  id: string;
  name: string;
}

interface App {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  url: string;
  minRole: string;
  category: string;
  section: string;
  sortOrder: number;
  isActive: boolean;
  openIn: string;
  stage: string;
  departments?: Department[];
}

const ICONS = [
  "map",
  "chart",
  "file",
  "tool",
  "globe",
  "calculator",
  "users",
  "briefcase",
];
const ROLES = ["EMPLOYEE", "MANAGER", "ADMIN"];
const OPEN_MODES = ["iframe", "external"];
// Which area of the portal the app shows up in.
const SECTIONS = [
  { value: "tool",      label: "Toolbox" },
  { value: "dashboard", label: "Dashboards" },
];

export default function AppManager({
  initialApps,
  allDepartments,
}: {
  initialApps: App[];
  allDepartments: Department[];
}) {
  const [apps, setApps] = useState(initialApps);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const blankForm = {
    name: "",
    description: "",
    icon: "tool",
    url: "",
    minRole: "EMPLOYEE",
    category: "general",
    section: "tool",
    sortOrder: 0,
    openIn: "iframe",
    departmentIds: [] as string[],
  };
  const [form, setForm] = useState(blankForm);

  function resetForm() {
    setForm(blankForm);
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(app: App) {
    setForm({
      name: app.name,
      description: app.description || "",
      icon: app.icon || "tool",
      url: app.url,
      minRole: app.minRole,
      category: app.category,
      section: app.section || "tool",
      sortOrder: app.sortOrder,
      openIn: app.openIn,
      departmentIds: (app.departments || []).map((d) => d.id),
    });
    setEditing(app.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/apps/${editing}` : "/api/apps";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const updated = await res.json();
      if (editing) {
        setApps(apps.map((a) => (a.id === editing ? updated : a)));
      } else {
        setApps([...apps, updated]);
      }
      resetForm();
      router.refresh();
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this app from the portal?")) return;
    const res = await fetch(`/api/apps/${id}`, { method: "DELETE" });
    if (res.ok) {
      setApps(apps.filter((a) => a.id !== id));
      router.refresh();
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/apps/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setApps(apps.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a)));
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="flex items-center gap-2 rounded-full bg-fs-espresso px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fs-copper"
      >
        <Plus size={16} />
        Add App
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-fs-espresso">
              {editing ? "Edit App" : "New App"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1 text-fs-copper hover:bg-fs-warm-gray"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                App Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
                placeholder="Plat Studio"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                URL *
              </label>
              <input
                required
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
                placeholder="https://plat-studio.railway.app"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Description
              </label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
                placeholder="Interactive lot mapping tool for subdivision plats"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Icon
              </label>
              <select
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
              >
                {ICONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Category
              </label>
              <input
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
                placeholder="tools"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Minimum Role
              </label>
              <select
                value={form.minRole}
                onChange={(e) =>
                  setForm({ ...form, minRole: e.target.value })
                }
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Open Mode
              </label>
              <select
                value={form.openIn}
                onChange={(e) =>
                  setForm({ ...form, openIn: e.target.value })
                }
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
              >
                {OPEN_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m === "iframe" ? "Embedded (iframe)" : "New tab"}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Section <span className="text-fs-copper-light">— which page in the portal it lives on</span>
              </label>
              <select
                value={form.section}
                onChange={(e) =>
                  setForm({ ...form, section: e.target.value })
                }
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
              >
                {SECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Department restriction <span className="text-fs-copper-light">— leave empty for no restriction</span>
              </label>
              <DepartmentMultiSelect
                allDepartments={allDepartments}
                selectedIds={form.departmentIds}
                onChange={(ids) => setForm({ ...form, departmentIds: ids })}
                emptyLabel="No restriction — anyone meeting the role gate can access."
                placeholder="Select departments…"
              />
              <p className="mt-1.5 text-xs text-fs-copper-light">
                Managers and employees need at least one matching department. Only admins bypass.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full px-5 py-2 text-sm font-medium text-fs-copper hover:bg-fs-warm-gray"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-fs-espresso px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-fs-copper disabled:opacity-50"
            >
              <Check size={14} />
              {saving ? "Saving..." : editing ? "Update" : "Add App"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {apps.map((app) => (
          <div
            key={app.id}
            className={`flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray ${
              !app.isActive ? "opacity-50" : ""
            }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-display font-bold text-fs-espresso">
                  {app.name}
                </h3>
                <span className="rounded-full bg-fs-warm-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fs-copper">
                  {app.minRole.toLowerCase()}
                </span>
                <span className="rounded-full bg-fs-espresso/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fs-espresso">
                  {app.section === "dashboard" ? "Dashboards" : "Toolbox"}
                </span>
                <StageBadge stage={app.stage} showDeployed />
                {!app.isActive && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                    Disabled
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-fs-copper">
                {app.description || app.url}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleToggle(app.id, app.isActive)}
                className="rounded-lg p-2 text-fs-copper hover:bg-fs-warm-gray"
                title={app.isActive ? "Disable" : "Enable"}
              >
                {app.isActive ? <Power size={16} /> : <PowerOff size={16} />}
              </button>
              <button
                onClick={() => startEdit(app)}
                className="rounded-lg p-2 text-fs-copper hover:bg-fs-warm-gray"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(app.id)}
                className="rounded-lg p-2 text-danger hover:bg-danger/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {apps.length === 0 && (
          <p className="py-8 text-center text-sm text-fs-copper">
            No apps registered yet. Click &quot;Add App&quot; to get started.
          </p>
        )}
      </div>
    </div>
  );
}
