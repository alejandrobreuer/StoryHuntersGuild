import { requireAdminPagePermission } from "@/lib/auth/guard";
import { LocationsManager } from "@/components/admin/rol/LocationsManager";

export default async function AdminRolMapPage() {
  await requireAdminPagePermission("rol");
  return <LocationsManager />;
}
