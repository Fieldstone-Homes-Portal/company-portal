"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Users, AppWindow } from "lucide-react";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  description: string | null;
  _count?: { users: number; apps: number };
}

export default function DepartmentManager({
  initialDepartments,
}: {
  initialDepartments: Department[];
}) {
  const [departments, setDepartments] = useState(initialDepartments);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({ name: "", description: "" });

  function resetForm() {
    setForm({ name: "", description: "" });
    setEditing(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(dept: Department) {
    setForm({ name: dept.name, description: dept.description || "" });
    setEditing(dept.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/departments/${editing}` : "/api/departments";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      if (editing) {
        setDepartments(
          departments.map((d) => (d.id === editing ? { ...d, ...data } : d)),
        );
      } else {
        setDepartments([...departments, data]);
      }
      resetForm();
      router.refresh();
    } else {
      setError(data.error || "Something went wrong.");
    }
    setSaving(false);
  }

  async function handleDelete(dept: Department) {
    const used = (dept._count?.users || 0) + (dept._count?.apps || 0);
    const confirmMsg =
      used > 0
        ? `Delete "${dept.name}"? ${dept._count?.users || 0} user(s) and ${
            dept._count?.apps || 0
          } app(s) will lose this department.`
        : `Delete "${dept.name}"?`;
    if (!confirm(confirmMsg)) return;
    const res = await fetch(`/api/departments/${dept.id}`, { method: "DELETE" });
    if (res.ok) {
      setDepartments(departments.filter((d) => d.id !== dept.id));
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
        Add Department
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-fs-espresso">
              {editing ? "Edit Department" : "New Department"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1 text-fs-copper hover:bg-fs-warm-gray"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
                placeholder="Construction"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Description
              </label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
                placeholder="Field operations, superintendents, trades."
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-700">{error}</p>
          )}

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
              {saving ? "Saving..." : editing ? "Update" : "Add Department"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray"
          >
            <div>
              <h3 className="font-display font-bold text-fs-espresso">
                {dept.name}
              </h3>
              {dept.description && (
                <p className="mt-0.5 text-sm text-fs-copper">
                  {dept.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4 text-xs text-fs-copper-light">
                <span className="inline-flex items-center gap-1">
                  <Users size={12} />
                  {dept._count?.users || 0} user{dept._count?.users === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <AppWindow size={12} />
                  {dept._count?.apps || 0} app{dept._count?.apps === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => startEdit(dept)}
                className="rounded-lg p-2 text-fs-copper hover:bg-fs-warm-gray"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(dept)}
                className="rounded-lg p-2 text-danger hover:bg-danger/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <p className="py-8 text-center text-sm text-fs-copper">
            No departments yet. Click &quot;Add Department&quot; to get started.
          </p>
        )}
      </div>
    </div>
  );
}
