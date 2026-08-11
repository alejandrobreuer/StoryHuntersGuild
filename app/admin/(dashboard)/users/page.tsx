import { requireAdminPagePermission } from "@/lib/auth/guard";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function AdminUsersPage() {
  await requireAdminPagePermission("users");
  return <UsersManager />;
}
