"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, MapPin, Dice5, ClipboardCheck, BadgeCheck, BarChart3, Settings, LogOut,
  Users, ScrollText, UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PermissionKey } from "@/types/database";

const LINKS: { href: string; label: string; icon: typeof LayoutDashboard; perm?: PermissionKey | PermissionKey[] }[] = [
  { href: "/admin",           label: "Dashboard",              icon: LayoutDashboard },
  { href: "/admin/events",    label: "Eventos",                icon: CalendarDays,   perm: "events" },
  { href: "/admin/games",     label: "Juegos",                 icon: Dice5,          perm: "games" },
  { href: "/admin/venues",    label: "Lugares",                icon: MapPin,         perm: "venues" },
  { href: "/admin/users",     label: "Usuarios",               icon: Users,          perm: "users" },
  { href: "/admin/quests",    label: "Misiones",               icon: ScrollText,     perm: "quests" },
  { href: "/admin/bookings",  label: "Reservas",               icon: ClipboardCheck, perm: "bookings" },
  { href: "/admin/turn-ins",  label: "Aprobaciones de entregas", icon: BadgeCheck,   perm: ["quests", "turn_ins"] },
  { href: "/admin/reports",   label: "Reportes",               icon: BarChart3,      perm: "reports" },
  { href: "/admin/settings",  label: "Configuración",          icon: Settings,       perm: ["settings", "ranks", "badges", "tags", "feature_flags", "roles"] },
  { href: "/admin/admins",    label: "Administradores",        icon: UserCog,        perm: "roles" },
];

interface AdminSidebarProps {
  permissions: Record<PermissionKey, boolean>;
}

export function AdminSidebar({ permissions }: AdminSidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const links = LINKS.filter((l) => {
    if (!l.perm) return true;
    const keys = Array.isArray(l.perm) ? l.perm : [l.perm];
    return keys.some((key) => permissions[key]);
  });

  return (
    <aside className="w-56 shrink-0 bg-[#1c1810] border-r border-brass/20 min-h-screen flex flex-col p-3">
      <div className="px-2 py-3 mb-2">
        <span className="font-display text-sm text-brass-light">Story Hunters</span>
        <span className="block font-label text-2xs uppercase tracking-widest text-parchment-dark">Admin</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
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
      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-3 py-2.5 font-label text-xs uppercase tracking-wide text-crimson hover:bg-crimson/10 transition-colors"
      >
        <LogOut size={15} />
        Cerrar sesión
      </button>
    </aside>
  );
}
