import { requireAdminPagePermission } from "@/lib/auth/guard";
import { TagsManager } from "@/components/admin/TagsManager";

export default async function AdminTagsPage() {
  await requireAdminPagePermission("tags");
  return <TagsManager />;
}
