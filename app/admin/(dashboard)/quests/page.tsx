import { requireAdminPagePermission } from "@/lib/auth/guard";
import { QuestsManager } from "@/components/admin/QuestsManager";

export default async function AdminQuestsPage() {
  await requireAdminPagePermission("quests");
  return <QuestsManager />;
}
