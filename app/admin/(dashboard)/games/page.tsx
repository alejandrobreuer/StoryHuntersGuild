import { requireAdminPagePermission } from "@/lib/auth/guard";
import { GamesManager } from "@/components/admin/GamesManager";

export default async function AdminGamesPage() {
  await requireAdminPagePermission("games");
  return <GamesManager />;
}
