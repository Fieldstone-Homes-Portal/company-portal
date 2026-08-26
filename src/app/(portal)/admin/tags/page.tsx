import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import TagManager from "./TagManager";

export default async function AdminTagsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Tags are publisher-managed — only ADMINs create, rename, merge, delete,
  // or assign them (assignment lives in the Access Studio app editor).
  if (!hasMinRole(session.user.role, "ADMIN")) redirect("/dashboard");

  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { apps: true } },
      apps: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        label="Administration"
        title="Tags"
        subtitle="Tags power Toolbox navigation and search — an app carries as many tags as are true about it. Tags never affect who can access an app; access is managed in Access Studio. Assign tags to an app from its editor in Access Studio."
      />
      <TagManager
        initialTags={tags.map((t) => ({
          id: t.id,
          name: t.name,
          displayName: t.displayName,
          sortOrder: t.sortOrder,
          appCount: t._count.apps,
          apps: t.apps,
        }))}
      />
    </div>
  );
}
