import { Suspense } from "react";
import { requireAdminPagePermission } from "@/lib/auth/guard";
import { Dashboard } from "@/components/admin/finance/Dashboard";

export default async function FinanzasDashboardPage() {
  await requireAdminPagePermission("finances");
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
