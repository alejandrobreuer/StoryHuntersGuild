import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/guard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-[#261f13]">
      <AdminSidebar permissions={admin.permissions} />
      <main className="flex-1 min-w-0 p-6 sm:p-8">{children}</main>
    </div>
  );
}
