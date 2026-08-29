"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GuildIdentityForm } from "./GuildIdentityForm";
import { GuildFeaturesManager } from "./GuildFeaturesManager";
import { GuildStatusManager } from "./GuildStatusManager";
import { GuildRanksManager } from "./GuildRanksManager";
import { LocationsManager } from "./LocationsManager";
import { RolQuestsManager } from "./RolQuestsManager";
import { NpcsManager } from "./NpcsManager";
import { RitualsProjectsCalculator } from "./RitualsProjectsCalculator";
import { DiceSettingsManager } from "./DiceSettingsManager";

const TABS = [
  { key: "guild", label: "Gremio" },
  { key: "map", label: "Mapa" },
  { key: "quests", label: "Misiones" },
  { key: "npcs", label: "NPCs" },
  { key: "rituals", label: "Rituales/Proyectos" },
  { key: "dice", label: "Dados" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function RolSettingsTabs() {
  const [tab, setTab] = React.useState<TabKey>("guild");
  // Bumped whenever the Guild Status catalog changes, so the identity form's
  // and features manager's status dropdowns pick up new/renamed tiers.
  const [statusRefresh, setStatusRefresh] = React.useState(0);

  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-6">Settings del Gremio</h1>

      <div className="mb-6 flex gap-1.5 border-b border-brass/20">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "font-label text-xs uppercase tracking-wide px-4 py-2.5 border-b-2 -mb-px transition-colors",
              tab === t.key ? "border-brass text-brass-bright" : "border-transparent text-parchment-dark hover:text-parchment"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "guild" && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <GuildIdentityForm refreshKey={statusRefresh} />
          <GuildStatusManager onChanged={() => setStatusRefresh((n) => n + 1)} />
          <GuildFeaturesManager refreshKey={statusRefresh} />
          <GuildRanksManager />
        </div>
      )}
      {tab === "map" && <LocationsManager />}
      {tab === "quests" && <RolQuestsManager />}
      {tab === "npcs" && <NpcsManager />}
      {tab === "rituals" && <RitualsProjectsCalculator />}
      {tab === "dice" && <DiceSettingsManager />}
    </div>
  );
}
