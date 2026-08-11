import { requireAdminPagePermission } from "@/lib/auth/guard";
import { EventsManager } from "@/components/admin/EventsManager";

export default async function AdminEventsPage() {
  await requireAdminPagePermission("events");
  return <EventsManager />;
}
