import { requireAdminPagePermission } from "@/lib/auth/guard";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  await requireAdminPagePermission("settings");
  return <SettingsForm />;
}
