import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { isNewApp } from "@/lib/releaseNotes";
import { getToolboxData } from "@/lib/toolboxData";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ToolboxExplorer from "./ToolboxExplorer";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // The Toolbox is now the tag-driven browser over every active app the
  // user can access (tools AND dashboards — the "tool"/"dashboard" type
  // tags replace the old section split here; /dashboards keeps its page).
  // getToolboxData scopes everything to canAccessApp before any tag math.
  const data = await getToolboxData(session.user);

  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Denver" })
  ).getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        label="Fieldstone Homes"
        title={`${greeting}, ${firstName}`}
        subtitle="Your tools and resources are ready below."
      />

      {/* useSearchParams (the ?tags= filter state) requires Suspense. */}
      <Suspense fallback={null}>
        <ToolboxExplorer
          apps={data.apps.map((a) => ({
            ...a,
            isNew: isNewApp(new Date(a.createdAt)),
          }))}
          favoriteIds={data.favoriteIds}
          mostUsedIds={data.mostUsedIds}
          companyHitIds={data.companyHitIds}
        />
      </Suspense>
    </div>
  );
}
