"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

export function PasswordForm({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const [hasPasswordState, setHasPasswordState] = React.useState(hasPassword);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [sendingReset, setSendingReset] = React.useState(false);

  async function handleSendResetLink() {
    setSendingReset(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo enviar el enlace."); return; }
      toast.success(`Te enviamos un enlace a ${email} para restablecer tu contraseña.`);
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setSendingReset(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          currentPassword: hasPasswordState ? currentPassword : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al actualizar la contraseña."); return; }
      toast.success(hasPasswordState ? "Contraseña actualizada." : "Contraseña creada.");
      setHasPasswordState(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {hasPasswordState && (
        <Input
          type="password"
          label="Contraseña actual"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      )}
      <Input
        type="password"
        label={hasPasswordState ? "Nueva contraseña" : "Contraseña"}
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
      <Button type="submit" size="sm" loading={saving} className="self-start mt-1">
        {hasPasswordState ? "Actualizar contraseña" : "Crear contraseña"}
      </Button>
      {hasPasswordState && (
        <p className="font-body text-xs text-ink-light">
          ¿No recordás tu contraseña actual?{" "}
          <button
            type="button"
            onClick={handleSendResetLink}
            disabled={sendingReset}
            className="text-brass underline disabled:opacity-50"
          >
            {sendingReset ? "Enviando…" : "Enviame un enlace para restablecerla"}
          </button>
        </p>
      )}
    </form>
  );
}
