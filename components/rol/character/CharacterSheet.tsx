"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { classesById } from "@/app/FU/data/classes";
import { bondEmotionsById, bondPairings, bondsRulesNote, MAX_BONDS, type BondEmotionId } from "@/app/FU/data/bonds";
import { fabulaPointGains, fabulaPointUses, fabulaPointsNote } from "@/app/FU/data/reference";
import { statusEffects, statusEffectRulesNote, type AttributeKey } from "@/app/FU/data/statusEffects";
import { calcDerivedStats, currentAttributes, findEquipmentItem } from "@/app/FU/lib/derivedStats";
import type { FUBond, FUCharacter, FUCharacterAttributes } from "@/app/FU/lib/types";
import { InfoDisclosure } from "./InfoDisclosure";
import { SkillText } from "./SkillText";
import { StatBar } from "./StatBar";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-parchment p-4 text-center">
      <div className="font-label text-xs uppercase tracking-wide text-ink-light">{label}</div>
      <div className="font-display text-2xl font-bold text-brass-bright">{value}</div>
    </div>
  );
}

function SheetSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-parchment">{title}</h2>
        {action}
      </div>
      <div className="surface-parchment p-6">{children}</div>
    </section>
  );
}

const ATTRIBUTE_ROWS: { key: AttributeKey; label: string }[] = [
  { key: "dexterity", label: "Destreza" },
  { key: "insight", label: "Perspicacia" },
  { key: "might", label: "Vigor" },
  { key: "willpower", label: "Voluntad" },
];

function AttributesAndStatusPanel({ character, current, onUpdate }: { character: FUCharacter; current: FUCharacterAttributes; onUpdate: (updated: FUCharacter) => void }) {
  function toggleEffect(id: string) {
    const active = character.statusEffects.includes(id);
    const next = active ? character.statusEffects.filter((e) => e !== id) : [...character.statusEffects, id];
    onUpdate({ ...character, statusEffects: next, updatedAt: new Date().toISOString() });
  }

  return (
    <SheetSection title="Atributos y estados">
      <div className="grid gap-2.5">
        {ATTRIBUTE_ROWS.map(({ key, label }) => {
          const base = character.attributes[key];
          const curr = current[key];
          const reduced = curr !== base;
          return (
            <div key={key} className="flex items-center justify-between border border-border px-4 py-2.5">
              <span className="text-sm font-semibold text-ink font-body">{label}</span>
              <span className="font-label text-sm">
                <span className={reduced ? "text-ink-light line-through" : "text-brass-bright"}>d{base}</span>
                {reduced && <span className="ml-1.5 text-crimson">d{curr}</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {statusEffects.map((effect) => {
          const active = character.statusEffects.includes(effect.id);
          return (
            <div key={effect.id} className={cn("flex items-center gap-2 border px-3 py-2.5 text-sm", active ? "border-crimson bg-crimson/10" : "border-border")}>
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={active} onChange={() => toggleEffect(effect.id)} className="h-4 w-4 accent-crimson" />
                <span className={cn("font-body", active ? "font-semibold text-crimson" : "text-ink")}>{effect.name}</span>
              </label>
              <InfoDisclosure label={`Qué hace ${effect.name}`}>{effect.description}</InfoDisclosure>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-light font-body">{statusEffectRulesNote}</p>
    </SheetSection>
  );
}

function FabulaPointsPanel({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  function adjust(delta: number) {
    onUpdate({ ...character, fabulaPoints: Math.max(0, character.fabulaPoints + delta), updatedAt: new Date().toISOString() });
  }

  return (
    <SheetSection title="Puntos de Fábula">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => adjust(-1)} aria-label="Gastar un Punto de Fábula" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-2xl leading-none text-ink hover:border-brass">−</button>
        <span className="font-display w-12 text-center text-3xl font-bold text-brass-bright">{character.fabulaPoints}</span>
        <button type="button" onClick={() => adjust(1)} aria-label="Ganar un Punto de Fábula" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-2xl leading-none text-ink hover:border-brass">+</button>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink-light">Ganás un punto cuando…</p>
          <ul className="mt-1.5 space-y-1.5 text-sm leading-snug text-ink font-body">{fabulaPointGains.map((g, i) => <li key={i}>· {g}</li>)}</ul>
        </div>
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink-light">Gastás un punto para…</p>
          <ul className="mt-1.5 space-y-1.5 text-sm leading-snug text-ink font-body">{fabulaPointUses.map((u, i) => <li key={i}>· {u}</li>)}</ul>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-light font-body">{fabulaPointsNote}</p>
    </SheetSection>
  );
}

function BondEditor({ bond, onChange, onRemove }: { bond: FUBond; onChange: (bond: FUBond) => void; onRemove: () => void }) {
  function toggle(pair: [BondEmotionId, BondEmotionId], emotionId: BondEmotionId) {
    const [a, b] = pair;
    const isActive = bond.emotions.includes(emotionId);
    const withoutPair = bond.emotions.filter((e) => e !== a && e !== b);
    onChange({ ...bond, emotions: isActive ? withoutPair : [...withoutPair, emotionId] });
  }

  return (
    <div className="border border-border p-4">
      <div className="flex items-center gap-3">
        <input
          value={bond.name}
          onChange={(e) => onChange({ ...bond, name: e.target.value })}
          placeholder="¿Con quién o qué es este Vínculo?"
          className="flex-1 border border-border bg-parchment/60 px-3 py-2 text-sm text-ink placeholder:text-leather-light/70 focus:border-brass focus:outline-none font-body"
        />
        <span className="font-label whitespace-nowrap text-xs uppercase tracking-wide text-brass-bright">Fuerza {bond.emotions.length}</span>
        <button type="button" onClick={onRemove} aria-label="Quitar Vínculo" className="text-leather-light hover:text-crimson">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {bondPairings.map((pair) => (
          <div key={pair.join("-")} className="flex gap-2">
            {pair.map((emotionId) => {
              const emotion = bondEmotionsById[emotionId];
              const active = bond.emotions.includes(emotionId);
              return (
                <button
                  key={emotionId}
                  type="button"
                  onClick={() => toggle(pair, emotionId)}
                  className={cn(
                    "flex-1 border px-2.5 py-1.5 text-xs font-body transition-colors",
                    active ? "border-brass bg-brass/10 font-semibold text-brass-bright" : "border-border text-ink-light hover:border-brass"
                  )}
                >
                  {emotion.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function BondsPanel({ character, onUpdate }: { character: FUCharacter; onUpdate: (updated: FUCharacter) => void }) {
  function updateBond(index: number, bond: FUBond) {
    onUpdate({ ...character, bonds: character.bonds.map((b, i) => (i === index ? bond : b)), updatedAt: new Date().toISOString() });
  }
  function removeBond(index: number) {
    onUpdate({ ...character, bonds: character.bonds.filter((_, i) => i !== index), updatedAt: new Date().toISOString() });
  }
  function addBond() {
    if (character.bonds.length >= MAX_BONDS) return;
    onUpdate({ ...character, bonds: [...character.bonds, { name: "", emotions: [] }], updatedAt: new Date().toISOString() });
  }

  return (
    <SheetSection
      title="Vínculos"
      action={
        <button
          type="button"
          onClick={addBond}
          disabled={character.bonds.length >= MAX_BONDS}
          className="font-label border border-brass/50 px-3 py-1.5 text-xs uppercase tracking-wide text-brass transition-colors hover:bg-brass/10 disabled:opacity-30"
        >
          + Vínculo ({character.bonds.length}/{MAX_BONDS})
        </button>
      }
    >
      {character.bonds.length === 0 ? (
        <p className="text-sm text-ink-light font-body">Todavía no hay Vínculos — suelen formarse en escenas de descanso, a medida que avanza la historia.</p>
      ) : (
        <div className="space-y-3">{character.bonds.map((bond, i) => <BondEditor key={i} bond={bond} onChange={(b) => updateBond(i, b)} onRemove={() => removeBond(i)} />)}</div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-ink-light font-body">{bondsRulesNote}</p>
    </SheetSection>
  );
}

export function CharacterSheet({
  character,
  backHref,
  onUpdate,
}: {
  character: FUCharacter;
  backHref: string;
  onUpdate: (updated: FUCharacter) => void;
}) {
  const classes = character.classLevels.map((cl) => classesById[cl.classId]).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const current = currentAttributes(character.attributes, character.statusEffects);
  const stats = calcDerivedStats(character.attributes, character.equipment, classes, character.statusEffects);

  const equippedWeapons = character.equipment.weapons.map((id) => findEquipmentItem(id)).filter(Boolean);
  const equippedShield = character.equipment.shield ? findEquipmentItem(character.equipment.shield) : undefined;
  const equippedArmor = character.equipment.armor ? findEquipmentItem(character.equipment.armor) : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <Link href={backHref} className="font-label text-xs uppercase tracking-widest text-parchment-dark hover:text-parchment">
        ← Mis personajes
      </Link>

      <header className="surface-parchment p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-3xl font-extrabold text-ink lg:text-4xl">{character.name || "Héroe sin nombre"}</h1>
          <span className="font-label rounded-full border border-brass/50 px-4 py-1.5 text-xs uppercase tracking-wide text-brass">NV {character.level}</span>
        </div>
        {character.pronouns && <p className="mt-1 text-xs text-ink-light font-body">{character.pronouns}</p>}
        <div className="mt-4 grid gap-1 sm:grid-cols-3">
          <p className="text-sm text-ink font-body"><span className="font-label text-moss">Identidad </span>{character.identity}</p>
          <p className="text-sm text-ink font-body"><span className="font-label text-moss">Tema </span>{character.theme}</p>
          <p className="text-sm text-ink font-body"><span className="font-label text-moss">Origen </span>{character.origin}</p>
        </div>
        {character.appearance && <p className="mt-4 text-sm italic leading-relaxed text-ink-light font-body">{character.appearance}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-5">
          <AttributesAndStatusPanel character={character} current={current} onUpdate={onUpdate} />

          <SheetSection title="Vitalidad">
            <div className="space-y-4">
              <StatBar label="Puntos de Vida" value={stats.hp.value} max={stats.hp.value} color="moss" markerAt={stats.crisis.value} />
              <StatBar label="Puntos de Mente" value={stats.mp.value} max={stats.mp.value} color="brass" />
              <StatBar label="Puntos de Inventario" value={stats.ip.value} max={stats.ip.value} color="brass" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <StatTile label="Crisis" value={stats.crisis.value} />
                <StatTile label="Defensa" value={stats.defense.value} />
                <StatTile label="Def. Mágica" value={stats.magicDefense.value} />
                <StatTile label="Iniciativa" value={stats.initiative.value} />
              </div>
              <p className="font-label text-xs text-ink-light">Crisis: la mitad de tu PV máximo, redondeado hacia abajo.</p>
            </div>
          </SheetSection>

          <FabulaPointsPanel character={character} onUpdate={onUpdate} />
          <BondsPanel character={character} onUpdate={onUpdate} />
        </div>

        <div className="space-y-6 lg:col-span-7">
          <section>
            <h2 className="font-display mb-3 text-xl font-bold text-parchment">Clases y habilidades</h2>
            <div className={cn("grid gap-4", character.classLevels.length > 1 && "xl:grid-cols-2")}>
              {character.classLevels.map((cl) => {
                const cls = classesById[cl.classId];
                if (!cls) return null;
                const counts = new Map<string, number>();
                for (const name of cl.skillsTaken) counts.set(name, (counts.get(name) ?? 0) + 1);
                return (
                  <div key={cl.classId}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="font-display text-lg font-bold text-parchment">{cls.name}</span>
                      <span className="font-label text-xs uppercase tracking-wide text-parchment-dark">Nv {cl.levels}</span>
                    </div>
                    <div className="surface-parchment p-5">
                      <ul className="space-y-1 text-sm text-ink-light font-body">{cls.freeBenefits.map((b, i) => <li key={i}>· {b.text}</li>)}</ul>
                      <div className="mt-4 space-y-3">
                        {Array.from(counts.entries()).map(([name, count]) => {
                          const skill = cls.skills.find((s) => s.name === name);
                          if (!skill) return null;
                          return (
                            <div key={name} className="border border-border p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-ink font-body">{skill.name}</span>
                                {skill.maxLevel > 1 && <span className="font-label text-xs text-moss">NH {count}/{skill.maxLevel}</span>}
                              </div>
                              <SkillText text={skill.text} skillLevel={count} className="mt-1.5 text-sm leading-snug text-ink-light font-body" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <SheetSection title="Equipo">
            <div className="grid gap-3 sm:grid-cols-2">
              {equippedWeapons.map((w) => w && (
                <div key={w.id} className="border border-border p-3 text-sm font-body">
                  <div className="font-semibold text-ink">{w.name}</div>
                  {"accuracy" in w && <div className="text-xs text-moss">{w.accuracy} → {w.damage}</div>}
                </div>
              ))}
              {equippedShield && (
                <div className="border border-border p-3 text-sm font-body">
                  <div className="font-semibold text-ink">{equippedShield.name}</div>
                  {"defenseBonus" in equippedShield && <div className="text-xs text-moss">Def +{equippedShield.defenseBonus} · Def.M +{equippedShield.magicDefenseBonus}</div>}
                </div>
              )}
              {equippedArmor && (
                <div className="border border-border p-3 text-sm font-body">
                  <div className="font-semibold text-ink">{equippedArmor.name}</div>
                </div>
              )}
              {equippedWeapons.length === 0 && !equippedShield && !equippedArmor && <p className="text-sm text-ink-light font-body">Sin equipo.</p>}
            </div>
            <p className="font-label mt-4 text-sm text-brass-bright">{character.zenit} z</p>
          </SheetSection>
        </div>
      </div>
    </div>
  );
}
