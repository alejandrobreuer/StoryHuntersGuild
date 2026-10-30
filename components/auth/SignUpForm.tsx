"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserPlus, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { safeNext, isBookingNext } from "@/lib/auth/safeNext";

export function SignUpForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const signInHref = `/sign-in?next=${encodeURIComponent(next)}`;
  const fromBooking = isBookingNext(next);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [alreadyExists, setAlreadyExists] = React.useState(false);
  const [setupEmailSent, setSetupEmailSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlreadyExists(false);

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al crear la cuenta.");
        if (res.status === 409) setAlreadyExists(true);
        return;
      }
      if (json.data?.setupEmailSent) { setSetupEmailSent(true); return; }
      window.location.href = next;
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (setupEmailSent) {
    return (
      <div className="w-full max-w-sm surface-parchment p-8 text-center">
        <MailCheck size={32} className="mx-auto mb-4 text-brass" />
        <h1 className="font-display text-xl text-ink mb-3">Ya tenés una cuenta</h1>
        <p className="font-body text-sm text-ink-light leading-relaxed">
          La creamos con tus reservas anteriores, así no perdés tu experiencia ni tus misiones.
          Te enviamos un email a <strong className="text-ink">{email.trim()}</strong> con un enlace para elegir tu contraseña.
        </p>
        <p className="mt-4 font-body text-xs text-ink-light">
          ¿No te llegó? Revisá spam o{" "}
          <Link href="/forgot-password" className="text-brass underline">pedí otro enlace</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm surface-parchment p-8">
      <UserPlus size={32} className="mx-auto mb-4 text-brass" />
      <h1 className="font-display text-xl text-ink mb-6 text-center">Creá tu cuenta</h1>

      {fromBooking && (
        <p className="mb-5 font-body text-xs text-ink-light text-center leading-relaxed">
          Para reservar necesitás una cuenta: así registramos tu asistencia y podés avanzar en tus misiones.
          Al terminar te llevamos de vuelta a la reserva.
        </p>
      )}

      {alreadyExists && (
        <p className="mb-4 text-xs text-crimson font-body text-center">
          Ya existe una cuenta con ese email.{" "}
          <Link href={signInHref} className="underline">Iniciá sesión</Link>.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Nombre (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          label="Confirmar contraseña"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" loading={loading} className="w-full mt-1">
          Crear cuenta
        </Button>
      </form>

      <p className="mt-4 text-center font-body text-xs text-ink-light">
        ¿Ya tenés cuenta?{" "}
        <Link href={signInHref} className="text-brass underline">Iniciá sesión</Link>
      </p>
    </div>
  );
}
