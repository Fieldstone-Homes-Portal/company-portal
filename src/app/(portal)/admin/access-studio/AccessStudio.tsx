"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LegacyStudio from "./LegacyStudio";

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  deptIds: string[];
  createdAt: string;
};
type Group = {
  description?: string | null;
  id: string;
  name: string;
  source: string;
  userIds: string[];
  memberCount: number;
};
type Props = Omit<React.ComponentProps<typeof LegacyStudio>, "departments"> & {
  departments: Group[];
};
const box = "rounded-xl border border-fs-warm-gray bg-white p-5";
const input = "w-full rounded-md border border-fs-warm-gray p-2 text-sm";
export default function AccessStudio(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("access");
  const [query, setQuery] = useState("");
  const [softwareQuery, setSoftwareQuery] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [apps, setApps] = useState<string[]>([]);
  const [everyone, setEveryone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const toggle = (items: string[], id: string) =>
    items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
  async function save(action: "grant" | "remove") {
    setBusy(true);
    setMessage("");
    const failed: string[] = [];
    for (const appId of apps) {
      try {
        const r = await fetch(`/api/apps/${appId}/access`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            userIds: users,
            deptIds: groups,
            allStaff: everyone,
          }),
        });
        if (!r.ok) failed.push(appId);
      } catch {
        failed.push(appId);
      }
    }
    const succeeded = apps.length - failed.length;
    setMessage(
      `${succeeded} software ${succeeded === 1 ? "policy" : "policies"} updated immediately.${failed.length ? ` ${failed.length} failed; failed items remain selected for retry.` : ""}${action === "remove" ? " Other grants, group membership, or admin privileges may still provide access." : ""}`,
    );
    setApps(failed);
    setBusy(false);
    router.refresh();
  }
  async function saveGroup(sync = false) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/access-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          sync
            ? { action: "sync" }
            : { id: groupId || undefined, name, userIds: members },
        ),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setMessage(
        sync
          ? `${data.count} Microsoft 365 groups loaded.`
          : "Custom group saved. Access follows its membership.",
      );
      if (!sync) {
        setName("");
        setMembers([]);
        setGroupId("");
      }
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save group.");
    }
    setBusy(false);
  }
  function peoplePicker(selected: string[], update: (ids: string[]) => void) {
    return props.people
      .filter((p) =>
        `${p.name} ${p.email}`.toLowerCase().includes(query.toLowerCase()),
      )
      .map((p: Person) => (
        <label
          key={p.id}
          className="flex items-start gap-3 border-b border-fs-warm-gray py-3 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.includes(p.id)}
            onChange={() => update(toggle(selected, p.id))}
          />
          <span>
            {p.name}
            <small className="block text-fs-charcoal">{p.email}</small>
          </span>
        </label>
      ));
  }
  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2" aria-label="Access Studio sections">
        {[
          ["access", "Grant access"],
          ["groups", "Manage groups"],
          ["software", "Software & people settings"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`rounded-md px-4 py-2 ${tab === id ? "bg-fs-espresso text-white" : "bg-white"}`}
            onClick={() => {
              setTab(id);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <p
          role="status"
          className="rounded-md border border-fs-copper bg-white p-4"
        >
          {message}
        </p>
      )}
      {tab === "access" && (
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <section className={box}>
              <h2 className="mb-3 text-2xl">1. Select people or groups</h2>
              <input
                aria-label="Search people and groups"
                className={input}
                placeholder="Search name, email, or group"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="my-3">
                <label className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={everyone}
                    onChange={(e) => setEveryone(e.target.checked)}
                  />
                  All staff
                </label>
              </div>
              <h3 className="text-lg">Groups</h3>
              <div className="max-h-48 overflow-y-auto">
                {props.departments
                  .filter((g) =>
                    `${g.name} ${g.description ?? ""}`.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((g) => (
                    <label key={g.id} className="flex gap-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={groups.includes(g.id)}
                        onChange={() => setGroups(toggle(groups, g.id))}
                      />
                      <span>
                        {g.name}
                        {g.description && <small className="block break-all">{g.description}</small>}
                        <small className="block">
                          {g.source === "microsoft"
                            ? "Microsoft 365 · live membership"
                            : "Cornerstone custom group"}
                        </small>
                      </span>
                    </label>
                  ))}
              </div>
              <h3 className="mt-4 text-lg">Individuals</h3>
              <div className="max-h-80 overflow-y-auto">
                {peoplePicker(users, setUsers)}
              </div>
            </section>
            <section className={box}>
              <h2 className="mb-3 text-2xl">2. Select software</h2>
              <input
                aria-label="Search software"
                className={input}
                placeholder="Find software"
                value={softwareQuery}
                onChange={(e) => setSoftwareQuery(e.target.value)}
              />
              <div className="mt-3 max-h-[38rem] overflow-y-auto">
                {props.apps
                  .filter((a) =>
                    a.name.toLowerCase().includes(softwareQuery.toLowerCase()),
                  )
                  .map((a) => (
                    <label
                      key={a.id}
                      className="flex items-start gap-3 border-b border-fs-warm-gray py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={apps.includes(a.id)}
                        onChange={() => setApps(toggle(apps, a.id))}
                      />
                      <span>
                        {a.name}
                        {!a.isActive ? " (disabled)" : ""}
                        <small className="block">
                          {a.allStaff
                            ? "All staff"
                            : `${a.userIds.length} individual grants · ${a.deptIds.length} groups`}
                        </small>
                        <small className="block text-fs-charcoal">
                          {a.description}
                        </small>
                      </span>
                    </label>
                  ))}
              </div>
            </section>
          </div>
          <div className={`${box} flex flex-wrap items-center gap-4`}>
            <p className="flex-1">
              {everyone ? "All staff + " : ""}
              {users.length} people · {groups.length} groups → {apps.length}{" "}
              apps
            </p>
            <button
              className="rounded-md bg-fs-copper px-5 py-3 text-white disabled:opacity-40"
              disabled={
                !apps.length || (!everyone && !users.length && !groups.length)
              }
              onClick={() => save("grant")}
            >
              {busy ? "Saving…" : "Grant access now"}
            </button>
            <button
              className="rounded-md border border-fs-warm-gray px-5 py-3 disabled:opacity-40"
              disabled={
                !apps.length || (!everyone && !users.length && !groups.length)
              }
              onClick={() => save("remove")}
            >
              Remove selected grants
            </button>
          </div>
        </fieldset>
      )}
      {tab === "groups" && (
        <fieldset disabled={busy} className={`${box} max-w-3xl space-y-4`}>
          <h2 className="text-2xl">Access groups</h2>
          <button
            className="rounded-md bg-fs-espresso px-4 py-2 text-white"
            onClick={() => saveGroup(true)}
          >
            Load Microsoft 365 groups
          </button>
          <p className="text-sm">
            Microsoft membership is read from your directory when a person opens
            Cornerstone. Custom membership is managed here.
          </p>
          <label className="block">
            Custom group
            <select
              className={input}
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                const g = props.departments.find(
                  (x) => x.id === e.target.value,
                );
                setName(g?.name || "");
                setMembers(g?.userIds || []);
              }}
            >
              <option value="">Create a new group</option>
              {props.departments
                .filter((g) => g.source === "custom")
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            Group name
            <input
              className={input}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <input
            className={input}
            aria-label="Search group members"
            placeholder="Search members"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-80 overflow-auto">
            {peoplePicker(members, setMembers)}
          </div>
          <button
            disabled={!name.trim()}
            className="rounded-md bg-fs-copper px-4 py-2 text-white"
            onClick={() => saveGroup()}
          >
            Save group ({members.length} members)
          </button>
        </fieldset>
      )}
      {tab === "software" && <LegacyStudio {...props} settingsOnly />}
    </div>
  );
}
