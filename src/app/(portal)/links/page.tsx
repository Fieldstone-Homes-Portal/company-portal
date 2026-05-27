import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import PageHeader from "@/components/PageHeader";

const companyLinks = [
  {
    name: "Outlook",
    description: "Email and calendar",
    url: "https://outlook.office.com/mail/",
    icon: "📧",
    category: "Communication",
  },
  {
    name: "SharePoint",
    description: "Company documents and intranet",
    url: "https://fieldstonehomes.sharepoint.com/SitePages/Home.aspx",
    icon: "📁",
    category: "Communication",
  },
  {
    name: "HubSpot",
    description: "CRM and marketing dashboard",
    url: "https://app-na2.hubspot.com/reports-dashboard/21077855/view/138909404",
    icon: "🧲",
    category: "Sales & Marketing",
  },
  {
    name: "Pipeline",
    description: "Construction project management",
    url: "https://ps.pipelinebt.app",
    icon: "🏗️",
    category: "Sales & Marketing",
  },
  {
    name: "Builder Portal",
    description: "Builder management portal",
    url: "https://fieldstone.builderportal.net/Login",
    icon: "🏠",
    category: "Sales & Marketing",
  },
  {
    name: "ThinkLodge",
    description: "Sales enablement platform",
    url: "https://thinklodge.app",
    icon: "💡",
    category: "Sales & Marketing",
  },
  {
    name: "Novi Home",
    description: "Home builder sales platform",
    url: "https://login.novihome.com",
    icon: "🏘️",
    category: "Sales & Marketing",
  },
  {
    name: "Domo",
    description: "Business intelligence and data analytics",
    url: "https://fieldstonehomes.domo.com/home",
    icon: "📊",
    category: "Data & Analytics",
  },
  {
    name: "Smartsheet",
    description: "Project tracking and collaboration",
    url: "https://app.smartsheet.com/login",
    icon: "📋",
    category: "Operations",
  },
  {
    name: "Continia",
    description: "Purchase order approvals",
    url: "http://vpn.fieldstonehomes.com:8085/live-fsh/purchase/approval",
    icon: "✅",
    category: "Operations",
  },
  {
    name: "Paylocity",
    description: "Payroll and HR",
    url: "https://access.paylocity.com",
    icon: "💰",
    category: "Operations",
  },
];

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
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
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
                  </a>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
