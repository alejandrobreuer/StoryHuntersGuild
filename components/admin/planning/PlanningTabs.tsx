"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PlanningTabs({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/admin/planning", label: "Épicas", match: (p: string) => p === "/admin/planning" },
    { href: "/admin/planning/my-tasks", label: "Mis tareas", match: (p: string) => p.startsWith("/admin/planning/my-tasks") },
    ...(canManage
      ? [{ href: "/admin/planning/templates", label: "Plantillas", match: (p: string) => p.startsWith("/admin/planning/templates") }]
      : []),
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-border mb-6">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "font-label text-sm px-4 py-3 border-b-2 -mb-px transition-colors",
              active ? "border-crimson text-ink font-semibold" : "border-transparent text-ink-light hover:text-ink"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
