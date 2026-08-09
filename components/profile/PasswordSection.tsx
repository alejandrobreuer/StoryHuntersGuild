"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PasswordForm } from "@/components/profile/PasswordForm";

export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <KeyRound size={14} className="mr-1.5" />
        {hasPassword ? "Cambiar contraseña" : "Crear una contraseña"}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={hasPassword ? "Cambiar contraseña" : "Crear una contraseña"}>
        {!hasPassword && (
          <p className="font-body text-xs text-ink-light mb-3">
            Tu cuenta todavía usa solo el enlace mágico para entrar. Podés crear una contraseña para
            iniciar sesión más rápido la próxima vez.
          </p>
        )}
        <PasswordForm hasPassword={hasPassword} />
      </Modal>
    </>
  );
}
