import { requireAdminPagePermissionAny } from "@/lib/auth/guard";
import { MyTasksView } from "@/components/admin/planning/MyTasksView";

export default async function MyTasksPage() {
  const admin = await requireAdminPagePermissionAny(["planning", "planning_admin"]);
  return <MyTasksView currentUserId={admin.id} canDeleteAnyComment={admin.permissions.planning_admin} />;
}
