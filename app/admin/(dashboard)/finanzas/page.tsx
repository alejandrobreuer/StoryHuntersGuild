import { Suspense } from "react";
import { requireAdminPagePermission } from "@/lib/auth/guard";
import { Ledger } from "@/components/admin/finance/Ledger";

export default async function FinanzasMovimientosPage() {
  await requireAdminPagePermission("finances");
  return (
    <Suspense>
      <Ledger />
    </Suspense>
  );
}
