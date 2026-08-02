"use client";

import * as React from "react";
import { Check, X, Ban, Receipt } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatARS, formatDateTime } from "@/lib/formatting";
import { toast } from "sonner";
import type { ShgBookingWithEvent, BookingStatus } from "@/types/database";

export function BookingsTable() {
  const [bookings, setBookings] = React.useState<ShgBookingWithEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<BookingStatus | "">("pending");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/bookings${params}`);
    const json = await res.json();
    setBookings(json.data ?? []);
    setLoading(false);
  }, [statusFilter]);

  React.useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: "approve" | "reject" | "cancel") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/${action}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "No se pudo procesar."); return; }
      toast.success("Listo.");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function viewReceipt(id: string) {
    const res = await fetch(`/api/admin/bookings/${id}/receipt-url`);
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Sin comprobante."); return; }
    window.open(json.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Reservas</h1>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "")} wrapperClassName="w-48">
          <option value="">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Confirmadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="cancelled">Canceladas</option>
        </Select>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : bookings.length === 0 ? (
        <p className="font-body italic text-parchment-dark">No hay reservas con este filtro.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((b) => (
            <div key={b.id} className="surface-parchment p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-label text-sm font-bold text-ink">{b.name}</p>
                  <StatusBadge status={b.status} />
                </div>
                <p className="font-body text-xs text-ink-light">
                  {b.event.title} · {formatDateTime(b.event.starts_at)}
                </p>
                <p className="font-body text-xs text-leather-light">
                  {b.email}{b.phone ? ` · ${b.phone}` : ""} · {b.guest_count} persona{b.guest_count !== 1 ? "s" : ""} · {formatARS(b.cost)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {b.receipt_path && (
                  <button onClick={() => viewReceipt(b.id)} className="p-1.5 text-leather-light hover:text-brass transition-colors" title="Ver comprobante">
                    <Receipt size={16} />
                  </button>
                )}
                {b.status === "pending" && (
                  <>
                    <button disabled={busyId === b.id} onClick={() => handleAction(b.id, "approve")} className="p-1.5 text-moss-dark hover:bg-moss/10 transition-colors disabled:opacity-40" title="Aprobar">
                      <Check size={16} />
                    </button>
                    <button disabled={busyId === b.id} onClick={() => handleAction(b.id, "reject")} className="p-1.5 text-crimson hover:bg-crimson/10 transition-colors disabled:opacity-40" title="Rechazar">
                      <X size={16} />
                    </button>
                  </>
                )}
                {b.status === "approved" && (
                  <button disabled={busyId === b.id} onClick={() => handleAction(b.id, "cancel")} className="p-1.5 text-crimson hover:bg-crimson/10 transition-colors disabled:opacity-40" title="Cancelar">
                    <Ban size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
