import { requireAdminPagePermission } from "@/lib/auth/guard";
import { RulesManager } from "@/components/admin/RulesManager";

export default async function AdminRulesPage() {
  await requireAdminPagePermission("games");
  return <RulesManager />;
}
