// Who can open the Request Center during its limited launch: every ADMIN,
// plus the emails in REQUEST_CENTER_USERS (comma-separated, case-insensitive).
// When the app graduates to a PortalApp tile for all staff, delete this file
// and the /request-center page and let Access Studio govern it like any app.
export function canUseRequestCenter(user: {
  role?: string | null;
  email?: string | null;
}): boolean {
  if (user.role === "ADMIN") return true;
  if (!user.email) return false;
  // Parsed per call (not at module load) so tests can stub the env var.
  const allowed = (process.env.REQUEST_CENTER_USERS || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
