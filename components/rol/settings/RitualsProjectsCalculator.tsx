"use client";

import * as React from "react";

interface RitualDiscipline { id: string; name: string; magic_check: string; example_uses: string }
interface RitualPotency { id: string; name: string; mp_base_cost: number; difficulty: number; examples: string }
interface RitualArea { id: string; name: string; mp_multiplier: number; examples: string }
interface ProjectPotency { id: string; name: string; base_cost: number; capabilities: string }
interface ProjectArea { id: string; name: string; cost_multiplier: number; examples: string }
interface ProjectUses { id: string; name: string; cost_multiplier: number; description: string }

interface Data {
  ritualDisciplines: RitualDiscipline[];
  ritualPotencies: RitualPotency[];
  ritualAreas: RitualArea[];
  projectPotencies: ProjectPotency[];
  projectAreas: ProjectArea[];
  projectUses: ProjectUses[];
}

function Picker<T extends { id: string; name: string }>({
  label, options, value, onChange,
}: { label: string; options: T[]; value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <label className="font-label text-2xs uppercase tracking-wide text-ink-light">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-border bg-parchment/60 px-2 py-1.5 text-sm text-ink font-body focus:border-brass focus:outline-none"
      >
        <option value="">Elegí…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

// Loremaster Rituals: cost = Potency's MP base cost × Area's MP multiplier;
// the Magic Check's target DL comes from the chosen Potency (Reference/
// fabula-ultima-rules-notes.md, Rituals — Discipline sets *which* check,
// Potency sets both cost and difficulty, Area scales the cost).
function RitualCalculator({ data }: { data: Data }) {
  const [disciplineId, setDisciplineId] = React.useState("");
  const [potencyId, setPotencyId] = React.useState("");
  const [areaId, setAreaId] = React.useState("");

  const discipline = data.ritualDisciplines.find((d) => d.id === disciplineId);
  const potency = data.ritualPotencies.find((p) => p.id === potencyId);
  const area = data.ritualAreas.find((a) => a.id === areaId);
  const totalMp = potency && area ? Math.round(potency.mp_base_cost * area.mp_multiplier) : null;

  return (
    <div className="surface-parchment p-5">
      <h3 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-4">Costo de un Ritual (Loremaster)</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Picker label="Disciplina" options={data.ritualDisciplines} value={disciplineId} onChange={setDisciplineId} />
        <Picker label="Potencia" options={data.ritualPotencies} value={potencyId} onChange={setPotencyId} />
        <Picker label="Área" options={data.ritualAreas} value={areaId} onChange={setAreaId} />
      </div>

      {(discipline || potency || area) && (
        <div className="mt-4 pt-4 border-t border-border/60 space-y-2 text-xs text-ink-light font-body">
          {discipline && <p><strong className="text-ink">Verificación:</strong> {discipline.magic_check} — {discipline.example_uses}</p>}
          {potency && <p><strong className="text-ink">Dificultad:</strong> {potency.difficulty} — {potency.examples}</p>}
          {area && <p><strong className="text-ink">Alcance:</strong> ×{area.mp_multiplier} PM — {area.examples}</p>}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/60 flex items-baseline justify-between">
        <span className="font-label text-xs uppercase tracking-wide text-ink-light">Costo total</span>
        <span className="font-display text-2xl font-bold text-brass-bright">{totalMp != null ? `${totalMp} PM` : "—"}</span>
      </div>
    </div>
  );
}

// Tinkerer Projects: cost = Potency's base zenit cost × Area multiplier ×
// Uses multiplier (Consumable ×1, Permanent ×5).
function ProjectCalculator({ data }: { data: Data }) {
  const [potencyId, setPotencyId] = React.useState("");
  const [areaId, setAreaId] = React.useState("");
  const [usesId, setUsesId] = React.useState("");

  const potency = data.projectPotencies.find((p) => p.id === potencyId);
  const area = data.projectAreas.find((a) => a.id === areaId);
  const uses = data.projectUses.find((u) => u.id === usesId);
  const totalCost = potency && area && uses ? Math.round(potency.base_cost * area.cost_multiplier * uses.cost_multiplier) : null;

  return (
    <div className="surface-parchment p-5">
      <h3 className="font-label text-sm font-bold uppercase tracking-widest text-ink mb-4">Costo de un Proyecto (Tinkerer)</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Picker label="Potencia" options={data.projectPotencies} value={potencyId} onChange={setPotencyId} />
        <Picker label="Área" options={data.projectAreas} value={areaId} onChange={setAreaId} />
        <Picker label="Usos" options={data.projectUses} value={usesId} onChange={setUsesId} />
      </div>

      {(potency || area || uses) && (
        <div className="mt-4 pt-4 border-t border-border/60 space-y-2 text-xs text-ink-light font-body">
          {potency && <p><strong className="text-ink">Capacidades:</strong> {potency.capabilities}</p>}
          {area && <p><strong className="text-ink">Alcance:</strong> ×{area.cost_multiplier} — {area.examples}</p>}
          {uses && <p><strong className="text-ink">Usos:</strong> ×{uses.cost_multiplier} — {uses.description}</p>}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/60 flex items-baseline justify-between">
        <span className="font-label text-xs uppercase tracking-wide text-ink-light">Costo total</span>
        <span className="font-display text-2xl font-bold text-brass-bright">{totalCost != null ? `${totalCost} z` : "—"}</span>
      </div>
    </div>
  );
}

// GM-facing procedures for costing/adjudicating Loremaster Rituals and
// Tinkerer Projects — these are point-buy calculators, not fixed catalogs
// like the rest of the character sheet's reference data (Reference/
// fabula_ultima_database.xlsx's Read Me sheet), so they live here in DM
// settings rather than on the player-facing sheet.
export function RitualsProjectsCalculator() {
  const [data, setData] = React.useState<Data | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/rol/fu-procedures")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "No se pudieron cargar las tablas."); return; }
        setData(json.data);
      })
      .catch(() => setError("No se pudieron cargar las tablas."));
  }, []);

  if (error) return <p className="font-body text-crimson text-sm">{error}</p>;
  if (!data) return <p className="font-body italic text-ink-light text-sm">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <RitualCalculator data={data} />
      <ProjectCalculator data={data} />
    </div>
  );
}
