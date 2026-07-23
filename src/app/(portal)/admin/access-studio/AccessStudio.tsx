"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  GripVertical,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { appIcon, APP_ICON_MAP } from "@/lib/appIcons";
import { APP_STAGES, stageMeta } from "@/components/StageBadge";
import DepartmentMultiSelect from "@/components/DepartmentMultiSelect";
import { getRoleLabel, ALL_ROLES } from "@/lib/roles";
import type { Role } from "@prisma/client";

interface StudioApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  url: string;
  category: string;
  section: string;
  sortOrder: number;
  isActive: boolean;
  openIn: string;
  stage: string;
  allStaff: boolean;
  deptIds: string[];
  userIds: string[];
}

interface StudioDept {
  id: string;
  name: string;
  memberCount: number;
}

interface StudioPerson {
  id: string;
  name: string;
  email: string;
  role: string;
  deptIds: string[];
  createdAt: string;
}

// A draggable (or click-selectable) thing from the palette.
type Chip =
  | { kind: "all" }
  | { kind: "dept"; id: string }
  | { kind: "person"; id: string };

// Access policy for one app. `everyone` overlays the lists — when true the
// app is open to all staff and the lists are kept (removing the All staff
// chip reveals whatever was underneath).
interface Grant {
  everyone: boolean;
  deptIds: string[];
  userIds: string[];
}

type GrantMap = Record<string, Grant>;

const SECTIONS: { key: string; label: string }[] = [
  { key: "tool", label: "Tools" },
  { key: "dashboard", label: "Dashboards" },
];

const ICON_KEYS = Object.keys(APP_ICON_MAP);
const OPEN_MODES = [
  { value: "iframe", label: "Embedded (iframe)" },
  { value: "external", label: "New tab" },
];

const PEOPLE_PREVIEW_COUNT = 36;
const NEW_PERSON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // joined in the last 7 days

const inputClass =
  "w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white px-4 py-2.5 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none focus:ring-1 focus:ring-fs-copper";
const labelClass = "mb-1 block text-xs font-medium text-fs-copper";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isNewPerson(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() <= NEW_PERSON_WINDOW_MS;
}

/** Blank form for the app editor modal. */
const blankAppForm = {
  name: "",
  description: "",
  icon: "tool",
  url: "",
  category: "general",
  section: "tool",
  sortOrder: 0,
  openIn: "iframe",
  isActive: true,
};
type AppForm = typeof blankAppForm;

export default function AccessStudio({
  apps: initialApps,
  departments,
  people: initialPeople,
  currentUserId,
}: {
  apps: StudioApp[];
  departments: StudioDept[];
  people: StudioPerson[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [apps, setApps] = useState(initialApps);
  const [people, setPeople] = useState(initialPeople);

  const deptById = useMemo(
    () => new Map(departments.map((d) => [d.id, d])),
    [departments],
  );
  const personById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );
  const deptMembers = useMemo(() => {
    const m = new Map<string, StudioPerson[]>();
    for (const d of departments) m.set(d.id, []);
    for (const p of people)
      for (const id of p.deptIds) m.get(id)?.push(p);
    return m;
  }, [departments, people]);

  const [grants, setGrants] = useState<GrantMap>(() => {
    const g: GrantMap = {};
    for (const a of initialApps) {
      g[a.id] = {
        everyone: a.allStaff,
        deptIds: [...a.deptIds],
        userIds: [...a.userIds],
      };
    }
    return g;
  });

  // Undo history holds generic revert actions: access changes revert by
  // re-PUTting the previous policy, stage changes by re-PATCHing the
  // previous stage. Everything on this page saves for real.
  const [history, setHistory] = useState<{ desc: string; revert: () => void }[]>(
    [],
  );
  const [stages, setStages] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialApps.map((a) => [a.id, a.stage])),
  );
  const [savingStage, setSavingStage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undoable: boolean } | null>(
    null,
  );
  const [dragOverApp, setDragOverApp] = useState<string | null>(null);
  const [selected, setSelected] = useState<Chip | null>(null);
  const [expandedApps, setExpandedApps] = useState<string[]>([]);
  const [personQuery, setPersonQuery] = useState("");
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [savingPerson, setSavingPerson] = useState(false);
  // App editor modal: null = closed, "new" = creating, otherwise app id.
  const [editingAppId, setEditingAppId] = useState<string | "new" | null>(null);
  const [appForm, setAppForm] = useState<AppForm>(blankAppForm);
  const [savingApp, setSavingApp] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toasts auto-dismiss; Esc clears the selection and any open overlay.
  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelected(null);
        setInspectId(null);
        setEditingAppId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function info(msg: string) {
    setToast({ msg, undoable: false });
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    last.revert();
    setToast({ msg: `Undoing: ${last.desc}`, undoable: false });
  }

  /* ---------------------------- access policy ---------------------------- */

  async function persistPolicy(appId: string, g: Grant): Promise<boolean> {
    try {
      const res = await fetch(`/api/apps/${appId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allStaff: g.everyone,
          deptIds: g.deptIds,
          userIds: g.userIds,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Save one app's new access policy: optimistic UI, PUT, undo entry.
   * Undo re-PUTs the previous policy (these are real writes).
   */
  async function mutate(appId: string, next: Grant, desc: string) {
    const before = grants[appId];
    setGrants((g) => ({ ...g, [appId]: next }));
    const ok = await persistPolicy(appId, next);
    if (!ok) {
      setGrants((g) => ({ ...g, [appId]: before }));
      return info(`Couldn't save that change — try again.`);
    }
    setHistory((h) => [
      ...h.slice(-49),
      {
        desc,
        revert: () => {
          void persistPolicy(appId, before).then((restored) => {
            if (restored) setGrants((g) => ({ ...g, [appId]: before }));
            else info("Couldn't undo — try again.");
          });
        },
      },
    ]);
    setToast({ msg: desc, undoable: true });
  }

  /* --------------------------- lifecycle stage --------------------------- */

  async function persistStage(appId: string, stage: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/apps/${appId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function changeStage(app: StudioApp, next: string) {
    const prev = stages[app.id];
    if (prev === next || savingStage) return;
    setSavingStage(app.id);
    const ok = await persistStage(app.id, next);
    setSavingStage(null);
    if (!ok) return info(`Couldn't save ${app.name}'s stage — try again.`);
    setStages((s) => ({ ...s, [app.id]: next }));
    const desc = `Moved ${app.name} to ${stageMeta(next).label}`;
    setHistory((h) => [
      ...h.slice(-49),
      {
        desc,
        revert: () => {
          void persistStage(app.id, prev).then((restored) => {
            if (restored) setStages((s) => ({ ...s, [app.id]: prev }));
            else info(`Couldn't restore ${app.name}'s stage — try again.`);
          });
        },
      },
    ]);
    setToast({ msg: desc, undoable: true });
  }

  /* ------------------------------ app CRUD ------------------------------ */

  function openAppEditor(app: StudioApp | null) {
    if (app) {
      setAppForm({
        name: app.name,
        description: app.description || "",
        icon: app.icon || "tool",
        url: app.url,
        category: app.category,
        section: app.section,
        sortOrder: app.sortOrder,
        openIn: app.openIn,
        isActive: app.isActive,
      });
      setEditingAppId(app.id);
    } else {
      setAppForm(blankAppForm);
      setEditingAppId("new");
    }
  }

  async function saveApp(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAppId) return;
    setSavingApp(true);
    const isNew = editingAppId === "new";
    const res = await fetch(isNew ? "/api/apps" : `/api/apps/${editingAppId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appForm),
    });
    setSavingApp(false);
    if (!res.ok) return info("Couldn't save the app — check the fields and try again.");
    const saved = await res.json();
    const asStudioApp: StudioApp = {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      icon: saved.icon,
      url: saved.url,
      category: saved.category,
      section: saved.section,
      sortOrder: saved.sortOrder,
      isActive: saved.isActive,
      openIn: saved.openIn,
      stage: saved.stage,
      allStaff: saved.allStaff,
      deptIds: (saved.departments || []).map((d: { id: string }) => d.id),
      userIds: (saved.grants || []).map((g: { userId: string }) => g.userId),
    };
    if (isNew) {
      setApps((a) => [...a, asStudioApp]);
      setGrants((g) => ({
        ...g,
        [saved.id]: { everyone: saved.allStaff, deptIds: [], userIds: [] },
      }));
      setStages((s) => ({ ...s, [saved.id]: saved.stage }));
      info(
        `Added ${saved.name}. It starts locked — drag a department or person onto it to grant access.`,
      );
    } else {
      setApps((a) => a.map((x) => (x.id === saved.id ? asStudioApp : x)));
      info(`Saved ${saved.name}.`);
    }
    setEditingAppId(null);
    router.refresh();
  }

  async function deleteApp(app: StudioApp) {
    if (
      !confirm(
        `Remove "${app.name}" from the portal? This deletes its access policy too.`,
      )
    )
      return;
    const res = await fetch(`/api/apps/${app.id}`, { method: "DELETE" });
    if (!res.ok) return info(`Couldn't delete ${app.name} — try again.`);
    setApps((a) => a.filter((x) => x.id !== app.id));
    setEditingAppId(null);
    info(`Deleted ${app.name}.`);
    router.refresh();
  }

  /* ------------------------------ people ------------------------------- */

  async function savePerson(
    personId: string,
    changes: { role?: string; departmentIds?: string[] },
    desc: string,
  ) {
    setSavingPerson(true);
    const res = await fetch(`/api/users/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    setSavingPerson(false);
    if (!res.ok) return info("Couldn't save — try again.");
    const updated = await res.json();
    setPeople((ps) =>
      ps.map((p) =>
        p.id === personId
          ? {
              ...p,
              role: updated.role,
              deptIds: (updated.departments || []).map(
                (d: { id: string }) => d.id,
              ),
            }
          : p,
      ),
    );
    info(desc);
  }

  /** Who can open this app under the current policy, and why. */
  function resolvedPeople(
    appId: string,
  ): { person: StudioPerson; via: string }[] {
    const g = grants[appId];
    if (!g) return [];
    if (g.everyone)
      return people.map((p) => ({ person: p, via: "All staff" }));
    const seen = new Map<string, string>();
    for (const did of g.deptIds) {
      const name = deptById.get(did)?.name || "?";
      for (const p of deptMembers.get(did) || [])
        if (!seen.has(p.id)) seen.set(p.id, `via ${name}`);
    }
    for (const uid of g.userIds)
      if (!seen.has(uid)) seen.set(uid, "individual");
    return [...seen.entries()]
      .map(([id, via]) => ({ person: personById.get(id)!, via }))
      .filter((r) => r.person)
      .sort((a, b) => a.person.name.localeCompare(b.person.name));
  }

  function accessCount(appId: string): number {
    const g = grants[appId];
    if (!g) return 0;
    if (g.everyone) return people.length;
    return resolvedPeople(appId).length;
  }

  function chipLabel(chip: Chip): string {
    if (chip.kind === "all") return "All staff";
    if (chip.kind === "dept") return deptById.get(chip.id)?.name || "?";
    return personById.get(chip.id)?.name || "?";
  }

  function applyChip(app: StudioApp, chip: Chip) {
    const g = grants[app.id];
    if (!g) return;

    if (chip.kind === "all") {
      if (g.everyone) return info(`${app.name} is already open to everyone.`);
      return void mutate(
        app.id,
        { ...g, everyone: true },
        `Opened ${app.name} to all staff`,
      );
    }

    if (g.everyone)
      return info(
        `${app.name} is already open to everyone — remove the All staff chip first.`,
      );

    if (chip.kind === "dept") {
      const dept = deptById.get(chip.id);
      if (!dept) return;
      if (g.deptIds.includes(chip.id))
        return info(`${dept.name} already has access to ${app.name}.`);
      const count = deptMembers.get(chip.id)?.length ?? 0;
      return void mutate(
        app.id,
        { ...g, deptIds: [...g.deptIds, chip.id] },
        `Granted ${dept.name} (${count} ${count === 1 ? "person" : "people"}) access to ${app.name}`,
      );
    }

    const person = personById.get(chip.id);
    if (!person) return;
    if (g.userIds.includes(chip.id))
      return info(`${person.name} already has access to ${app.name}.`);
    const viaDept = g.deptIds.find((did) => person.deptIds.includes(did));
    if (viaDept)
      return info(
        `${person.name} already has access via ${deptById.get(viaDept)?.name}.`,
      );
    return void mutate(
      app.id,
      { ...g, userIds: [...g.userIds, chip.id] },
      `Granted ${person.name} access to ${app.name}`,
    );
  }

  function removeChip(app: StudioApp, chip: Chip) {
    const g = grants[app.id];
    if (!g) return;
    if (chip.kind === "all")
      return void mutate(
        app.id,
        { ...g, everyone: false },
        `Removed All staff from ${app.name}`,
      );
    if (chip.kind === "dept")
      return void mutate(
        app.id,
        { ...g, deptIds: g.deptIds.filter((d) => d !== chip.id) },
        `Removed ${deptById.get(chip.id)?.name} from ${app.name}`,
      );
    return void mutate(
      app.id,
      { ...g, userIds: g.userIds.filter((u) => u !== chip.id) },
      `Removed ${personById.get(chip.id)?.name} from ${app.name}`,
    );
  }

  /* ----------------------------- drag & drop ----------------------------- */

  function chipDragStart(e: React.DragEvent, chip: Chip) {
    e.dataTransfer.setData("text/plain", JSON.stringify(chip));
    e.dataTransfer.effectAllowed = "copy";
  }

  function cardDrop(e: React.DragEvent, app: StudioApp) {
    e.preventDefault();
    setDragOverApp(null);
    try {
      const chip = JSON.parse(e.dataTransfer.getData("text/plain")) as Chip;
      if (chip && "kind" in chip) applyChip(app, chip);
    } catch {
      /* not one of our chips — ignore */
    }
  }

  // Auto-scroll a horizontal app row while dragging near its edges, so
  // off-screen cards are reachable without dropping the chip.
  function rowDragOver(e: React.DragEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    if (e.clientX > r.right - 80) el.scrollLeft += 16;
    else if (e.clientX < r.left + 80) el.scrollLeft -= 16;
  }

  /* ------------------------------ rendering ------------------------------ */

  const filteredPeople = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      `${p.name} ${p.email} ${p.deptIds
        .map((d) => deptById.get(d)?.name || "")
        .join(" ")}`
        .toLowerCase()
        .includes(q),
    );
  }, [people, personQuery, deptById]);

  const visiblePeople =
    showAllPeople || personQuery
      ? filteredPeople
      : filteredPeople.slice(0, PEOPLE_PREVIEW_COUNT);

  const inspected = inspectId ? personById.get(inspectId) : null;
  const editingApp =
    editingAppId && editingAppId !== "new"
      ? apps.find((a) => a.id === editingAppId) || null
      : null;

  function personCanOpen(p: StudioPerson, appId: string): string | null {
    const g = grants[appId];
    if (!g) return null;
    if (g.everyone) return "open to everyone";
    if (g.userIds.includes(p.id)) return "individual grant";
    const did = g.deptIds.find((d) => p.deptIds.includes(d));
    if (did) return `via ${deptById.get(did)?.name}`;
    return null;
  }

  const selectedLabel = selected ? chipLabel(selected) : null;

  return (
    <div className="space-y-8">
      {/* Sticky hint bar while a chip is selected (click fallback for
          trackpads — click a chip below, then click app cards to grant). */}
      {selected && (
        <div className="sticky top-2 z-40 flex items-center justify-between rounded-full bg-fs-espresso px-5 py-2.5 text-sm text-white shadow-lg">
          <p>
            Granting <span className="font-semibold">{selectedLabel}</span> —
            click an app card to grant access.
          </p>
          <button
            onClick={() => setSelected(null)}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/25"
          >
            Done (Esc)
          </button>
        </div>
      )}

      {/* ------------------------------ apps ------------------------------ */}
      {SECTIONS.map(({ key, label }) => {
        const sectionApps = apps.filter((a) => a.section === key);
        if (sectionApps.length === 0 && key !== "tool") return null;
        return (
          <section key={key}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
              {label}
            </h2>
            <div
              className="flex gap-4 overflow-x-auto pb-3"
              onDragOver={rowDragOver}
            >
              {sectionApps.map((app) => {
                const Icon = appIcon(app.icon);
                const g = grants[app.id];
                const isTarget = dragOverApp === app.id;
                const expanded = expandedApps.includes(app.id);
                const resolved = resolvedPeople(app.id);
                const count = accessCount(app.id);
                return (
                  <div
                    key={app.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setDragOverApp(app.id);
                    }}
                    onDragLeave={() =>
                      setDragOverApp((cur) => (cur === app.id ? null : cur))
                    }
                    onDrop={(e) => cardDrop(e, app)}
                    onClick={() => selected && applyChip(app, selected)}
                    className={`flex w-64 shrink-0 flex-col rounded-2xl bg-white shadow-sm transition-all ${
                      isTarget
                        ? "ring-2 ring-fs-copper"
                        : selected
                          ? "cursor-copy ring-1 ring-fs-copper/50"
                          : "ring-1 ring-fs-warm-gray"
                    } ${!app.isActive ? "opacity-60" : ""}`}
                  >
                    <div className="border-b border-fs-warm-gray px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fs-warm-white text-fs-copper">
                          <Icon size={16} />
                        </div>
                        {/* Full name, wrapping as needed — never truncated. */}
                        <h3 className="min-w-0 flex-1 font-display font-bold leading-snug text-fs-espresso">
                          {app.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAppEditor(app);
                          }}
                          className="rounded-lg p-1.5 text-fs-copper-light transition-colors hover:bg-fs-warm-white hover:text-fs-copper"
                          title={`Edit ${app.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                      {!app.isActive && (
                        <span className="mt-1.5 inline-flex rounded-full bg-danger/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-danger">
                          Disabled
                        </span>
                      )}
                      {/* Lifecycle pipeline — click a stage to move the app. */}
                      <div
                        className="mt-2 flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`flex items-center ${
                            savingStage === app.id ? "opacity-50" : ""
                          }`}
                        >
                          {APP_STAGES.map((s, i) => {
                            const StageIcon = s.icon;
                            const active = stages[app.id] === s.value;
                            return (
                              <span key={s.value} className="flex items-center">
                                {i > 0 && (
                                  <span className="h-px w-2 bg-fs-warm-gray" />
                                )}
                                <button
                                  onClick={() => changeStage(app, s.value)}
                                  disabled={savingStage === app.id}
                                  title={`${s.label}: ${s.description}${
                                    active
                                      ? " (current stage)"
                                      : " — click to move here."
                                  }`}
                                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                                    active
                                      ? s.badge
                                      : "text-fs-sage hover:bg-fs-warm-white hover:text-fs-copper"
                                  }`}
                                >
                                  <StageIcon size={12} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        <span
                          title="Lifecycle stage — informational only; it never changes who has access."
                          className="truncate text-[9px] font-semibold uppercase tracking-wider text-fs-copper-light"
                        >
                          {stageMeta(stages[app.id]).label}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-xs text-fs-copper">
                        {app.description || " "}
                      </p>
                    </div>

                    <div className="flex flex-1 flex-col px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-fs-copper-light">
                          Access
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedApps((prev) =>
                              expanded
                                ? prev.filter((id) => id !== app.id)
                                : [...prev, app.id],
                            );
                          }}
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-fs-espresso transition-colors hover:bg-fs-warm-white"
                          title={expanded ? "Hide people" : "Show people"}
                        >
                          <Users size={11} />
                          {g?.everyone ? "Everyone" : count}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {g?.everyone ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-fs-espresso py-1 pl-3 pr-1.5 text-xs font-medium text-white">
                            All staff
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeChip(app, { kind: "all" });
                              }}
                              className="rounded-full p-0.5 transition-colors hover:bg-white/20"
                              title="Remove All staff"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ) : (
                          <>
                            {g?.deptIds.map((did) => (
                              <span
                                key={did}
                                className="inline-flex items-center gap-1 rounded-full bg-fs-copper/10 py-1 pl-2.5 pr-1 text-xs font-medium text-fs-copper"
                              >
                                <Building2 size={11} />
                                {deptById.get(did)?.name}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeChip(app, { kind: "dept", id: did });
                                  }}
                                  className="rounded-full p-0.5 transition-colors hover:bg-fs-copper/20"
                                  title={`Remove ${deptById.get(did)?.name}`}
                                >
                                  <X size={11} />
                                </button>
                              </span>
                            ))}
                            {g?.userIds.map((uid) => (
                              <span
                                key={uid}
                                className="inline-flex items-center gap-1 rounded-full bg-white py-1 pl-2.5 pr-1 text-xs text-fs-espresso ring-1 ring-fs-warm-gray"
                              >
                                {personById.get(uid)?.name}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeChip(app, {
                                      kind: "person",
                                      id: uid,
                                    });
                                  }}
                                  className="rounded-full p-0.5 text-fs-copper-light transition-colors hover:bg-fs-warm-gray"
                                  title={`Remove ${personById.get(uid)?.name}`}
                                >
                                  <X size={11} />
                                </button>
                              </span>
                            ))}
                            {g &&
                              g.deptIds.length === 0 &&
                              g.userIds.length === 0 && (
                                <p className="w-full rounded-xl border border-dashed border-fs-warm-gray px-3 py-3 text-center text-[11px] text-fs-copper-light">
                                  No one has access — drag a department or
                                  person here.
                                </p>
                              )}
                          </>
                        )}
                      </div>

                      {expanded && (
                        <div className="mt-3 max-h-40 overflow-y-auto border-t border-fs-warm-gray pt-2">
                          {resolved.length === 0 ? (
                            <p className="py-1 text-[11px] text-fs-copper-light">
                              No one can open this app.
                            </p>
                          ) : (
                            resolved.map(({ person, via }) => (
                              <div
                                key={person.id}
                                className="flex items-center justify-between gap-2 py-1"
                              >
                                <span className="truncate text-xs text-fs-espresso">
                                  {person.name}
                                </span>
                                <span className="shrink-0 text-[10px] text-fs-copper-light">
                                  {via}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => openAppEditor(null)}
                className="flex w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-fs-warm-gray text-fs-copper-light transition-colors hover:border-fs-copper hover:text-fs-copper"
              >
                <Plus size={20} />
                <span className="text-xs font-medium">Add app</span>
              </button>
            </div>
          </section>
        );
      })}

      {/* ----------------------------- palette ----------------------------- */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray">
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
            Departments
          </h2>
          <span className="text-[11px] text-fs-copper-light">
            — drag onto an app, or click then pick apps
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            draggable
            onDragStart={(e) => chipDragStart(e, { kind: "all" })}
            onClick={() =>
              setSelected((s) =>
                s?.kind === "all" ? null : { kind: "all" },
              )
            }
            className={`flex cursor-grab items-center gap-1.5 rounded-full bg-fs-espresso px-3.5 py-1.5 text-sm font-medium text-white transition-all active:cursor-grabbing ${
              selected?.kind === "all"
                ? "ring-2 ring-fs-copper ring-offset-2"
                : "hover:bg-fs-charcoal"
            }`}
          >
            <GripVertical size={13} className="opacity-60" />
            All staff · {people.length}
          </button>
          {departments.map((d) => {
            const isSel = selected?.kind === "dept" && selected.id === d.id;
            const count = deptMembers.get(d.id)?.length ?? d.memberCount;
            return (
              <button
                key={d.id}
                draggable
                onDragStart={(e) =>
                  chipDragStart(e, { kind: "dept", id: d.id })
                }
                onClick={() =>
                  setSelected(isSel ? null : { kind: "dept", id: d.id })
                }
                className={`flex cursor-grab items-center gap-1.5 rounded-full bg-fs-copper/10 px-3.5 py-1.5 text-sm font-medium text-fs-copper transition-all active:cursor-grabbing ${
                  isSel
                    ? "ring-2 ring-fs-copper ring-offset-2"
                    : "hover:bg-fs-copper/20"
                }`}
              >
                <GripVertical size={13} className="opacity-50" />
                {d.name} · {count}
              </button>
            );
          })}
          {departments.length === 0 && (
            <p className="text-sm text-fs-copper-light">
              No departments yet — create them under Departments.
            </p>
          )}
        </div>

        <div className="mb-3 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
              People
            </h2>
            <span className="text-[11px] text-fs-copper-light">
              — drag one person for an individual exception; the ⓘ opens
              their profile (role, departments, access)
            </span>
          </div>
          <div className="relative sm:w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fs-copper-light"
            />
            <input
              type="text"
              value={personQuery}
              onChange={(e) => setPersonQuery(e.target.value)}
              placeholder="Search people…"
              className="w-full rounded-xl border border-fs-warm-gray bg-fs-warm-white py-1.5 pl-8 pr-3 text-sm text-fs-espresso placeholder:text-fs-copper-light focus:border-fs-copper focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {visiblePeople.map((p) => {
            const isSel = selected?.kind === "person" && selected.id === p.id;
            return (
              <span
                key={p.id}
                draggable
                onDragStart={(e) =>
                  chipDragStart(e, { kind: "person", id: p.id })
                }
                onClick={() =>
                  setSelected(isSel ? null : { kind: "person", id: p.id })
                }
                className={`flex cursor-grab items-center gap-2 rounded-full bg-white py-1 pl-1 pr-1.5 text-sm text-fs-espresso ring-1 transition-all active:cursor-grabbing ${
                  isSel
                    ? "ring-2 ring-fs-copper ring-offset-2"
                    : "ring-fs-warm-gray hover:ring-fs-copper"
                }`}
                title={p.email}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fs-warm-white text-[9px] font-semibold text-fs-copper">
                  {initials(p.name)}
                </span>
                {p.name}
                {isNewPerson(p.createdAt) && (
                  <span className="rounded-full bg-fs-copper px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    New
                  </span>
                )}
                <span className="text-[10px] text-fs-copper-light">
                  {p.deptIds
                    .map((d) => deptById.get(d)?.name)
                    .filter(Boolean)
                    .join(", ") || "no dept"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectId(p.id);
                  }}
                  className="rounded-full p-0.5 text-fs-copper-light transition-colors hover:bg-fs-warm-white hover:text-fs-copper"
                  title={`Open ${p.name}'s profile`}
                >
                  <Info size={13} />
                </button>
              </span>
            );
          })}
          {filteredPeople.length === 0 && (
            <p className="py-2 text-sm text-fs-copper-light">
              No people match “{personQuery}”.
            </p>
          )}
        </div>
        {!showAllPeople &&
          !personQuery &&
          filteredPeople.length > PEOPLE_PREVIEW_COUNT && (
            <button
              onClick={() => setShowAllPeople(true)}
              className="mt-3 rounded-full px-3 py-1 text-xs font-semibold text-fs-copper transition-colors hover:bg-fs-warm-white"
            >
              Show all {filteredPeople.length} people
            </button>
          )}
      </section>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-fs-warm-white p-4 text-xs text-fs-copper">
        <span className="font-semibold">Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-fs-espresso" /> open to
          everyone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-fs-copper/20 ring-1 ring-fs-copper/40" />{" "}
          department grant (new members inherit it)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-white ring-1 ring-fs-warm-gray" />{" "}
          individual grant
        </span>
        <span>
          Every change saves immediately — use Undo on the toast if you
          fat-finger a drop. Admins can always open everything.
        </span>
      </div>

      {/* --------------------------- app editor --------------------------- */}
      {editingAppId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fs-espresso/40 p-4"
          onClick={() => setEditingAppId(null)}
        >
          <form
            onSubmit={saveApp}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-fs-espresso">
                {editingApp ? `Edit ${editingApp.name}` : "New App"}
              </h2>
              <button
                type="button"
                onClick={() => setEditingAppId(null)}
                className="rounded-lg p-1 text-fs-copper hover:bg-fs-warm-gray"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>App Name *</label>
                <input
                  required
                  value={appForm.name}
                  onChange={(e) =>
                    setAppForm({ ...appForm, name: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Plat Studio"
                />
              </div>
              <div>
                <label className={labelClass}>URL *</label>
                <input
                  required
                  value={appForm.url}
                  onChange={(e) =>
                    setAppForm({ ...appForm, url: e.target.value })
                  }
                  className={inputClass}
                  placeholder="https://plat-studio.railway.app"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <input
                  value={appForm.description}
                  onChange={(e) =>
                    setAppForm({ ...appForm, description: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Interactive lot mapping tool for subdivision plats"
                />
              </div>
              <div>
                <label className={labelClass}>Icon</label>
                <select
                  value={appForm.icon}
                  onChange={(e) =>
                    setAppForm({ ...appForm, icon: e.target.value })
                  }
                  className={inputClass}
                >
                  {ICON_KEYS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input
                  value={appForm.category}
                  onChange={(e) =>
                    setAppForm({ ...appForm, category: e.target.value })
                  }
                  className={inputClass}
                  placeholder="tools"
                />
              </div>
              <div>
                <label className={labelClass}>Open Mode</label>
                <select
                  value={appForm.openIn}
                  onChange={(e) =>
                    setAppForm({ ...appForm, openIn: e.target.value })
                  }
                  className={inputClass}
                >
                  {OPEN_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Sort Order</label>
                <input
                  type="number"
                  value={appForm.sortOrder}
                  onChange={(e) =>
                    setAppForm({
                      ...appForm,
                      sortOrder: Number(e.target.value) || 0,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Section{" "}
                  <span className="text-fs-copper-light">
                    — which page in the portal it lives on
                  </span>
                </label>
                <select
                  value={appForm.section}
                  onChange={(e) =>
                    setAppForm({ ...appForm, section: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="tool">Toolbox</option>
                  <option value="dashboard">Dashboards</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-fs-espresso">
                  <input
                    type="checkbox"
                    checked={appForm.isActive}
                    onChange={(e) =>
                      setAppForm({ ...appForm, isActive: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-fs-warm-gray accent-fs-copper"
                  />
                  Active{" "}
                  <span className="text-xs text-fs-copper-light">
                    — disabled apps stay configured but are hidden from
                    everyone
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              {editingApp ? (
                <button
                  type="button"
                  onClick={() => deleteApp(editingApp)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  <Trash2 size={14} />
                  Delete app
                </button>
              ) : (
                <span className="text-xs text-fs-copper-light">
                  New apps start locked — grant access after creating.
                </span>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAppId(null)}
                  className="rounded-full px-5 py-2 text-sm font-medium text-fs-copper hover:bg-fs-warm-gray"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingApp}
                  className="flex items-center gap-2 rounded-full bg-fs-espresso px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-fs-copper disabled:opacity-50"
                >
                  <Check size={14} />
                  {savingApp
                    ? "Saving..."
                    : editingApp
                      ? "Save changes"
                      : "Add App"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------- person inspector ------------------------- */}
      {inspected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fs-espresso/40 p-4"
          onClick={() => setInspectId(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fs-warm-white text-xs font-semibold text-fs-copper">
                  {initials(inspected.name)}
                </span>
                <div>
                  <p className="font-display font-bold text-fs-espresso">
                    {inspected.name}
                    {inspected.id === currentUserId && (
                      <span className="ml-1.5 text-xs font-normal text-fs-copper">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-fs-copper">{inspected.email}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectId(null)}
                className="rounded-lg p-1 text-fs-copper transition-colors hover:bg-fs-warm-gray"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4">
              <div>
                <label className={labelClass}>
                  Portal role{" "}
                  <span className="text-fs-copper-light">
                    — Admin can manage the portal and open everything
                  </span>
                </label>
                <select
                  value={inspected.role}
                  disabled={inspected.id === currentUserId || savingPerson}
                  onChange={(e) =>
                    savePerson(
                      inspected.id,
                      { role: e.target.value },
                      `Set ${inspected.name}'s role to ${getRoleLabel(e.target.value as Role)}`,
                    )
                  }
                  title={
                    inspected.id === currentUserId
                      ? "You can't change your own role."
                      : undefined
                  }
                  className={`${inputClass} disabled:opacity-50`}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {getRoleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Departments</label>
                <DepartmentMultiSelect
                  allDepartments={departments}
                  selectedIds={inspected.deptIds}
                  onChange={(ids) =>
                    savePerson(
                      inspected.id,
                      { departmentIds: ids },
                      `Updated ${inspected.name}'s departments`,
                    )
                  }
                  emptyLabel="No departments — only all-staff apps and individual grants apply."
                  placeholder="Assign departments…"
                />
              </div>
            </div>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-fs-copper-light">
              Can open
            </p>
            <div className="space-y-1.5">
              {inspected.role === "ADMIN" ? (
                <p className="rounded-xl bg-fs-warm-white px-3 py-2 text-sm text-fs-espresso">
                  Everything — admins bypass access gating.
                </p>
              ) : (
                apps
                  .filter((a) => a.isActive)
                  .map((a) => {
                    const why = personCanOpen(inspected, a.id);
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                          why
                            ? "bg-fs-warm-white text-fs-espresso"
                            : "text-fs-copper-light"
                        }`}
                      >
                        <span>{a.name}</span>
                        <span className="text-[10px]">
                          {why || "no access"}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ toast ------------------------------ */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-fs-espresso py-2.5 pl-5 pr-3 text-sm text-white shadow-xl">
          <span>{toast.msg}</span>
          {toast.undoable && (
            <button
              onClick={undo}
              className="flex items-center gap-1 rounded-full bg-fs-copper px-3 py-1 text-xs font-semibold transition-colors hover:bg-fs-copper-light"
            >
              <Undo2 size={12} />
              Undo
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            className="rounded-full p-1 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
