import { redirect } from "next/navigation";
import { getSessionUser, getAdminUser } from "@/lib/auth/guard";
import { RolSidebar } from "@/components/rol/RolSidebar";

export const dynamic = "force-dynamic";

// Every page under /rol shares this shell: the site's public Nav on top
// (rendered globally by SiteChromeGuard) plus this persistent left sidebar.
// Gated here once for the whole section, rather than per-page, since every
// /rol/** route requires a signed-in player.
export default async function RolLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/sign-in?next=/rol");

  const adminUser = await getAdminUser();
  const isDM = Boolean(adminUser?.permissions.rol);

  return (
    <div className="flex">
      <RolSidebar isDM={isDM} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
