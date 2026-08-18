import { redirect } from "next/navigation";
import { getSessionUser, getAdminUser } from "@/lib/auth/guard";
import { RolSidebar } from "@/components/rol/RolSidebar";

export const dynamic = "force-dynamic";

// Every page under /rol shares this shell: the site's public Nav on top
// (rendered globally by SiteChromeGuard) plus this persistent left sidebar.
// Gated here once for the whole section, rather than per-page. A signed-in
// player unlocks the section normally; a DM with the "rol" admin permission
// also gets in even with no player account of their own, since /rol/settings
// only ever calls admin-session-gated routes — the rest of the pages (Mis
// Personajes, etc.) still need a real player session for their own data,
// enforced independently by their own API routes.
export default async function RolLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();
  const adminUser = await getAdminUser();
  const isDM = Boolean(adminUser?.permissions.rol);

  if (!sessionUser && !isDM) redirect("/sign-in?next=/rol");

  return (
    <div className="flex">
      <RolSidebar isDM={isDM} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
