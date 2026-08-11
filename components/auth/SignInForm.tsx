"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/my-bookings";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [signingIn, setSigningIn] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al iniciar sesión."); return; }
      window.location.href = next;
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="w-full max-w-sm surface-parchment p-8">
      <Lock size={32} className="mx-auto mb-4 text-brass" />
      <h1 className="font-display text-xl text-ink mb-6 text-center">Entrá a tu cuenta</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          type="email"
          label="Email"
          required
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          label="Contraseña"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={signingIn} className="w-full mt-1">
          Iniciar sesión
        </Button>
      </form>

      <p className="mt-4 text-center font-body text-xs text-ink-light">
        ¿No tenés cuenta?{" "}
        <Link href="/sign-up" className="text-brass underline">Creá una</Link>
      </p>

      <p className="mt-2 text-center font-body text-xs text-ink-light">
        ¿Olvidaste tu contraseña? Escribinos y un Asistente del Gremio te ayuda a restablecerla.
      </p>

      <p className="mt-6 text-2xs text-leather-light font-body text-center">
        Reservar un evento nunca requiere iniciar sesión.
      </p>
    </div>
  );
}
