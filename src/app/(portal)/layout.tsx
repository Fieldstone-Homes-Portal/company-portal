import { auth } from "@/lib/auth";
import { getToolboxData } from "@/lib/toolboxData";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import MortgageRateTag from "@/components/MortgageRateTag";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Access-scoped tag navigation for the sidebar (tools + dashboards in one
  // bucket, filtered by tags). Computed per user — see getToolboxData.
  const toolbox = await getToolboxData(session.user);

  return (
    <div className="flex h-full">
      <Sidebar
        role={session.user.role}
        footerSlot={<MortgageRateTag />}
        toolbox={toolbox}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={{
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
            image: session.user.image,
          }}
        />
        <main className="flex flex-1 flex-col overflow-y-auto bg-fs-warm-white p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
