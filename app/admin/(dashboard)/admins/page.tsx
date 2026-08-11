import { requireAdminPagePermission } from "@/lib/auth/guard";
import { AdminsManager } from "@/components/admin/AdminsManager";

export default async function AdminAdminsPage() {
  await requireAdminPagePermission("roles");
  return <AdminsManager />;
}
