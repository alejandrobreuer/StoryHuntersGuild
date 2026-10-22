"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { StudioCreditFooter } from "@/components/layout/StudioCreditFooter";

const HIDDEN_PREFIXES = ["/admin", "/FU"];
// The authenticated admin panel has its own sidebar chrome (see
// app/admin/(dashboard)/layout.tsx), so it opts out of the public nav/footer
// below — but the login gate in front of it has no chrome of its own yet,
// so without this exception it rendered as a bare page with neither the
// public nav nor the admin sidebar. Keep it on the public site's chrome,
// same as /sign-in.
const SHOWN_EXCEPTIONS = ["/admin/login"];

/** Hides the public nav/footer on the admin panel and the Fabula Ultima
 * character creator, both of which have their own chrome (see
 * app/admin/(dashboard)/layout.tsx and app/FU/layout.tsx) — mirrors
 * cardstash.ar's TopbarGuard pattern. */
export function SiteChromeGuard({
  children,
  sessionUser,
  isAdmin,
  questsEnabled,
  myLiveEvent,
}: {
  children: React.ReactNode;
  sessionUser: { id: string; email: string } | null;
  isAdmin: boolean;
  questsEnabled: boolean;
  myLiveEvent: { id: string; title: string } | null;
}) {
  const pathname = usePathname();
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
    && !SHOWN_EXCEPTIONS.includes(pathname);

  if (hidden) return <>{children}</>;

  // At least one screen tall, so the footer sits at the bottom of short pages
  // instead of halfway up. The page itself stays a normal block (not a flex
  // item) so its own width/centering is untouched; a page whose root has
  // `page-light` gets the empty space below it painted parchment too.
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav sessionUser={sessionUser} isAdmin={isAdmin} questsEnabled={questsEnabled} myLiveEvent={myLiveEvent} />
      <div className="flex-1 has-[>.page-light]:bg-parchment">{children}</div>
      <StudioCreditFooter />
    </div>
  );
}
