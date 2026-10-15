import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Nueva contraseña — Story Hunters Guild" };

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
