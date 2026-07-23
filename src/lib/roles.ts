import type { Role } from "@prisma/client";

export const ROLE_HIERARCHY: Record<Role, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  ADMIN: 2,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    EMPLOYEE: "Employee",
    MANAGER: "Manager",
    ADMIN: "Admin",
  };
  return labels[role];
}

export const ALL_ROLES: Role[] = ["EMPLOYEE", "MANAGER", "ADMIN"];

/* ------------------------------------------------------------------------- */
/*  Access gating: allStaff + departments + individual grants                */
/* ------------------------------------------------------------------------- */

/**
 * Lightweight shapes used by `canAccessApp`. Either Prisma's nested
 * `{ id, name }` department objects or just an array of IDs/names works —
 * we only compare for overlap. Callers pass whatever's convenient; queries
 * should `include` the app's departments and grants.
 */
type DeptLike = { id?: string; name?: string };
type AppForAccess = {
  allStaff: boolean;
  departments?: DeptLike[];
  grants?: { userId: string }[];
};
type UserForAccess = {
  id?: string;
  role: Role;
  departments?: DeptLike[];
};

/**
 * Returns true if the user is allowed to access the app.
 *
 * Union semantics — ANY of these admits the user (there is no deny):
 *   1. ADMINs can open everything (they manage the portal).
 *   2. The app is flagged all-staff.
 *   3. The user belongs to one of the app's granted departments.
 *   4. The user has an individual grant (AppGrant row).
 *
 * Role is otherwise NOT an access axis — it only conveys portal privileges
 * (ADMIN = manage the portal). Access is managed in Access Studio.
 */
export function canAccessApp(user: UserForAccess, app: AppForAccess): boolean {
  if (user.role === "ADMIN") return true;
  if (app.allStaff) return true;

  const userDepts = user.departments || [];
  if (userDepts.length > 0) {
    const appDepts = app.departments || [];
    // Match on whatever identifier each side provides (prefer id, fall back to name).
    const userIds = new Set(userDepts.map((d) => d.id).filter(Boolean));
    const userNames = new Set(userDepts.map((d) => d.name).filter(Boolean));
    if (
      appDepts.some(
        (d) => (d.id && userIds.has(d.id)) || (d.name && userNames.has(d.name)),
      )
    ) {
      return true;
    }
  }

  return !!user.id && (app.grants || []).some((g) => g.userId === user.id);
}

/**
 * Human-readable explanation for WHY a user can't access an app.
 * Used by the friendly block message instead of a generic 403.
 */
export function whyBlocked(
  user: UserForAccess,
  app: AppForAccess,
): string | null {
  if (canAccessApp(user, app)) return null;
  const appDepts = (app.departments || [])
    .map((d) => d.name)
    .filter(Boolean) as string[];
  if (appDepts.length === 1)
    return `This app is restricted to the ${appDepts[0]} department.`;
  if (appDepts.length > 1)
    return `This app is restricted to: ${appDepts.join(", ")}.`;
  return "You don't have access to this app.";
}
