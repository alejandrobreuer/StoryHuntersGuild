import { requireAdminPagePermission } from "@/lib/auth/guard";
import { BookingsTable } from "@/components/admin/BookingsTable";

export default async function AdminBookingsPage() {
  await requireAdminPagePermission("bookings");
  return <BookingsTable />;
}
