import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/guard";
import { RolSettingsTabs } from "@/components/rol/settings/RolSettingsTabs";

export const metadata = { title: "Settings — RPG — Story Hunters Guild" };
export const dynamic = "force-dynamic";

// DM-only. The sidebar already hides this link for non-DMs (see
// RolSidebar) — this is defense in depth against a direct URL visit.
// Requires an active admin session (shg_admin_session) with the "rol"
// permission, on top of the player session app/rol/layout.tsx already
// guards — the DM manages the RPG section through their admin account,
// same as every other admin-only capability in this app.
export default async function RolSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser?.permissions.rol) redirect("/rol");

  return (
    <div className="max-w-6xl px-6 py-14">
      <RolSettingsTabs />
    </div>
  );
}
