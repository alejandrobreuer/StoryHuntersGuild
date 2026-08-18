"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_LINKS = [
  { href: "/",            label: "Inicio" },
  { href: "/events",      label: "Eventos" },
  { href: "/games",       label: "Ludoteca" },
  { href: "/about",       label: "Nosotros" },
  { href: "/my-bookings", label: "Mis reservas" },
  { href: "/profile",     label: "Mi perfil" },
  { href: "/rol",         label: "RPG" },
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

function SignOutItem({ onClick }: { onClick?: () => void }) {
  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/";
  }
  return (
    <button
      onClick={() => { handleSignOut(); onClick?.(); }}
      className="font-label text-xs font-semibold uppercase tracking-widest px-3.5 py-2 transition-colors text-parchment-dark hover:text-brass-bright hover:bg-brass/10"
    >
      Salir
    </button>
  );
}

function LiveEventPill({ event, onClick, block }: { event: { id: string; title: string }; onClick?: () => void; block?: boolean }) {
  return (
    <Link
      href={`/events/${event.id}`}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 font-label text-2xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full bg-crimson text-crimson-foreground no-underline hover:bg-crimson/90 transition-colors",
        block && "justify-center w-full"
      )}
    >
      <Radio size={12} className="animate-pulse shrink-0" />
      Tu evento está en vivo →
    </Link>
  );
}

export function Nav({
  sessionUser,
  isAdmin,
  questsEnabled,
  myLiveEvent,
}: {
  sessionUser: { id: string; email: string } | null;
  isAdmin: boolean;
  questsEnabled: boolean;
  myLiveEvent: { id: string; title: string } | null;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const links = [
    ...BASE_LINKS,
    ...(questsEnabled ? [{ href: "/quests", label: "Historial" }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Panel Admin" }] : []),
    ...(sessionUser ? [] : [{ href: "/sign-in", label: "Ingresar" }]),
  ];

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between bg-gradient-to-b from-[#2a2015] to-[#1a1508] border-b-[3px] border-brass px-4 sm:px-6 shadow-parchment-lg">
      <div className="flex items-center gap-3 py-2">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Image src="/images/logo-bw.png" alt="" width={40} height={40} className="size-10 object-contain" />
          <span className="font-display text-sm text-brass-light leading-tight">
            Story Hunters Guild
          </span>
        </Link>
        {myLiveEvent && (
          <span className="hidden sm:inline-flex">
            <LiveEventPill event={myLiveEvent} />
          </span>
        )}
      </div>

      <ul className="hidden md:flex items-center gap-1 list-none">
        {links.map((l) => (
          <li key={l.href}><NavItem {...l} /></li>
        ))}
        {sessionUser && <li><SignOutItem /></li>}
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
          {myLiveEvent && (
            <div className="mb-1">
              <LiveEventPill event={myLiveEvent} onClick={() => setMobileOpen(false)} block />
            </div>
          )}
          {links.map((l) => (
            <NavItem key={l.href} {...l} onClick={() => setMobileOpen(false)} />
          ))}
          {sessionUser && <SignOutItem onClick={() => setMobileOpen(false)} />}
        </div>
      )}
    </nav>
  );
}
