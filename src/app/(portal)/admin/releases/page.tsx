import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/roles";
import PageHeader from "@/components/PageHeader";
import ReleaseNoteManager from "./ReleaseNoteManager";

export default async function AdminReleasesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Manager-level, matching Manage Apps — the people who register apps
  // are the ones announcing updates about them.
  if (!hasMinRole(session.user.role, "MANAGER")) redirect("/dashboard");

  // All notes, including future-dated ones (those are hidden from the
  // user-facing feed until their publish time passes).
  const notes = await prisma.releaseNote.findMany({
    orderBy: { publishedAt: "desc" },
    include: { app: { select: { id: true, name: true } } },
  });

  // Apps power the "link to an app" dropdown in the note form.
  const apps = await prisma.portalApp.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Management"
        title="Release Notes"
        subtitle="Announcements shown in What's New on the Home page. A note is added automatically whenever a new app is registered; add updates by hand here."
      />
      <ReleaseNoteManager
        initialNotes={notes.map((n) => ({
          ...n,
          publishedAt: n.publishedAt.toISOString(),
        }))}
        allApps={apps}
      />
    </div>
  );
}
