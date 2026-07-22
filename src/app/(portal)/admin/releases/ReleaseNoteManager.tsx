"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Sparkles, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface AppOption {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  appId: string | null;
  app: AppOption | null;
  // ISO string (serialized by the server page).
  publishedAt: string;
  createdBy: string | null;
}

/** Format an ISO timestamp as a `datetime-local` input value (local time). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function ReleaseNoteManager({
  initialNotes,
  allApps,
}: {
  initialNotes: Note[];
  allApps: AppOption[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  // Snapshot "now" once per mount — used only for the "Scheduled" chip on
  // future-dated notes (keeps render pure for the react-hooks lint).
  const [now] = useState(() => Date.now());
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const blankForm = { title: "", body: "", appId: "", publishedAt: "" };
  const [form, setForm] = useState(blankForm);

  function resetForm() {
    setForm(blankForm);
    setEditing(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(note: Note) {
    setForm({
      title: note.title,
      body: note.body || "",
      appId: note.appId || "",
      publishedAt: toLocalInput(note.publishedAt),
    });
    setEditing(note.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const method = editing ? "PUT" : "POST";
    const url = editing
      ? `/api/release-notes/${editing}`
      : "/api/release-notes";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        body: form.body,
        appId: form.appId || null,
        // Empty → let the server keep/default the publish time.
        publishedAt: form.publishedAt
          ? new Date(form.publishedAt).toISOString()
          : undefined,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      if (editing) {
        setNotes(notes.map((n) => (n.id === editing ? { ...n, ...data } : n)));
      } else {
        setNotes([data, ...notes]);
      }
      resetForm();
      router.refresh();
    } else {
      setError(data.error || "Something went wrong.");
    }
    setSaving(false);
  }

  async function handleDelete(note: Note) {
    if (!confirm(`Delete "${note.title}" from What's New?`)) return;
    const res = await fetch(`/api/release-notes/${note.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setNotes(notes.filter((n) => n.id !== note.id));
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
        Add Note
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fs-warm-gray"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-fs-espresso">
              {editing ? "Edit Note" : "New Note"}
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Title *
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
                placeholder="Plat Studio: faster lot search"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Details
              </label>
              <textarea
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
                placeholder="What changed and why it matters, in a sentence or two."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Linked app{" "}
                <span className="text-fs-copper-light">
                  — optional; adds an &quot;Open app&quot; link
                </span>
              </label>
              <select
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
              >
                <option value="">None — general announcement</option>
                {allApps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fs-copper">
                Publish time{" "}
                <span className="text-fs-copper-light">
                  — future-dated notes stay hidden until then
                </span>
              </label>
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(e) =>
                  setForm({ ...form, publishedAt: e.target.value })
                }
                className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper"
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
              {saving ? "Saving..." : editing ? "Update" : "Add Note"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {notes.map((note) => {
          const scheduled = new Date(note.publishedAt).getTime() > now;
          return (
            <div
              key={note.id}
              className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display font-bold text-fs-espresso">
                    {note.title}
                  </h3>
                  {note.kind === "new-app" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-fs-copper/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fs-copper">
                      <Sparkles size={10} />
                      Auto
                    </span>
                  )}
                  {scheduled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-fs-espresso/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fs-espresso">
                      <Clock size={10} />
                      Scheduled
                    </span>
                  )}
                  {note.app && (
                    <span className="rounded-full bg-fs-warm-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fs-copper">
                      {note.app.name}
                    </span>
                  )}
                </div>
                {note.body && (
                  <p className="mt-0.5 truncate text-sm text-fs-copper">
                    {note.body}
                  </p>
                )}
                <p className="mt-1 text-xs text-fs-copper-light">
                  {new Date(note.publishedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {note.createdBy ? ` · ${note.createdBy}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => startEdit(note)}
                  className="rounded-lg p-2 text-fs-copper hover:bg-fs-warm-gray"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(note)}
                  className="rounded-lg p-2 text-danger hover:bg-danger/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {notes.length === 0 && (
          <p className="py-8 text-center text-sm text-fs-copper">
            No release notes yet. New apps announce themselves automatically;
            click &quot;Add Note&quot; to announce an update.
          </p>
        )}
      </div>
    </div>
  );
}
