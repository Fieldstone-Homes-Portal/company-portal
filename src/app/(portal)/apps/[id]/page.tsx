import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

const PORTAL_ACCESS_TOKEN = process.env.PORTAL_ACCESS_TOKEN || "";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AppPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const app = await prisma.portalApp.findUnique({ where: { id } });
  if (!app || !app.isActive) notFound();

  if (!hasMinRole(session.user.role, app.minRole)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-xl font-bold text-fs-espresso">
            Access Restricted
          </h1>
          <p className="mt-2 text-sm text-fs-copper">
            You don&apos;t have permission to access this app.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-fs-copper hover:text-fs-espresso"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Append portal token to iframe URL for access gate
  const separator = app.url.includes("?") ? "&" : "?";
  const iframeSrc = PORTAL_ACCESS_TOKEN
    ? `${app.url}${separator}portal_token=${PORTAL_ACCESS_TOKEN}`
    : app.url;

  return (
    <div className="-m-6 flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-fs-warm-gray bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-fs-copper transition-colors hover:bg-fs-warm-gray hover:text-fs-espresso"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <div className="h-4 w-px bg-fs-warm-gray" />
          <h1 className="font-display text-sm font-bold text-fs-espresso">
            {app.name}
          </h1>
        </div>
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-fs-copper transition-colors hover:bg-fs-warm-gray hover:text-fs-espresso"
        >
          Open in new tab
          <ExternalLink size={12} />
        </a>
      </div>
      <iframe
        src={iframeSrc}
        className="h-0 min-h-0 flex-1 border-0"
        title={app.name}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
