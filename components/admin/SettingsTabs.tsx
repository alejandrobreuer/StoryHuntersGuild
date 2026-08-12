"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { RanksManager } from "@/components/admin/RanksManager";
import { BadgesManager } from "@/components/admin/BadgesManager";
import { TagsManager } from "@/components/admin/TagsManager";
import { FeatureFlagsManager } from "@/components/admin/FeatureFlagsManager";
import { RolesManager } from "@/components/admin/RolesManager";
import type { PermissionKey } from "@/types/database";

const TABS = [
  { key: "general",       label: "General",    perm: "settings" as PermissionKey,      Component: SettingsForm },
  { key: "ranks",         label: "Rangos",      perm: "ranks" as PermissionKey,          Component: RanksManager },
  { key: "badges",        label: "Insignias",   perm: "badges" as PermissionKey,         Component: BadgesManager },
  { key: "tags",          label: "Tags",        perm: "tags" as PermissionKey,           Component: TagsManager },
  { key: "roles",         label: "Roles",       perm: "roles" as PermissionKey,          Component: RolesManager },
  { key: "feature_flags", label: "Funciones",   perm: "feature_flags" as PermissionKey,  Component: FeatureFlagsManager },
];

interface SettingsTabsProps {
  permissions: Record<PermissionKey, boolean>;
}

export function SettingsTabs({ permissions }: SettingsTabsProps) {
  const visibleTabs = TABS.filter((t) => permissions[t.perm]);
  const [active, setActive] = React.useState(visibleTabs[0]?.key);

  const current = visibleTabs.find((t) => t.key === active) ?? visibleTabs[0];

  if (!current) {
    return <p className="font-body italic text-parchment-dark">No tenés acceso a ninguna sección de configuración.</p>;
  }

  const ActiveComponent = current.Component;

  return (
    <div>
      <h1 className="font-display text-2xl text-parchment mb-6">Configuración</h1>
      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-brass/20 pb-3">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "font-label text-2xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-sm border transition-colors",
              current.key === t.key ? "bg-brass text-ink border-brass" : "border-parchment-dark/40 text-parchment-dark hover:border-brass"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  );
}
