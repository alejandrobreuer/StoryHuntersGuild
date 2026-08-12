import { requireAdminPagePermissionAny } from "@/lib/auth/guard";
import { SettingsTabs } from "@/components/admin/SettingsTabs";

export default async function AdminSettingsPage() {
  const admin = await requireAdminPagePermissionAny(["settings", "ranks", "badges", "tags", "feature_flags", "roles"]);
  return <SettingsTabs permissions={admin.permissions} />;
}
