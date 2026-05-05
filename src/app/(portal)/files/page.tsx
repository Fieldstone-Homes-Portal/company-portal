import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { FileText, Download, FolderOpen } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const files = await prisma.portalFile.findMany({
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  const visibleFiles = files.filter((f) =>
    hasMinRole(session.user.role, f.minRole)
  );

  const categories = [...new Set(visibleFiles.map((f) => f.category))];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Resources"
        title="Files & Documents"
        subtitle="Access shared files and resources"
      />

      {visibleFiles.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fs-warm-white">
            <FolderOpen className="h-8 w-8 text-fs-copper" />
          </div>
          <h2 className="font-display text-lg font-bold text-fs-espresso">
            No files yet
          </h2>
          <p className="mt-1 text-sm text-fs-copper">
            Files will appear here once they are uploaded by a manager.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
                {category}
              </h2>
              <div className="space-y-2">
                {visibleFiles
                  .filter((f) => f.category === category)
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-fs-warm-gray"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fs-warm-white text-fs-copper">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-fs-espresso">
                            {file.name}
                          </p>
                          {file.description && (
                            <p className="text-xs text-fs-copper">
                              {file.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {file.size && (
                          <span className="text-xs text-fs-copper-light">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        )}
                        <a
                          href={`/api/files/${file.id}`}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-fs-copper transition-colors hover:bg-fs-warm-gray hover:text-fs-espresso"
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
