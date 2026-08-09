"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { StudioCreditFooter } from "@/components/layout/StudioCreditFooter";

const HIDDEN_PREFIXES = ["/admin", "/FU"];

/** Hides the public nav/footer on the admin panel and the Fabula Ultima
 * character creator, both of which have their own chrome (see
 * app/admin/(dashboard)/layout.tsx and app/FU/layout.tsx) — mirrors
 * cardstash.ar's TopbarGuard pattern. */
export function SiteChromeGuard({
  children,
  sessionUser,
  isAdmin,
  questsEnabled,
}: {
  children: React.ReactNode;
  sessionUser: { id: string; email: string } | null;
  isAdmin: boolean;
  questsEnabled: boolean;
}) {
  const pathname = usePathname();
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));

  if (hidden) return <>{children}</>;

  return (
    <>
      <Nav sessionUser={sessionUser} isAdmin={isAdmin} questsEnabled={questsEnabled} />
      {children}
      <StudioCreditFooter />
    </>
  );
}
