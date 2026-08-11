import { requireAdminPagePermission } from "@/lib/auth/guard";
import { ReportsCharts } from "@/components/admin/ReportsCharts";

export default async function AdminReportsPage() {
  await requireAdminPagePermission("reports");
  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-6">Reportes</h1>
      <ReportsCharts />
    </div>
  );
}
