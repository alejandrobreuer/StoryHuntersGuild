import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashResetToken } from "@/lib/auth/passwordReset";

export const metadata = { title: "Nueva contraseña — Story Hunters Guild" };
export const dynamic = "force-dynamic";

/** Whether this link belongs to an account that still has no name (e.g.
 * created by staff from just an email), so the form also asks for one.
 * Only reads the token; /api/auth/reset-password is what consumes it. */
async function linkNeedsName(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("shg_password_reset_tokens")
    .select("user:shg_users(name)")
    .eq("token_hash", hashResetToken(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return false;
  return !(data.user as unknown as { name: string | null } | null)?.name;
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const needsName = await linkNeedsName(searchParams.token);
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Suspense fallback={null}>
        <ResetPasswordForm needsName={needsName} />
      </Suspense>
    </main>
  );
}
