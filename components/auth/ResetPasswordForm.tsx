"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo restablecer la contraseña."); return; }
      setDone(true);
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-sm surface-parchment p-8">
      <KeyRound size={32} className="mx-auto mb-4 text-brass" />
      <h1 className="font-display text-xl text-ink mb-6 text-center">Elegí una nueva contraseña</h1>

      {!token ? (
        <p className="font-body text-sm text-ink text-center">
          Este enlace no es válido.{" "}
          <Link href="/forgot-password" className="text-brass underline">Pedí uno nuevo</Link>.
        </p>
      ) : done ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="font-body text-sm text-ink">Tu contraseña fue actualizada.</p>
          <Link href="/sign-in" className="text-brass underline font-body text-sm">Iniciar sesión</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            label="Nueva contraseña"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            label="Confirmar contraseña"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" loading={saving} className="w-full mt-1">
            Guardar contraseña
          </Button>
        </form>
      )}
    </div>
  );
}
