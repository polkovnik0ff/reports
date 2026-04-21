"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
      <h1 className="text-3xl font-semibold text-gray-800">
        Dashboard — в разработке
      </h1>
      <p className="text-muted-foreground">Фаза 2 скоро начнётся.</p>
      <Button variant="outline" onClick={handleLogout}>
        Выйти
      </Button>
    </main>
  );
}
