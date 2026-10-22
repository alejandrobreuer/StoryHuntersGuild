import { requireAdminPagePermission } from "@/lib/auth/guard";
import { EventQrManager } from "@/components/admin/EventQrManager";

export default async function AdminEventQrPage({ params }: { params: { id: string } }) {
  await requireAdminPagePermission("events");
  return <EventQrManager eventId={params.id} />;
}
