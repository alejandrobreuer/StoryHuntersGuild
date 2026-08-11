import { requireAdminPagePermission } from "@/lib/auth/guard";
import { FeatureFlagsManager } from "@/components/admin/FeatureFlagsManager";

export default async function AdminFeatureFlagsPage() {
  await requireAdminPagePermission("feature_flags");
  return <FeatureFlagsManager />;
}
