import { requireAdminPagePermission } from "@/lib/auth/guard";
import { BadgesManager } from "@/components/admin/BadgesManager";

export default async function AdminBadgesPage() {
  await requireAdminPagePermission("badges");
  return <BadgesManager />;
}
