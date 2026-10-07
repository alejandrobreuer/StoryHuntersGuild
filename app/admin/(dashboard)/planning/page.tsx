import { requireAdminPagePermissionAny } from "@/lib/auth/guard";
import { EpicsGrid } from "@/components/admin/planning/EpicsGrid";

export default async function PlanningEpicsPage() {
  const admin = await requireAdminPagePermissionAny(["planning", "planning_admin"]);
  return <EpicsGrid canManage={admin.permissions.planning_admin} />;
}
