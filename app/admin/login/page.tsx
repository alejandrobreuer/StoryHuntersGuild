"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminLoginPage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent]   = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/request-admin-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1c1810] to-[#261f13] px-4">
      <div className="w-full max-w-sm surface-parchment p-8 text-center">
        <ShieldCheck size={32} className="mx-auto mb-4 text-crimson" />
        <h1 className="font-display text-xl text-ink mb-2">Panel de administración</h1>
        <p className="font-body text-sm text-ink-light italic mb-6">
          Solo accesible para el equipo de Story Hunters.
        </p>

        {sent ? (
          <p className="font-body text-sm text-moss-dark">
            Si el email tiene acceso, te enviamos un enlace de acceso.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              required
              placeholder="admin@storyhunters.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" loading={loading} className="w-full">Enviar enlace</Button>
          </form>
        )}
      </div>
    </main>
  );
}
