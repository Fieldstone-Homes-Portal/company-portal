import { auth } from "@/lib/auth";
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

  return (
    <div className="flex h-full">
      <Sidebar role={session.user.role} footerSlot={<MortgageRateTag />} />
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
