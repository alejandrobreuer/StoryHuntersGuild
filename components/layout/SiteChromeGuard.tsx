"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { StudioCreditFooter } from "@/components/layout/StudioCreditFooter";

const HIDDEN_PREFIX = "/admin";

/** Hides the public nav/footer on the admin panel, which has its own sidebar
 * chrome (see app/admin/(dashboard)/layout.tsx) — mirrors cardstash.ar's
 * TopbarGuard pattern. */
export function SiteChromeGuard({
  children,
  sessionUser,
  isAdmin,
}: {
  children: React.ReactNode;
  sessionUser: { id: string; email: string } | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const hidden = pathname === HIDDEN_PREFIX || pathname.startsWith(HIDDEN_PREFIX + "/");

  if (hidden) return <>{children}</>;

  return (
    <>
      <Nav sessionUser={sessionUser} isAdmin={isAdmin} />
      {children}
      <StudioCreditFooter />
    </>
  );
}
