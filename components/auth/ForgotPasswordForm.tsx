"use client";

import * as React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo enviar el enlace."); return; }
      setSent(true);
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-sm surface-parchment p-8">
      <Mail size={32} className="mx-auto mb-4 text-brass" />
      <h1 className="font-display text-xl text-ink mb-6 text-center">Restablecer contraseña</h1>

      {sent ? (
        <p className="font-body text-sm text-ink text-center">
          Si existe una cuenta con <strong>{email}</strong>, te enviamos un enlace para elegir una nueva
          contraseña. Revisá tu bandeja de entrada (y el spam). El enlace vence en 1 hora.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="font-body text-xs text-ink-light">
            Ingresá el email de tu cuenta y te mandamos un enlace para elegir una nueva contraseña.
          </p>
          <Input
            type="email"
            label="Email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" loading={sending} className="w-full mt-1">
            Enviar enlace
          </Button>
        </form>
      )}

      <p className="mt-4 text-center font-body text-xs text-ink-light">
        <Link href="/sign-in" className="text-brass underline">Volver a iniciar sesión</Link>
      </p>
    </div>
  );
}
