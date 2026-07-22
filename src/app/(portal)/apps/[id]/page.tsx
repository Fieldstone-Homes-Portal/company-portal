import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessApp, whyBlocked } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { createHmac } from "crypto";
import AppEmbed from "./AppEmbed";

const PORTAL_ACCESS_TOKEN = process.env.PORTAL_ACCESS_TOKEN || "";
// Shared secret for signing the forwarded login (must match the sub-app). When
// unset, identity forwarding is off and behavior is unchanged.
const IDENTITY_SIGNING_SECRET = process.env.IDENTITY_SIGNING_SECRET || "";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AppPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const app = await prisma.portalApp.findUnique({
    where: { id },
    include: { departments: { select: { id: true, name: true } } },
  });
  if (!app || !app.isActive) notFound();

  // Combined role + department check.
  if (!canAccessApp(session.user, app)) {
    const reason =
      whyBlocked(session.user, app) || "You don't have access to this app.";
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-fs-warm-white">
            <Lock size={26} className="text-fs-copper" />
          </div>
          <h1 className="font-display text-xl font-bold text-fs-espresso">
            Access restricted
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fs-copper">
            {reason}
          </p>
          <p className="mt-2 text-xs text-fs-copper-light">
            Contact an administrator if you believe you should have access.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-fs-espresso px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-fs-copper"
          >
            <ArrowLeft size={14} />
            Back to Toolbox
          </Link>
        </div>
      </div>
    );
  }

  // Append portal token to iframe URL for the downstream app's access gate
  const separator = app.url.includes("?") ? "&" : "?";
  let iframeSrc = PORTAL_ACCESS_TOKEN
    ? `${app.url}${separator}portal_token=${PORTAL_ACCESS_TOKEN}`
    : app.url;

  // Forward the signed logged-in identity so downstream apps can personalize or
  // gate by user (e.g. the Sales Dashboard's per-viewer To-Do + Closing Report
  // lock). HMAC-signed with a shared secret so the sub-app can trust it and a
  // user can't forge another identity; apps that don't use it ignore the params.
  // Only added when IDENTITY_SIGNING_SECRET is set, so it's a no-op until then.
  if (IDENTITY_SIGNING_SECRET && session.user.email) {
    const email = session.user.email.toLowerCase();
    const name = session.user.name ?? "";
    const sig = createHmac("sha256", IDENTITY_SIGNING_SECRET)
      .update(`${email}|${name}`)
      .digest("hex");
    const params = new URLSearchParams({ fsh_user: email, fsh_name: name, fsh_sig: sig });
    iframeSrc += `${iframeSrc.includes("?") ? "&" : "?"}${params.toString()}`;
  }

  return (
    <AppEmbed
      name={app.name}
      iframeSrc={iframeSrc}
      appId={app.id}
      // SOFT LAUNCH: lifecycle-stage badges are admin-only for now. Drop
      // this gate (pass app.stage unconditionally) when stages go live.
      stage={session.user.role === "ADMIN" ? app.stage : undefined}
    />
  );
}
