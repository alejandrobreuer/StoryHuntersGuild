"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/",            label: "Inicio" },
  { href: "/events",      label: "Eventos" },
  { href: "/games",       label: "Ludoteca" },
  { href: "/about",       label: "Nosotros" },
  { href: "/my-bookings", label: "Mis reservas" },
  { href: "/sign-in",     label: "Ingresar" },
];

function NavItem({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "font-label text-xs font-semibold uppercase tracking-widest no-underline px-3.5 py-2 transition-colors",
        active ? "text-brass-bright bg-brass/10" : "text-parchment-dark hover:text-brass-bright hover:bg-brass/10"
      )}
    >
      {label}
    </Link>
  );
}

export function Nav() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between bg-gradient-to-b from-[#2a2015] to-[#1a1508] border-b-[3px] border-brass px-4 sm:px-6 shadow-parchment-lg">
      <Link href="/" className="flex items-center gap-2.5 py-2 no-underline">
        <Image src="/images/crest.png" alt="" width={40} height={40} className="size-10 object-contain" />
        <span className="font-display text-sm text-brass-light leading-tight">
          Story Hunters
          <span className="block font-label text-[0.55rem] tracking-[0.2em] text-parchment-dark uppercase">Guild</span>
        </span>
      </Link>

      <ul className="hidden md:flex items-center gap-1 list-none">
        {NAV_LINKS.map((l) => (
          <li key={l.href}><NavItem {...l} /></li>
        ))}
      </ul>

      <button
        className="md:hidden p-2 text-parchment-dark hover:text-brass-bright transition-colors"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#1a1508] border-b-[3px] border-brass flex flex-col p-3 gap-1">
          {NAV_LINKS.map((l) => (
            <NavItem key={l.href} {...l} onClick={() => setMobileOpen(false)} />
          ))}
        </div>
      )}
    </nav>
  );
}
