import { requireAdminPagePermission } from "@/lib/auth/guard";
import { Categories } from "@/components/admin/finance/Categories";

export default async function FinanzasCategoriasPage() {
  await requireAdminPagePermission("finances");
  return <Categories />;
}
