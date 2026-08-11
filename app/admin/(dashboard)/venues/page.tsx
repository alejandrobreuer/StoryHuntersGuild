import { requireAdminPagePermission } from "@/lib/auth/guard";
import { VenuesManager } from "@/components/admin/VenuesManager";

export default async function AdminVenuesPage() {
  await requireAdminPagePermission("venues");
  return <VenuesManager />;
}
