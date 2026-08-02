import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = { title: "Iniciar sesión — Story Hunters Guild" };

export default function SignInPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
