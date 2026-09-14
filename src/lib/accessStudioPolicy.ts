/** Access administration is reserved for these two named portal administrators. */
const ACCESS_STUDIO_ADMINS = new Set([
  "tim@fieldstonehomes.com",
  "skyler@fieldstonehomes.com",
]);

export function canManageAccess(user: { role?: string; email?: string | null } | null | undefined): boolean {
  return user?.role === "ADMIN" && ACCESS_STUDIO_ADMINS.has(user.email?.trim().toLowerCase() ?? "");
}
