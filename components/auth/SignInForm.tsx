"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
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
  const next = searchParams.get("next") || "/my-bookings";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [signingIn, setSigningIn] = React.useState(false);

  const [magicEmail, setMagicEmail] = React.useState("");
  const [magicOpen, setMagicOpen] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [sendingLink, setSendingLink] = React.useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
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

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSendingLink(true);
    try {
      await fetch("/api/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: magicEmail }),
      });
      setSent(true);
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setSendingLink(false);
    }
  }

  return (
    <div className="w-full max-w-sm surface-parchment p-8">
      <Lock size={32} className="mx-auto mb-4 text-brass" />
      <h1 className="font-display text-xl text-ink mb-6 text-center">Entrá a tu cuenta</h1>

      {error && ERROR_MESSAGES[error] && (
        <p className="mb-4 text-xs text-crimson font-body text-center">{ERROR_MESSAGES[error]}</p>
      )}

      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
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

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="font-label text-2xs uppercase tracking-widest text-leather-light">o</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {!magicOpen ? (
        <button
          type="button"
          onClick={() => setMagicOpen(true)}
          className="w-full flex items-center justify-center gap-2 font-body text-sm text-ink-light hover:text-brass transition-colors"
        >
          <Mail size={15} />
          Entrar con un enlace mágico (sin contraseña)
        </button>
      ) : sent ? (
        <p className="font-body text-sm text-moss-dark text-center">
          Si el email es válido, te enviamos un enlace. Revisá tu bandeja de entrada.
        </p>
      ) : (
        <form onSubmit={handleMagicLinkSubmit} className="flex flex-col gap-3">
          <Input
            type="email"
            required
            placeholder="tu@email.com"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
          />
          <Button type="submit" variant="secondary" loading={sendingLink} className="w-full">
            Enviar enlace mágico
          </Button>
        </form>
      )}

      <p className="mt-6 text-2xs text-leather-light font-body text-center">
        Reservar un evento nunca requiere iniciar sesión.
      </p>
    </div>
  );
}
