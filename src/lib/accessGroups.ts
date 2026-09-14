import { graphGet } from "./graphClient";
import { prisma } from "./prisma";

/** Follow Graph pagination only on Microsoft's origin; never forward tokens elsewhere. */
export async function graphPages<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  const seen = new Set<string>();
  while (path) {
    if (seen.has(path)) throw new Error("Repeated Graph page");
    seen.add(path);
    const data = await graphGet<{ value: T[]; "@odata.nextLink"?: string }>(
      path,
    );
    if (!Array.isArray(data.value)) throw new Error("Invalid Graph response");
    results.push(...data.value);
    const next = data["@odata.nextLink"];
    if (!next) break;
    const url = new URL(next);
    if (
      url.origin !== "https://graph.microsoft.com" ||
      !url.pathname.startsWith("/v1.0/")
    )
      throw new Error("Invalid Graph pagination");
    path = url.pathname.slice("/v1.0".length) + url.search;
  }
  return results;
}

/** Membership is checked fresh, not inferred from cached directory snapshots. */
export async function directoryDepartments(email: string) {
  const groups = await prisma.department.findMany({
    where: { source: "microsoft" },
  });
  if (!groups.length) return [];
  try {
    const memberships = await graphPages<{ id: string }>(
      `/users/${encodeURIComponent(email)}/transitiveMemberOf/microsoft.graph.group?$select=id`,
    );
    const ids = new Set(memberships.map((g) => g.id));
    return groups
      .filter((g) => g.externalId && ids.has(g.externalId))
      .map((g) => ({ id: g.id, name: g.name }));
  } catch {
    // A directory outage must not preserve revoked access. Other grant paths remain usable.
    console.warn(
      "Microsoft group membership unavailable; directory access withheld.",
    );
    return [];
  }
}
