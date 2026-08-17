import { requireAdminPagePermission } from "@/lib/auth/guard";
import { RolQuestsManager } from "@/components/admin/rol/RolQuestsManager";

export default async function AdminRolQuestsPage() {
  await requireAdminPagePermission("rol");
  return <RolQuestsManager />;
}
