"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Radio, CalendarCheck, User, ScrollText, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_LINKS = [
  { href: "/",       label: "Inicio" },
  { href: "/events", label: "Eventos" },
  { href: "/games",  label: "Ludoteca" },
  { href: "/about",  label: "Nosotros" },
  { href: "/rol",    label: "RPG" },
];

type NavUser = { id: string; email: string; name: string | null };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavItem({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "font-label text-xs font-semibold uppercase tracking-widest no-underline px-3.5 py-2 transition-colors",
        isActive(pathname, href) ? "text-brass-bright bg-brass/10" : "text-parchment-dark hover:text-brass-bright hover:bg-brass/10"
      )}
    >
      {label}
    </Link>
  );
}

function initialsFor(user: NavUser): string {
  const parts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return user.email.slice(0, 1).toUpperCase();
}

async function signOut() {
  await fetch("/api/auth/sign-out", { method: "POST" });
  window.location.href = "/";
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

// ─── Profile button + its menu ───────────────────────────────────────────────

function ProfileMenu({ user, isAdmin, questsEnabled }: { user: NavUser; isAdmin: boolean; questsEnabled: boolean }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close on navigation, outside click and Escape.
  React.useEffect(() => { setOpen(false); }, [pathname]);
  React.useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { href: "/my-bookings", label: "Reservas", icon: CalendarCheck },
    { href: "/profile",     label: "Mi perfil", icon: User },
    ...(questsEnabled ? [{ href: "/quests", label: "Historial", icon: ScrollText }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Panel de Admin", icon: Shield }] : []),
  ];

  const itemClass =
    "flex w-full items-center gap-2.5 px-4 min-h-11 font-label text-xs font-semibold uppercase tracking-widest no-underline transition-colors";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menú de tu cuenta"
        title={user.name ?? user.email}
        className={cn(
          "flex size-10 items-center justify-center rounded-full border-2 font-label text-sm font-semibold transition-colors",
          open ? "border-brass-bright bg-brass text-[#1a1508]" : "border-brass bg-brass/15 text-brass-light hover:border-brass-bright hover:text-brass-bright"
        )}
      >
        {initialsFor(user)}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tu cuenta"
          className="absolute right-0 top-full mt-2 w-60 rounded-sm border-2 border-brass bg-[#1a1508] py-2 shadow-parchment-lg z-50"
        >
          <div className="px-4 pb-2 mb-1 border-b border-brass/30">
            {user.name && <p className="font-display text-sm text-brass-light truncate">{user.name}</p>}
            <p className="font-body text-xs text-parchment-dark/80 truncate">{user.email}</p>
          </div>
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                itemClass,
                isActive(pathname, href) ? "text-brass-bright bg-brass/10" : "text-parchment-dark hover:text-brass-bright hover:bg-brass/10"
              )}
            >
              <Icon size={15} className="shrink-0" /> {label}
            </Link>
          ))}
          <div className="my-1 border-t border-brass/30" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); signOut(); }}
            className={cn(itemClass, "text-parchment-dark hover:text-brass-bright hover:bg-brass/10")}
          >
            <LogOut size={15} className="shrink-0" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

export function Nav({
  sessionUser,
  isAdmin,
  questsEnabled,
  myLiveEvent,
}: {
  sessionUser: NavUser | null;
  isAdmin: boolean;
  questsEnabled: boolean;
  myLiveEvent: { id: string; title: string } | null;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Signed out: "Ingresar" instead of the profile button. An admin signed in
  // only to the panel (no player session) still gets a way back to it.
  const extraLinks = sessionUser ? [] : [
    ...(isAdmin ? [{ href: "/admin", label: "Panel de Admin" }] : []),
    { href: "/sign-in", label: "Ingresar" },
  ];

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-gradient-to-b from-[#2a2015] to-[#1a1508] border-b-[3px] border-brass px-4 sm:px-6 shadow-parchment-lg">
      <div className="flex items-center gap-3 py-2 min-w-0">
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
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

      <div className="flex items-center gap-1">
        <ul className="hidden md:flex items-center gap-1 list-none">
          {[...MAIN_LINKS, ...extraLinks].map((l) => (
            <li key={l.href}><NavItem {...l} /></li>
          ))}
        </ul>

        {sessionUser && (
          <div className="ml-2">
            <ProfileMenu user={sessionUser} isAdmin={isAdmin} questsEnabled={questsEnabled} />
          </div>
        )}

        <button
          className="md:hidden p-2 text-parchment-dark hover:text-brass-bright transition-colors"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#1a1508] border-b-[3px] border-brass flex flex-col p-3 gap-1">
          {myLiveEvent && (
            <div className="mb-1">
              <LiveEventPill event={myLiveEvent} onClick={() => setMobileOpen(false)} block />
            </div>
          )}
          {[...MAIN_LINKS, ...extraLinks].map((l) => (
            <NavItem key={l.href} {...l} onClick={() => setMobileOpen(false)} />
          ))}
        </div>
      )}
    </nav>
  );
}
