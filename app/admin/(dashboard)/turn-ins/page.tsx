import { requireAdminPagePermissionAny } from "@/lib/auth/guard";
import { TurnInApprovals } from "@/components/admin/TurnInApprovals";

export default async function AdminTurnInsPage() {
  await requireAdminPagePermissionAny(["quests", "turn_ins"]);
  return <TurnInApprovals />;
}
