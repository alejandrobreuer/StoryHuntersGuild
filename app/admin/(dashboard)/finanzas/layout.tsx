import { IBM_Plex_Sans } from "next/font/google";
import { requireAdminPagePermission } from "@/lib/auth/guard";
import { FinanceNav } from "@/components/admin/finance/FinanceNav";

// Finanzas keeps the admin's sidebar and fonts for titles, but its tables
// and dashboard sit on a lighter surface with IBM Plex Sans, tuned for
// reading numbers (Reference/Docs/finanzas/SPEC.md §5).
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export default async function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPagePermission("finances");
  return (
    <div className={`${plex.variable} -m-6 sm:-m-8 min-h-screen bg-fin-ground text-fin-ink font-data`}>
      <FinanceNav showBookings={admin.permissions.bookings} />
      <div className="px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}
