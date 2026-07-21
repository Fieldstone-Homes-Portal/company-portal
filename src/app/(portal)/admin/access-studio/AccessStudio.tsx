"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  GripVertical,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { appIcon } from "@/lib/appIcons";
import { getRoleLabel } from "@/lib/roles";
import type { Role } from "@prisma/client";

interface StudioApp {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  section: string;
  minRole: string;
  deptIds: string[];
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
}

// A draggable (or click-selectable) thing from the palette.
type Chip =
  | { kind: "all" }
  | { kind: "dept"; id: string }
  | { kind: "person"; id: string };

// Sandbox access policy for one app. `everyone` overlays the lists — when
// true the app is open to all staff and the lists are kept (removing the
// All staff chip reveals whatever was underneath).
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

const PEOPLE_PREVIEW_COUNT = 36;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AccessStudio({
  apps,
  departments,
  people,
}: {
  apps: StudioApp[];
  departments: StudioDept[];
  people: StudioPerson[];
}) {
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

  // Seed the sandbox from today's live rules: no department restriction
  // means "open to everyone" (the minRole gate is shown as a legacy badge
  // but isn't modeled here — this prototype explores the grants-only model).
  const seed = useMemo<GrantMap>(() => {
    const g: GrantMap = {};
    for (const a of apps) {
      g[a.id] = {
        everyone: a.deptIds.length === 0,
        deptIds: [...a.deptIds],
        userIds: [],
      };
    }
    return g;
  }, [apps]);

  const [grants, setGrants] = useState<GrantMap>(seed);
  const [history, setHistory] = useState<{ desc: string; before: GrantMap }[]>(
    [],
  );
  const [toast, setToast] = useState<{ msg: string; undoable: boolean } | null>(
    null,
  );
  const [dragOverApp, setDragOverApp] = useState<string | null>(null);
  const [selected, setSelected] = useState<Chip | null>(null);
  const [expandedApps, setExpandedApps] = useState<string[]>([]);
  const [personQuery, setPersonQuery] = useState("");
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toasts auto-dismiss; Esc clears the selection and the inspector.
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
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function chipLabel(chip: Chip): string {
    if (chip.kind === "all") return "All staff";
    if (chip.kind === "dept") return deptById.get(chip.id)?.name || "?";
    return personById.get(chip.id)?.name || "?";
  }

  function info(msg: string) {
    setToast({ msg, undoable: false });
  }

  function mutate(desc: string, next: GrantMap) {
    setHistory((h) => [...h.slice(-49), { desc, before: grants }]);
    setGrants(next);
    setToast({ msg: desc, undoable: true });
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setGrants(last.before);
    setToast({ msg: `Undid: ${last.desc}`, undoable: false });
  }

  /** Who can open this app under the sandbox rules, and why. */
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

  function applyChip(app: StudioApp, chip: Chip) {
    const g = grants[app.id];
    if (!g) return;

    if (chip.kind === "all") {
      if (g.everyone) return info(`${app.name} is already open to everyone.`);
      return mutate(`Opened ${app.name} to all staff`, {
        ...grants,
        [app.id]: { ...g, everyone: true },
      });
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
      return mutate(
        `Granted ${dept.name} (${count} ${count === 1 ? "person" : "people"}) access to ${app.name}`,
        {
          ...grants,
          [app.id]: { ...g, deptIds: [...g.deptIds, chip.id] },
        },
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
    return mutate(`Granted ${person.name} access to ${app.name}`, {
      ...grants,
      [app.id]: { ...g, userIds: [...g.userIds, chip.id] },
    });
  }

  function removeChip(app: StudioApp, chip: Chip) {
    const g = grants[app.id];
    if (!g) return;
    if (chip.kind === "all")
      return mutate(`Removed All staff from ${app.name}`, {
        ...grants,
        [app.id]: { ...g, everyone: false },
      });
    if (chip.kind === "dept")
      return mutate(
        `Removed ${deptById.get(chip.id)?.name} from ${app.name}`,
        {
          ...grants,
          [app.id]: { ...g, deptIds: g.deptIds.filter((d) => d !== chip.id) },
        },
      );
    return mutate(
      `Removed ${personById.get(chip.id)?.name} from ${app.name}`,
      {
        ...grants,
        [app.id]: { ...g, userIds: g.userIds.filter((u) => u !== chip.id) },
      },
    );
  }

  function resetAll() {
    mutate("Reset to today's live access", seed);
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
        if (sectionApps.length === 0) return null;
        return (
          <section key={key}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
                {label}
              </h2>
              {key === SECTIONS[0].key && (
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-fs-copper transition-colors hover:bg-fs-warm-gray"
                >
                  <RotateCcw size={12} />
                  Reset to live access
                </button>
              )}
            </div>
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
                    }`}
                  >
                    <div className="border-b border-fs-warm-gray px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fs-warm-white text-fs-copper">
                          <Icon size={16} />
                        </div>
                        <h3 className="min-w-0 flex-1 truncate font-display font-bold text-fs-espresso">
                          {app.name}
                        </h3>
                        {app.minRole !== "EMPLOYEE" && (
                          <span
                            title="Legacy role gate — not modeled in this prototype"
                            className="flex items-center gap-1 rounded-full bg-fs-copper/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-fs-copper"
                          >
                            <Shield size={9} />
                            {app.minRole.toLowerCase()}+
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            info(
                              "App editing stays in Manage Apps in this prototype.",
                            );
                          }}
                          className="rounded-lg p-1.5 text-fs-copper-light transition-colors hover:bg-fs-warm-white hover:text-fs-copper"
                          title="Edit app"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                      <p className="mt-1.5 line-clamp-2 min-h-[2rem] text-xs text-fs-copper">
                        {app.description || " "}
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
                onClick={() =>
                  info("App creation stays in Manage Apps in this prototype.")
                }
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
              — drag one person for an individual exception
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
                  title={`What can ${p.name} open?`}
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
        <span>Click the person-count on a card to see everyone it resolves to.</span>
      </div>

      {/* ------------------------- person inspector ------------------------- */}
      {inspected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fs-espresso/40 p-4"
          onClick={() => setInspectId(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
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
                  </p>
                  <p className="text-xs text-fs-copper">
                    {inspected.email} ·{" "}
                    {getRoleLabel(inspected.role as Role)} ·{" "}
                    {inspected.deptIds
                      .map((d) => deptById.get(d)?.name)
                      .filter(Boolean)
                      .join(", ") || "no departments"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectId(null)}
                className="rounded-lg p-1 text-fs-copper transition-colors hover:bg-fs-warm-gray"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-fs-copper-light">
              Can open (in this sandbox)
            </p>
            <div className="space-y-1.5">
              {apps.map((a) => {
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
              })}
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
