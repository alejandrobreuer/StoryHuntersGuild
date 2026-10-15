import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Restablecer contraseña — Story Hunters Guild" };

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <ForgotPasswordForm />
    </main>
  );
}
