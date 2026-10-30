"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, Ticket, X, Info } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatARS } from "@/lib/formatting";
import { priceWithCoupons, type CouponForPricing } from "@/lib/coupons";
import { toast } from "sonner";

interface BookingFormProps {
  eventId:         string;
  pricePerPerson:  number;
  remaining:       number;
  bankInstructions: string;
  defaultName?:    string;
  /** The signed-in account's email — bookings always go to it. */
  accountEmail:    string;
  defaultPhone?:   string;
}

export function BookingForm({
  eventId, pricePerPerson, remaining, bankInstructions,
  accountEmail, defaultName = "", defaultPhone = "",
}: BookingFormProps) {
  const router = useRouter();
  const [name, setName]   = React.useState(defaultName);
  const [phone, setPhone] = React.useState(defaultPhone);
  const [guestCount, setGuestCount] = React.useState(1);
  const [receipt, setReceipt] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ unusedCoupons: string[] } | null>(null);

  // Each coupon discounts one ticket; extras beyond the number of people
  // aren't used (lib/coupons decides which, the same way the server does).
  const [couponInput, setCouponInput] = React.useState("");
  const [applyingCoupon, setApplyingCoupon] = React.useState(false);
  const [coupons, setCoupons] = React.useState<CouponForPricing[]>([]);

  const { used, subtotal, discount, cost } = priceWithCoupons(pricePerPerson, guestCount, coupons);
  const usedSet = new Set(used);
  const isValid = name.trim().length > 1 && guestCount >= 1 && guestCount <= remaining && receipt != null;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    if (coupons.some((c) => c.code === code.toUpperCase())) {
      toast.error("Ese cupón ya está cargado.");
      return;
    }
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
      setCoupons((cs) => [...cs, { code: code.toUpperCase(), discountPercent: json.data.discount_percent }]);
      setCouponInput("");
      toast.success(`Cupón aplicado: -${json.data.discount_percent}% en 1 lugar`);
    } catch {
      toast.error("Error de red. Intentá de nuevo.");
    } finally {
      setApplyingCoupon(false);
    }
  }

  function removeCoupon(code: string) {
    setCoupons((cs) => cs.filter((c) => c.code !== code));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !receipt) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("event_id", eventId);
      form.set("name", name.trim());
      if (phone.trim()) form.set("phone", phone.trim());
      form.set("guest_count", String(guestCount));
      form.set("receipt", receipt);
      for (const c of coupons) form.append("coupon_code", c.code);

      const res = await fetch("/api/bookings", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo crear la reserva.");
        return;
      }
      setDone({ unusedCoupons: json.data?.unused_coupons ?? [] });
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
        {done.unusedCoupons.length > 0 && (
          <div className="mb-6 mx-auto max-w-sm px-4 py-3 rounded-sm border border-brass/40 bg-brass/10 text-left">
            <p className="font-body text-sm text-ink mb-1.5">
              {done.unusedCoupons.length === 1
                ? "Este cupón no hizo falta y sigue disponible para otra reserva:"
                : "Estos cupones no hicieron falta y siguen disponibles para otra reserva:"}
            </p>
            <ul className="flex flex-col gap-1">
              {done.unusedCoupons.map((code) => (
                <li key={code} className="flex items-center gap-2 font-label text-sm font-semibold text-ink select-all">
                  <Ticket size={14} className="text-brass shrink-0" /> {code}
                </li>
              ))}
            </ul>
          </div>
        )}
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
          <Input label="Email (el de tu cuenta)" type="email" value={accountEmail} readOnly disabled />
          <Input label="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Input
            label={`Cantidad de personas (máx. ${remaining})`}
            type="number"
            min={1}
            max={remaining}
            required
            value={guestCount}
            onChange={(e) => setGuestCount(Math.max(1, Math.min(remaining, Number(e.target.value) || 1)))}
            wrapperClassName="w-40 shrink-0"
          />
          <p className="flex items-start gap-2 flex-1 px-3 py-2 rounded-sm border border-brass/30 bg-brass/5 font-body text-xs text-ink-light">
            <Info size={14} className="text-brass shrink-0 mt-0.5" />
            <span>
              Recomendamos que cada participante tenga su propia{" "}
              <Link href="/sign-up" target="_blank" className="underline hover:text-brass">cuenta</Link>,
              así registramos su asistencia y puede avanzar en sus misiones.
            </span>
          </p>
        </div>
      </div>

      <div className="surface-parchment p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-label text-xs uppercase tracking-widest text-leather-light">Cupones de descuento</h2>
          <p className="font-body text-xs text-ink-light mt-1">Cada cupón descuenta 1 lugar. Podés cargar uno por persona.</p>
        </div>

        {coupons.length > 0 && (
          <ul className="flex flex-col gap-2">
            {coupons.map((c) => {
              const applies = usedSet.has(c);
              return (
                <li
                  key={c.code}
                  className={
                    applies
                      ? "flex items-center justify-between gap-3 px-3 py-2.5 rounded-sm border border-moss bg-moss/10"
                      : "flex items-center justify-between gap-3 px-3 py-2.5 rounded-sm border border-dashed border-border bg-parchment-dark/20"
                  }
                >
                  <span className={applies ? "flex items-center gap-2 flex-wrap font-label text-sm font-semibold text-moss-dark" : "flex items-center gap-2 flex-wrap font-label text-sm text-ink-light"}>
                    <Ticket size={16} /> {c.code} · -{c.discountPercent}%
                    {!applies && <span className="font-body text-2xs italic">— no se usa (más cupones que personas)</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCoupon(c.code)}
                    className="flex items-center gap-1 shrink-0 font-label text-2xs uppercase tracking-wide text-ink-light hover:text-crimson transition-colors"
                  >
                    <X size={13} /> Quitar
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-end gap-2">
          <Input
            label={coupons.length > 0 ? "Otro código (opcional)" : "Código (opcional)"}
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

        <div className="border-t border-border pt-4 flex flex-col gap-1.5">
          {used.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-ink-light">Subtotal</span>
                <span className="font-body text-sm text-ink-light">{formatARS(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-moss-dark">
                  Descuento ({used.length} {used.length === 1 ? "cupón" : "cupones"})
                </span>
                <span className="font-body text-sm text-moss-dark">-{formatARS(discount)}</span>
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
