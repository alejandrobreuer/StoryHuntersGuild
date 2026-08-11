import { requireAdminPagePermission } from "@/lib/auth/guard";
import { RolesManager } from "@/components/admin/RolesManager";

export default async function AdminRolesPage() {
  await requireAdminPagePermission("roles");
  return <RolesManager />;
}
