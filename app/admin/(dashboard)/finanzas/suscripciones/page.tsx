import { requireAdminPagePermission } from "@/lib/auth/guard";
import { Subscriptions } from "@/components/admin/finance/Subscriptions";

export default async function FinanzasSuscripcionesPage() {
  await requireAdminPagePermission("finances");
  return <Subscriptions />;
}
