import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = { title: "Crear cuenta — Story Hunters Guild" };

export default function SignUpPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
    </main>
  );
}
