import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";
import { canUseRequestCenter } from "@/lib/requestCenterAccess";
import RequestCenterEmbed from "./RequestCenterEmbed";

function timestamp() {
  return String(Math.floor(Date.now() / 1000));
}

const PORTAL_ACCESS_TOKEN = process.env.PORTAL_ACCESS_TOKEN || "";
const IDENTITY_SIGNING_SECRET = process.env.IDENTITY_SIGNING_SECRET || "";
// Limited launch: admins + the REQUEST_CENTER_USERS allowlist.
const REQUEST_CENTER_URL =
  process.env.REQUEST_CENTER_URL ||
  "https://request-center-production.up.railway.app";

export default async function RequestCenterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canUseRequestCenter(session.user)) redirect("/home");

  // Same iframe wiring as /apps/[id]: portal gate token + HMAC-signed identity
  // so the sub-app knows who is acting without cookies.
  const separator = REQUEST_CENTER_URL.includes("?") ? "&" : "?";
  let iframeSrc = PORTAL_ACCESS_TOKEN
    ? `${REQUEST_CENTER_URL}${separator}portal_token=${PORTAL_ACCESS_TOKEN}`
    : REQUEST_CENTER_URL;

  if (IDENTITY_SIGNING_SECRET && session.user.email) {
    const email = session.user.email.toLowerCase();
    const name = session.user.name ?? "";
    const ts = timestamp();
    const sig = createHmac("sha256", IDENTITY_SIGNING_SECRET)
      .update(`${email}|${name}|${ts}`)
      .digest("hex");
    const params = new URLSearchParams({
      fsh_user: email,
      fsh_name: name,
      fsh_sig: sig,
      fsh_ts: ts,
    });
    iframeSrc += `${iframeSrc.includes("?") ? "&" : "?"}${params.toString()}`;
  }

  return <RequestCenterEmbed iframeSrc={iframeSrc} />;
}
