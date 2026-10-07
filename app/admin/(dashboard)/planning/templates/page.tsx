import { requireAdminPagePermission } from "@/lib/auth/guard";
import { TemplatesManager } from "@/components/admin/planning/TemplatesManager";

export default async function PlanningTemplatesPage() {
  await requireAdminPagePermission("planning_admin");
  return <TemplatesManager />;
}
