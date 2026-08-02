"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  expired:       "Ese enlace venció o ya fue usado. Pedí uno nuevo.",
  missing_token: "Enlace inválido.",
};

export function SignInForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [sent, setSent]   = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm surface-parchment p-8 text-center">
      <Mail size={32} className="mx-auto mb-4 text-brass" />
      <h1 className="font-display text-xl text-ink mb-2">Entrá a tu cuenta</h1>
      <p className="font-body text-sm text-ink-light italic mb-6">
        No hace falta contraseña — te mandamos un enlace por email.
      </p>

      {error && ERROR_MESSAGES[error] && (
        <p className="mb-4 text-xs text-crimson font-body">{ERROR_MESSAGES[error]}</p>
      )}

      {sent ? (
        <p className="font-body text-sm text-moss-dark">
          Si el email es válido, te enviamos un enlace. Revisá tu bandeja de entrada.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}

      <p className="mt-6 text-2xs text-leather-light font-body">
        Reservar un evento nunca requiere iniciar sesión.
      </p>
    </div>
  );
}
