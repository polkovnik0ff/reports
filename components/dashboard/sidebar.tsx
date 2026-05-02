"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderOpen,
  Database,
  LayoutTemplate,
  Settings,
  LogOut,
  Menu,
  BarChart2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/projects", label: "Проекты", icon: FolderOpen },
  { href: "/sources", label: "Источники данных", icon: Database },
  { href: "/templates", label: "Шаблоны", icon: LayoutTemplate },
  { href: "/settings", label: "Настройки", icon: Settings },
];

interface SidebarProps {
  email: string;
  role: string;
}

function NavLinks({ onNavigate, role }: { onNavigate?: () => void; role: string }) {
  const pathname = usePathname();
  const items = role === "OWNER"
    ? [...navItems, { href: "/team", label: "Команда", icon: Users }]
    : navItems;

  return (
    <nav className="flex-1 px-3 py-2 space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  email,
  role,
  onNavigate,
}: {
  email: string;
  role: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-5">
        <BarChart2 className="h-5 w-5 text-primary" />
        <span className="font-semibold text-base tracking-tight">SEO Reports</span>
      </div>

      <Separator />

      <NavLinks onNavigate={onNavigate} role={role} />

      <div className="mt-auto">
        <Separator />
        <div className="px-4 py-4 space-y-2">
          <p className="text-xs text-muted-foreground truncate px-1" title={email}>
            {email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ email, role }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-background">
        <SidebarContent email={email} role={role} />
      </aside>

      {/* Mobile: hamburger + sheet */}
      <div className="md:hidden fixed top-3 left-3 z-40">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" />}>
            <Menu className="h-4 w-4" />
            <span className="sr-only">Открыть меню</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent email={email} role={role} onNavigate={() => {}} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
