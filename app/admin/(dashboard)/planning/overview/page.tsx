import { requireAdminPagePermissionAny } from "@/lib/auth/guard";
import { OverviewView } from "@/components/admin/planning/OverviewView";

export default async function PlanningOverviewPage() {
  const admin = await requireAdminPagePermissionAny(["planning", "planning_admin"]);
  return <OverviewView currentUserId={admin.id} canDeleteAnyComment={admin.permissions.planning_admin} />;
}
