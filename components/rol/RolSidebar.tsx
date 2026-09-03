"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield, Map as MapIcon, Swords, Users, ScrollText, Settings, Contact, BookOpen,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: string; icon: typeof Shield; dmOnly?: boolean }[] = [
  { href: "/rol",            label: "Gremio",         icon: Shield },
  { href: "/rol/map",        label: "Mapa",           icon: MapIcon },
  { href: "/rol/quests",     label: "Misiones",       icon: Swords },
  { href: "/rol/npcs",       label: "NPCs",           icon: Contact },
  { href: "/rol/characters", label: "Mis Personajes", icon: Users },
  { href: "/rol/classes",    label: "Clases",         icon: BookOpen },
  { href: "/rol/history",    label: "Historial",      icon: ScrollText },
  { href: "/rol/settings",   label: "Settings",       icon: Settings, dmOnly: true },
];

// Per-browser preference (localStorage, not the DB) — matches how the dice
// size setting is persisted elsewhere in the RPG section.
const COLLAPSE_STORAGE_KEY = "shg-rol-sidebar-collapsed";

export function RolSidebar({ isDM }: { isDM: boolean }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => !l.dmOnly || isDM);
  // Starts expanded (matches the server-rendered markup) — a layout effect
  // reads the saved preference right after mount, before paint.
  const [collapsed, setCollapsed] = React.useState(false);

  React.useLayoutEffect(() => {
    if (window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    // min-h-[calc(100vh-60px)], not min-h-screen: this renders below the
    // ~60px site Nav, so a literal 100vh here would flex-stretch <main>
    // (default align-items: stretch) 60px taller than the viewport too —
    // exactly the "gap before the footer" bug on pages that size their own
    // content to fill the remaining viewport (e.g. /rol/map).
    <aside
      className={cn(
        "shrink-0 bg-[#1c1810] border-r border-brass/20 min-h-[calc(100vh-60px)] flex flex-col p-3 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className={cn("flex items-center py-3 mb-2", collapsed ? "justify-center" : "justify-between px-2")}>
        {!collapsed && (
          <div>
            <span className="font-display text-sm text-brass-light">RPG</span>
            <span className="block font-label text-2xs uppercase tracking-widest text-parchment-dark">Fabula Ultima</span>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="p-1.5 text-parchment-dark hover:text-brass-bright transition-colors"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/rol" ? pathname === "/rol" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-2.5 py-2.5 font-label text-xs uppercase tracking-wide no-underline transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
                active ? "bg-brass/15 text-brass-bright" : "text-parchment-dark hover:bg-brass/5 hover:text-brass-light"
              )}
            >
              <Icon size={15} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
