"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/finanzas",               label: "Movimientos" },
  { href: "/admin/finanzas/dashboard",     label: "Dashboard" },
  { href: "/admin/finanzas/suscripciones", label: "Suscripciones" },
  { href: "/admin/finanzas/categorias",    label: "Categorías" },
];

/** The dark top bar from the mockups, inside the admin's own layout. */
export function FinanceNav({ showBookings }: { showBookings: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="bg-fin-ink px-4 sm:px-8 flex items-center gap-1 overflow-x-auto" aria-label="Finanzas">
      <span className="font-display text-sm font-bold text-[#F6F1E7] mr-1 whitespace-nowrap">Story Hunters</span>
      <span className="text-xs text-[#CDBFA8] mr-4 whitespace-nowrap">Finanzas</span>
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "my-2.5 px-3.5 py-2.5 rounded-lg text-sm no-underline whitespace-nowrap transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F6F1E7]",
              active ? "bg-white/15 text-white font-medium" : "text-[#E4DACA] hover:bg-white/10",
            )}
          >
            {t.label}
          </Link>
        );
      })}
      {showBookings && (
        <Link
          href="/admin/bookings"
          className="my-2.5 px-3.5 py-2.5 rounded-lg text-sm no-underline whitespace-nowrap text-[#E4DACA] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F6F1E7]"
        >
          Reservas
        </Link>
      )}
    </nav>
  );
}
