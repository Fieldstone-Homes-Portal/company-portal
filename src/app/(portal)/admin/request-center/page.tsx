import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";
import RequestCenterEmbed from "./RequestCenterEmbed";

const PORTAL_ACCESS_TOKEN = process.env.PORTAL_ACCESS_TOKEN || "";
const IDENTITY_SIGNING_SECRET = process.env.IDENTITY_SIGNING_SECRET || "";
// The Request Center sub-app (Office / Marketing / IT requests). Lives in the
// Management section for the admin-only soft launch — when it graduates to
// staff-wide, register it as a PortalApp tile and delete this page.
const REQUEST_CENTER_URL =
  process.env.REQUEST_CENTER_URL ||
  "https://request-center-production.up.railway.app";

export default async function AdminRequestCenterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // /admin/layout.tsx already gates on ADMIN; this page adds nothing looser.

  // Same iframe wiring as /apps/[id]: portal gate token + HMAC-signed identity
  // so the sub-app knows who is acting without cookies.
  const separator = REQUEST_CENTER_URL.includes("?") ? "&" : "?";
  let iframeSrc = PORTAL_ACCESS_TOKEN
    ? `${REQUEST_CENTER_URL}${separator}portal_token=${PORTAL_ACCESS_TOKEN}`
    : REQUEST_CENTER_URL;

  if (IDENTITY_SIGNING_SECRET && session.user.email) {
    const email = session.user.email.toLowerCase();
    const name = session.user.name ?? "";
    const sig = createHmac("sha256", IDENTITY_SIGNING_SECRET)
      .update(`${email}|${name}`)
      .digest("hex");
    const params = new URLSearchParams({ fsh_user: email, fsh_name: name, fsh_sig: sig });
    iframeSrc += `${iframeSrc.includes("?") ? "&" : "?"}${params.toString()}`;
  }

  return <RequestCenterEmbed iframeSrc={iframeSrc} />;
}
