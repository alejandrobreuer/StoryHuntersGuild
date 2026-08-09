"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, MapPin, Dice5, Tag, ClipboardCheck, BarChart3, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/events",   label: "Eventos",    icon: CalendarDays },
  { href: "/admin/venues",   label: "Lugares",    icon: MapPin },
  { href: "/admin/games",    label: "Juegos",     icon: Dice5 },
  { href: "/admin/tags",     label: "Tags",       icon: Tag },
  { href: "/admin/bookings", label: "Reservas",   icon: ClipboardCheck },
  { href: "/admin/reports",  label: "Reportes",   icon: BarChart3 },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <aside className="w-56 shrink-0 bg-[#1c1810] border-r border-brass/20 min-h-screen flex flex-col p-3">
      <div className="px-2 py-3 mb-2">
        <span className="font-display text-sm text-brass-light">Story Hunters</span>
        <span className="block font-label text-2xs uppercase tracking-widest text-parchment-dark">Admin</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
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
