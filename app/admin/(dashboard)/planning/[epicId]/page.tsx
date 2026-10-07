import { requireAdminPagePermissionAny } from "@/lib/auth/guard";
import { EpicDetailView } from "@/components/admin/planning/EpicDetailView";

export default async function EpicDetailPage({ params }: { params: { epicId: string } }) {
  const admin = await requireAdminPagePermissionAny(["planning", "planning_admin"]);
  return <EpicDetailView epicId={params.epicId} canManage={admin.permissions.planning_admin} currentUserId={admin.id} />;
}
