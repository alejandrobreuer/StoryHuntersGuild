import { requireAdminPagePermission } from "@/lib/auth/guard";
import { GuildIdentityForm } from "@/components/admin/rol/GuildIdentityForm";
import { GuildFeaturesManager } from "@/components/admin/rol/GuildFeaturesManager";
import { GuildRanksManager } from "@/components/admin/rol/GuildRanksManager";

export default async function AdminRolPage() {
  await requireAdminPagePermission("rol");
  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-6">Gremio</h1>
      <div className="flex flex-col gap-6 max-w-2xl">
        <GuildIdentityForm />
        <GuildFeaturesManager />
        <GuildRanksManager />
      </div>
    </div>
  );
}
