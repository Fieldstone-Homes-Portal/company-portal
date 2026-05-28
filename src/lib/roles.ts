import { Role } from "@prisma/client";

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
/*  Access gating: role + department                                         */
/* ------------------------------------------------------------------------- */

/**
 * Lightweight shapes used by `canAccessApp`. Either Prisma's nested
 * `{ id, name }` department objects or just an array of IDs/names works —
 * we only compare for overlap. Callers pass whatever's convenient.
 */
type DeptLike = { id?: string; name?: string };
type AppForAccess = {
  minRole: Role;
  departments?: DeptLike[];
};
type UserForAccess = {
  role: Role;
  departments?: DeptLike[];
};

/**
 * Returns true if the user is allowed to access the app.
 *
 * Rules (in order):
 *   1. Block if the user's role is below the app's `minRole`.
 *   2. ADMINs and MANAGERs bypass all department gating.
 *   3. EMPLOYEEs need to be a member of at least one of the app's
 *      restricted departments. An app with NO department restrictions
 *      is open to any employee meeting the role gate.
 */
export function canAccessApp(user: UserForAccess, app: AppForAccess): boolean {
  if (!hasMinRole(user.role, app.minRole)) return false;
  if (user.role === "ADMIN" || user.role === "MANAGER") return true;

  const appDepts = app.departments || [];
  if (appDepts.length === 0) return true; // open to all employees in role

  const userDepts = user.departments || [];
  if (userDepts.length === 0) return false; // employee with no dept can't access restricted apps

  // Match on whatever identifier each side provides (prefer id, fall back to name).
  const userIds = new Set(userDepts.map((d) => d.id).filter(Boolean));
  const userNames = new Set(userDepts.map((d) => d.name).filter(Boolean));
  return appDepts.some(
    (d) => (d.id && userIds.has(d.id)) || (d.name && userNames.has(d.name)),
  );
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
  if (!hasMinRole(user.role, app.minRole)) {
    return `This app requires ${getRoleLabel(app.minRole)} role or higher.`;
  }
  const appDepts = (app.departments || [])
    .map((d) => d.name)
    .filter(Boolean) as string[];
  if (appDepts.length === 0) return "You don't have access to this app.";
  if (appDepts.length === 1)
    return `This app is restricted to the ${appDepts[0]} department.`;
  return `This app is restricted to: ${appDepts.join(", ")}.`;
}
