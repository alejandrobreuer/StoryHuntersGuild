import { requireAdminPagePermission } from "@/lib/auth/guard";
import { RanksManager } from "@/components/admin/RanksManager";

export default async function AdminRanksPage() {
  await requireAdminPagePermission("ranks");
  return <RanksManager />;
}
