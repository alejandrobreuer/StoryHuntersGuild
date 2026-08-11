"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al iniciar sesión."); return; }
      window.location.href = "/admin";
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
          <Input
            type="email"
            label="Email"
            required
            placeholder="admin@storyhunters.com"
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
          <Button type="submit" loading={loading} className="w-full mt-1">Iniciar sesión</Button>
        </form>
      </div>
    </main>
  );
}
