"use client";

import { useState } from "react";
import { ReportNav } from "./report-nav";

interface NavItem {
  id: string;
  label: string;
}

interface ReportThemeShellProps {
  navItems: NavItem[];
  slug: string;
  title: string;
  children: React.ReactNode;
}

export function ReportThemeShell({ navItems, slug, title, children }: ReportThemeShellProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <div className="report-page" data-theme={theme}>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr" }}>
        <ReportNav
          items={navItems}
          slug={slug}
          title={title}
          theme={theme}
          onThemeChange={setTheme}
        />
        {children}
      </div>
    </div>
  );
}
