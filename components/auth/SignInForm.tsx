"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { safeNext, isQrNext, isBookingNext } from "@/lib/auth/safeNext";

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const fromQr = isQrNext(next);
  const fromBooking = isBookingNext(next);

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

      {fromBooking && (
        <p className="mb-5 font-body text-xs text-ink-light text-center leading-relaxed">
          Para reservar necesitás una cuenta: así registramos tu asistencia y tus misiones.
          Iniciá sesión y te llevamos de vuelta a la reserva.
        </p>
      )}
      {fromQr && (
        <p className="mb-5 font-body text-xs text-ink-light text-center leading-relaxed">
          Iniciá sesión para registrar tu escaneo — te traemos de vuelta automáticamente.
          <br />
          ¿Ya tenés cuenta pero no te reconoce? Si abriste el QR desde Instagram o WhatsApp, abrí esta página en tu navegador.
        </p>
      )}

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
        <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="text-brass underline">Creá una</Link>
      </p>

      <p className="mt-2 text-center font-body text-xs text-ink-light">
        <Link href="/forgot-password" className="text-brass underline">¿Olvidaste tu contraseña?</Link>
      </p>

    </div>
  );
}
