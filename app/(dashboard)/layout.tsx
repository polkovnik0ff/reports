import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/dashboard/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar email={session.email} />
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden h-14" /> {/* spacer for mobile hamburger */}
        {children}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
