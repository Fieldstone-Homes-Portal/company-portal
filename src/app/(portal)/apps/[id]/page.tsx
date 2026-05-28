import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessApp, whyBlocked } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import AppEmbed from "./AppEmbed";

const PORTAL_ACCESS_TOKEN = process.env.PORTAL_ACCESS_TOKEN || "";

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
  const iframeSrc = PORTAL_ACCESS_TOKEN
    ? `${app.url}${separator}portal_token=${PORTAL_ACCESS_TOKEN}`
    : app.url;

  return <AppEmbed name={app.name} iframeSrc={iframeSrc} />;
}
