"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Map as MapIcon, Swords, Users, ScrollText, Settings, Contact } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: string; icon: typeof Shield; dmOnly?: boolean }[] = [
  { href: "/rol",            label: "Gremio",         icon: Shield },
  { href: "/rol/map",        label: "Mapa",           icon: MapIcon },
  { href: "/rol/quests",     label: "Misiones",       icon: Swords },
  { href: "/rol/npcs",       label: "NPCs",           icon: Contact },
  { href: "/rol/characters", label: "Mis Personajes", icon: Users },
  { href: "/rol/history",    label: "Historial",      icon: ScrollText },
  { href: "/rol/settings",   label: "Settings",       icon: Settings, dmOnly: true },
];

export function RolSidebar({ isDM }: { isDM: boolean }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => !l.dmOnly || isDM);

  return (
    <aside className="w-56 shrink-0 bg-[#1c1810] border-r border-brass/20 min-h-screen flex flex-col p-3">
      <div className="px-2 py-3 mb-2">
        <span className="font-display text-sm text-brass-light">RPG</span>
        <span className="block font-label text-2xs uppercase tracking-widest text-parchment-dark">Fabula Ultima</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/rol" ? pathname === "/rol" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 font-label text-xs uppercase tracking-wide no-underline transition-colors",
                active ? "bg-brass/15 text-brass-bright" : "text-parchment-dark hover:bg-brass/5 hover:text-brass-light"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
