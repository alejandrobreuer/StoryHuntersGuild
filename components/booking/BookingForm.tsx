"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, Ticket, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatARS } from "@/lib/formatting";
import { toast } from "sonner";

interface BookingFormProps {
  eventId:         string;
  pricePerPerson:  number;
  remaining:       number;
  bankInstructions: string;
  defaultName?:    string;
  defaultEmail?:   string;
  defaultPhone?:   string;
}

export function BookingForm({
  eventId, pricePerPerson, remaining, bankInstructions,
  defaultName = "", defaultEmail = "", defaultPhone = "",
}: BookingFormProps) {
  const router = useRouter();
  const [name, setName]   = React.useState(defaultName);
  const [email, setEmail] = React.useState(defaultEmail);
  const [phone, setPhone] = React.useState(defaultPhone);
  const [guestCount, setGuestCount] = React.useState(1);
  const [receipt, setReceipt] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const [couponInput, setCouponInput] = React.useState("");
  const [applyingCoupon, setApplyingCoupon] = React.useState(false);
  const [appliedCoupon, setAppliedCoupon] = React.useState<{ code: string; discountPercent: number } | null>(null);

  const subtotal = pricePerPerson * guestCount;
  const discountAmount = appliedCoupon ? Math.round(subtotal * (appliedCoupon.discountPercent / 100)) : 0;
  const cost = subtotal - discountAmount;
  const isValid = name.trim().length > 1 && email.includes("@") && guestCount >= 1 && guestCount <= remaining && receipt != null;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo aplicar el cupón.");
        return;
      }
      setAppliedCoupon({ code: code.toUpperCase(), discountPercent: json.data.discount_percent });
      toast.success(`Cupón aplicado: -${json.data.discount_percent}%`);
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !receipt) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("event_id", eventId);
      form.set("name", name.trim());
      form.set("email", email.trim());
      if (phone.trim()) form.set("phone", phone.trim());
      form.set("guest_count", String(guestCount));
      form.set("receipt", receipt);
      if (appliedCoupon) form.set("coupon_code", appliedCoupon.code);

      const res = await fetch("/api/bookings", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo crear la reserva.");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="surface-parchment p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-4 text-moss" />
        <h2 className="font-display text-xl text-ink mb-2">¡Reserva enviada!</h2>
        <p className="font-body text-sm text-ink-light mb-6">
          Te enviamos un email de confirmación. Vamos a revisar tu comprobante y te avisamos cuando esté confirmada.
        </p>
        <Button variant="secondary" onClick={() => router.push("/events")}>Ver más eventos</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="surface-parchment p-6 flex flex-col gap-4">
        <h2 className="font-label text-xs uppercase tracking-widest text-leather-light">Tus datos</h2>
        <Input label="Nombre completo" required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input
          label={`Cantidad de personas (máx. ${remaining})`}
          type="number"
          min={1}
          max={remaining}
          required
          value={guestCount}
          onChange={(e) => setGuestCount(Math.max(1, Math.min(remaining, Number(e.target.value) || 1)))}
          wrapperClassName="w-40"
        />
      </div>

      <div className="surface-parchment p-6 flex flex-col gap-4">
        <h2 className="font-label text-xs uppercase tracking-widest text-leather-light">Cupón de descuento</h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-sm border border-moss bg-moss/10">
            <span className="flex items-center gap-2 font-label text-sm font-semibold text-moss-dark">
              <Ticket size={16} /> {appliedCoupon.code} · -{appliedCoupon.discountPercent}%
            </span>
            <button
              type="button"
              onClick={removeCoupon}
              className="flex items-center gap-1 font-label text-2xs uppercase tracking-wide text-ink-light hover:text-crimson transition-colors"
            >
              <X size={13} /> Quitar
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Input
              label="Código (opcional)"
              placeholder="Ej: GAME15-DBZC6R"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
              wrapperClassName="flex-1"
            />
            <Button
              type="button" variant="secondary" loading={applyingCoupon}
              disabled={!couponInput.trim() || applyingCoupon}
              onClick={applyCoupon}
            >
              Aplicar
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-4 flex flex-col gap-1.5">
          {appliedCoupon && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-ink-light">Subtotal</span>
                <span className="font-body text-sm text-ink-light">{formatARS(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-moss-dark">Descuento ({appliedCoupon.discountPercent}%)</span>
                <span className="font-body text-sm text-moss-dark">-{formatARS(discountAmount)}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <span className="font-label text-xs uppercase tracking-widest text-leather-light">Total a pagar</span>
            <span className="font-display text-2xl font-semibold text-brass">{formatARS(cost)}</span>
          </div>
        </div>
      </div>

      <div className="surface-parchment p-6">
        <h2 className="font-label text-xs uppercase tracking-widest text-leather-light mb-3">Datos para transferencia</h2>
        <pre className="font-body text-sm text-ink-light whitespace-pre-wrap leading-relaxed">{bankInstructions}</pre>
      </div>

      <div className="surface-parchment p-6">
        <h2 className="font-label text-xs uppercase tracking-widest text-leather-light mb-3">Comprobante de pago</h2>
        <label className="flex items-center gap-3 border-2 border-dashed border-border px-4 py-6 cursor-pointer hover:border-brass transition-colors">
          <Upload size={20} className="text-leather-light shrink-0" />
          <span className="font-body text-sm text-ink-light">
            {receipt ? receipt.name : "Subí una foto o captura del comprobante"}
          </span>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <Button type="submit" size="lg" loading={submitting} disabled={!isValid || submitting}>
        Confirmar reserva
      </Button>
    </form>
  );
}
