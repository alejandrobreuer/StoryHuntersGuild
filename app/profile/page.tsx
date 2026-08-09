import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { formatDate } from "@/lib/formatting";

export const metadata = { title: "Mi perfil — Story Hunters Guild" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/sign-in?next=/profile");

  const admin = createAdminClient();
  const { data: user } = await admin
    .from("shg_users")
    .select("email, name, password_hash, created_at")
    .eq("id", sessionUser.id)
    .maybeSingle();

  return (
    <main className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-parchment text-center mb-8">Mi perfil</h1>

      <div className="flex flex-col gap-4">
        <section className="surface-parchment p-6">
          <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-3">
            Cuenta
          </h2>
          <dl className="font-body text-sm text-ink flex flex-col gap-1">
            <div><span className="text-ink-light">Email:</span> {user?.email ?? sessionUser.email}</div>
            {user?.name && <div><span className="text-ink-light">Nombre:</span> {user.name}</div>}
            {user?.created_at && (
              <div><span className="text-ink-light">Miembro desde:</span> {formatDate(user.created_at)}</div>
            )}
          </dl>
        </section>

        <section className="surface-parchment p-6">
          <h2 className="font-label text-xs font-semibold uppercase tracking-widest text-leather-light mb-3">
            {user?.password_hash ? "Cambiar contraseña" : "Crear una contraseña"}
          </h2>
          {!user?.password_hash && (
            <p className="font-body text-xs text-ink-light mb-3">
              Tu cuenta todavía usa solo el enlace mágico para entrar. Podés crear una contraseña para
              iniciar sesión más rápido la próxima vez.
            </p>
          )}
          <PasswordForm hasPassword={Boolean(user?.password_hash)} />
        </section>
      </div>
    </main>
  );
}
