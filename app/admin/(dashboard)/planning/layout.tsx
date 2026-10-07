import { requireAdminPagePermissionAny } from "@/lib/auth/guard";
import { PlanningTabs } from "@/components/admin/planning/PlanningTabs";

export default async function PlanningLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPagePermissionAny(["planning", "planning_admin"]);

  return (
    <div>
      <PlanningTabs canManage={admin.permissions.planning_admin} />
      {children}
    </div>
  );
}
