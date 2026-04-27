import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="h-screen overflow-hidden bg-background">
      {children}
      <Toaster richColors position="top-right" />
    </div>
  );
}
