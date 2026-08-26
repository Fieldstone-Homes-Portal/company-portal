"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AppWindow,
  Merge,
  Star,
  Clock,
  Flame,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { slugifyTag } from "@/lib/toolbox";

interface Tag {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
  appCount: number;
  apps: { id: string; name: string }[];
}

export default function TagManager({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState(initialTags);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [merging, setMerging] = useState<Tag | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({ displayName: "", name: "", sortOrder: 0 });

  function resetForm() {
    setForm({ displayName: "", name: "", sortOrder: 0 });
    setEditing(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(tag: Tag) {
    setForm({
      displayName: tag.displayName,
      name: tag.name,
      sortOrder: tag.sortOrder,
    });
    setEditing(tag.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/tags/${editing}` : "/api/tags";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      const row: Tag = {
        id: data.id,
        name: data.name,
        displayName: data.displayName,
        sortOrder: data.sortOrder,
        appCount: data._count?.apps ?? 0,
        apps: editing ? tags.find((t) => t.id === editing)?.apps || [] : [],
      };
      if (editing) {
        setTags(tags.map((t) => (t.id === editing ? { ...t, ...row } : t)));
      } else {
        setTags([...tags, row]);
      }
      resetForm();
      router.refresh();
    } else {
      setError(data.error || "Something went wrong.");
    }
    setSaving(false);
  }

  async function handleDelete(tag: Tag) {
    const confirmMsg =
      tag.appCount > 0
        ? `Delete "${tag.displayName}"? It will be removed from ${tag.appCount} app(s). Apps themselves are untouched.`
        : `Delete "${tag.displayName}"?`;
    if (!confirm(confirmMsg)) return;
    const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    if (res.ok) {
      setTags(tags.filter((t) => t.id !== tag.id));
      router.refresh();
    }
  }

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault();
    if (!merging || !mergeTarget) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/tags/${merging.id}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intoId: mergeTarget }),
    });
    const data = await res.json();
    if (res.ok) {
      setTags(
        tags
          .filter((t) => t.id !== merging.id)
          .map((t) =>
            t.id === mergeTarget
              ? { ...t, appCount: data._count?.apps ?? t.appCount }
              : t,
          ),
      );
      setMerging(null);
      setMergeTarget("");
      router.refresh();
    } else {
      setError(data.error || "Merge failed.");
    }
    setSaving(false);
  }

  const inputClass =
    "w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper";

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
        Add Tag
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-fs-espresso">
              {editing ? "Edit Tag" : "New Tag"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1 text-fs-copper hover:bg-fs-warm-gray"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Display name *
              </label>
              <input
                required
                value={form.displayName}
                onChange={(e) => {
                  const displayName = e.target.value;
                  setForm((f) => ({
                    ...f,
                    displayName,
                    // Keep the slug following the display name until the
                    // admin edits the slug field directly.
                    name:
                      !editing && f.name === slugifyTag(f.displayName)
                        ? slugifyTag(displayName)
                        : f.name,
                  }));
                }}
                className={inputClass}
                placeholder="Construction"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Slug
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="construction"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Sort order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                }
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

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
              {saving ? "Saving..." : editing ? "Update" : "Add Tag"}
            </button>
          </div>
        </form>
      )}

      {merging && (
        <form
          onSubmit={handleMerge}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-copper/40"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-fs-espresso">
              Merge &quot;{merging.displayName}&quot; into…
            </h2>
            <button
              type="button"
              onClick={() => {
                setMerging(null);
                setMergeTarget("");
                setError("");
              }}
              className="rounded-lg p-1 text-fs-copper hover:bg-fs-warm-gray"
            >
              <X size={18} />
            </button>
          </div>
          <p className="mb-3 text-sm text-fs-copper">
            Every app tagged &quot;{merging.displayName}&quot; gains the tag
            you pick, then &quot;{merging.displayName}&quot; is deleted.
          </p>
          <select
            required
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            className={inputClass}
          >
            <option value="">Pick a tag…</option>
            {tags
              .filter((t) => t.id !== merging.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName} ({t.appCount})
                </option>
              ))}
          </select>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving || !mergeTarget}
              className="flex items-center gap-2 rounded-full bg-fs-espresso px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-fs-copper disabled:opacity-50"
            >
              <Merge size={14} />
              {saving ? "Merging..." : "Merge"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-fs-espresso">
                  {tag.displayName}
                  <span className="ml-2 font-sans text-xs font-normal text-fs-copper-light">
                    {tag.name}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(expanded === tag.id ? null : tag.id)
                  }
                  className="mt-2 inline-flex items-center gap-1 text-xs text-fs-copper-light hover:text-fs-copper"
                >
                  <AppWindow size={12} />
                  {tag.appCount} app{tag.appCount === 1 ? "" : "s"}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMerging(tag)}
                  title="Merge into another tag"
                  className="rounded-lg p-2 text-fs-copper hover:bg-fs-warm-gray"
                >
                  <Merge size={16} />
                </button>
                <button
                  onClick={() => startEdit(tag)}
                  className="rounded-lg p-2 text-fs-copper hover:bg-fs-warm-gray"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(tag)}
                  className="rounded-lg p-2 text-danger hover:bg-danger/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {expanded === tag.id && tag.apps.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-fs-warm-gray pt-3">
                {tag.apps.map((a) => (
                  <span
                    key={a.id}
                    className="rounded-full bg-fs-warm-white px-2.5 py-0.5 text-xs text-fs-espresso"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {tags.length === 0 && (
          <p className="py-8 text-center text-sm text-fs-copper">
            No tags yet. Click &quot;Add Tag&quot; or run the backfill script
            (prisma/backfill-tags.ts) to auto-tag existing apps.
          </p>
        )}
      </div>

      {/* Smart tags — computed, never manageable. Read-only info card. */}
      <div className="rounded-2xl bg-fs-warm-white p-5 ring-1 ring-fs-warm-gray">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-fs-copper-light">
          Computed tags (not editable)
        </p>
        <div className="space-y-2 text-sm text-fs-espresso">
          <p className="flex items-center gap-2">
            <Star size={14} className="text-fs-copper" />
            <strong>Favorites</strong> — each user&apos;s own starred apps.
          </p>
          <p className="flex items-center gap-2">
            <Clock size={14} className="text-fs-copper" />
            <strong>My Most Used</strong> — the viewer&apos;s top apps by their
            own opens (trailing 90 days).
          </p>
          <p className="flex items-center gap-2">
            <Flame size={14} className="text-fs-copper" />
            <strong>Company Hits</strong> — org-wide most-opened apps, shown to
            each user only for apps they can access.
          </p>
        </div>
      </div>
    </div>
  );
}
