"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EpicCard, type EpicCardData } from "@/components/admin/planning/EpicCard";
import { NewEpicModal } from "@/components/admin/planning/NewEpicModal";
import { EPIC_STATUS_LABEL } from "@/lib/planning/status";
import { cn } from "@/lib/utils";
import type { PlanningEpicStatus, ShgPlanningAssignee } from "@/types/database";

const ALL_STATUSES = Object.keys(EPIC_STATUS_LABEL) as PlanningEpicStatus[];
const DEFAULT_STATUSES: PlanningEpicStatus[] = ["planning", "in_progress"];

export function EpicsGrid({ canManage }: { canManage: boolean }) {
  const [epics, setEpics] = React.useState<EpicCardData[]>([]);
  const [owners, setOwners] = React.useState<ShgPlanningAssignee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<PlanningEpicStatus[]>(DEFAULT_STATUSES);
  const [ownerFilter, setOwnerFilter] = React.useState("");
  const [hasOverdueOnly, setHasOverdueOnly] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter.length > 0) params.set("status", statusFilter.join(","));
    if (ownerFilter) params.set("ownerId", ownerFilter);
    if (hasOverdueOnly) params.set("hasOverdue", "1");
    const res = await fetch(`/api/admin/planning/epics?${params.toString()}`);
    setEpics((await res.json()).data ?? []);
    setLoading(false);
  }, [statusFilter, ownerFilter, hasOverdueOnly]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    fetch("/api/admin/planning/assignable-users").then((r) => r.json()).then((j) => setOwners(j.data ?? []));
  }, []);

  function toggleStatus(status: PlanningEpicStatus) {
    setStatusFilter((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  function handleModalClose() {
    setModalOpen(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-parchment">Planificación</h1>
        {canManage && (
          <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} className="mr-1" />Nueva épica</Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            className={cn(
              "font-label text-2xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors",
              statusFilter.includes(s)
                ? "bg-brass text-ink border-brass"
                : "bg-transparent text-parchment-dark border-parchment-dark/40 hover:border-brass hover:text-brass-bright"
            )}
          >
            {EPIC_STATUS_LABEL[s]}
          </button>
        ))}
        <Select wrapperClassName="w-48" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
          <option value="">Cualquier dueño</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
        <label className="flex items-center gap-2 font-body text-sm text-parchment-dark px-1">
          <input type="checkbox" className="accent-moss size-4" checked={hasOverdueOnly} onChange={(e) => setHasOverdueOnly(e.target.checked)} />
          Con atrasos
        </label>
      </div>

      {loading ? (
        <p className="font-body italic text-parchment-dark">Cargando…</p>
      ) : epics.length === 0 ? (
        <p className="font-body italic text-parchment-dark">No hay épicas con estos filtros.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {epics.map((e) => <EpicCard key={e.id} epic={e} />)}
        </div>
      )}

      <NewEpicModal open={modalOpen} onClose={handleModalClose} />
    </div>
  );
}
