import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TrackedLink from "@/components/TrackedLink";
import { companyLinks } from "@/lib/companyLinks";

const categories = [...new Set(companyLinks.map((l) => l.category))];

export default async function LinksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Fieldstone Homes"
        title="Company Links"
        subtitle="Quick access to all Fieldstone tools and platforms"
      />

      <div className="space-y-8">
        {categories.map((category) => (
          <section key={category}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-fs-copper-light">
              {category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companyLinks
                .filter((l) => l.category === category)
                .map((link) => (
                  <TrackedLink
                    key={link.name}
                    href={link.url}
                    trackId={link.url}
                    className="group flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-fs-warm-gray transition-all hover:shadow-md hover:ring-fs-copper/30"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fs-warm-white text-lg">
                      {link.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-fs-espresso group-hover:text-fs-copper">
                          {link.name}
                        </span>
                        <ExternalLink
                          size={11}
                          className="text-fs-copper-light opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-fs-copper">
                        {link.description}
                      </p>
                    </div>
                  </TrackedLink>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
