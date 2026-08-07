"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { createElement } from "react";
import type { DieSize } from "../data/types";
import { classicCharacters } from "../data/classicCharacters";
import { classesById } from "../data/classes";
import {
  ATTRIBUTE_PRESETS,
  emptyDraft,
  type FUAttributePreset,
  type FUCharacterEquipment,
  type FUDraft,
} from "./types";

export const TOTAL_CREATION_LEVELS = 5;
export const MIN_CLASSES = 2;
export const MAX_CLASSES = 3;
export const WIZARD_STEP_COUNT = 8;

export type WizardAction =
  | { type: "SET_IDENTITY"; value: string }
  | { type: "SET_THEME"; value: string }
  | { type: "SET_ORIGIN"; value: string }
  | { type: "ADD_CLASS_SLOT"; classId: string }
  | { type: "REMOVE_CLASS_SLOT"; classId: string }
  | { type: "SET_CLASS_LEVELS"; classId: string; levels: number }
  | { type: "SET_CLASS_SKILLS"; classId: string; skillsTaken: string[] }
  | { type: "SET_ATTRIBUTE_PRESET"; preset: FUAttributePreset }
  | { type: "SET_ATTRIBUTE"; attribute: keyof FUDraft["attributes"]; value: DieSize }
  | { type: "EQUIP_WEAPON"; weaponId: string; slot: 0 | 1 }
  | { type: "UNEQUIP_WEAPON"; slot: 0 | 1 }
  | { type: "EQUIP_SHIELD"; shieldId: string | undefined }
  | { type: "EQUIP_ARMOR"; armorId: string | undefined }
  | { type: "ROLL_SAVINGS"; result: number }
  | { type: "SET_NAME"; value: string }
  | { type: "SET_PRONOUNS"; value: string }
  | { type: "SET_APPEARANCE"; value: string }
  | { type: "LOAD_TEMPLATE"; templateId: string }
  | { type: "RESET" };

export function wizardReducer(state: FUDraft, action: WizardAction): FUDraft {
  switch (action.type) {
    case "SET_IDENTITY":
      return { ...state, identity: action.value };
    case "SET_THEME":
      return { ...state, theme: action.value };
    case "SET_ORIGIN":
      return { ...state, origin: action.value };

    case "ADD_CLASS_SLOT": {
      if (state.classLevels.some((cl) => cl.classId === action.classId)) return state;
      if (state.classLevels.length >= MAX_CLASSES) return state;
      return {
        ...state,
        classLevels: [...state.classLevels, { classId: action.classId, levels: 0, skillsTaken: [] }],
      };
    }
    case "REMOVE_CLASS_SLOT":
      return { ...state, classLevels: state.classLevels.filter((cl) => cl.classId !== action.classId) };

    case "SET_CLASS_LEVELS":
      return {
        ...state,
        classLevels: state.classLevels.map((cl) =>
          cl.classId === action.classId
            ? { ...cl, levels: action.levels, skillsTaken: cl.skillsTaken.slice(0, action.levels) }
            : cl,
        ),
      };

    case "SET_CLASS_SKILLS":
      return {
        ...state,
        classLevels: state.classLevels.map((cl) =>
          cl.classId === action.classId ? { ...cl, skillsTaken: action.skillsTaken } : cl,
        ),
      };

    case "SET_ATTRIBUTE_PRESET": {
      if (action.preset === "custom") return { ...state, attributePreset: "custom" };
      const [a, b, c, d] = ATTRIBUTE_PRESETS[action.preset];
      return {
        ...state,
        attributePreset: action.preset,
        attributes: { dexterity: a, insight: b, might: c, willpower: d },
      };
    }
    case "SET_ATTRIBUTE":
      return { ...state, attributes: { ...state.attributes, [action.attribute]: action.value } };

    case "EQUIP_WEAPON": {
      const weapons = [...state.equipment.weapons];
      weapons[action.slot] = action.weaponId;
      return { ...state, equipment: { ...state.equipment, weapons: weapons.filter(Boolean) } };
    }
    case "UNEQUIP_WEAPON": {
      const weapons = [...state.equipment.weapons];
      weapons.splice(action.slot, 1);
      return { ...state, equipment: { ...state.equipment, weapons } };
    }
    case "EQUIP_SHIELD":
      return { ...state, equipment: { ...state.equipment, shield: action.shieldId } };
    case "EQUIP_ARMOR":
      return { ...state, equipment: { ...state.equipment, armor: action.armorId } };

    case "ROLL_SAVINGS":
      return { ...state, savingsRoll: action.result };

    case "SET_NAME":
      return { ...state, name: action.value };
    case "SET_PRONOUNS":
      return { ...state, pronouns: action.value };
    case "SET_APPEARANCE":
      return { ...state, appearance: action.value };

    case "LOAD_TEMPLATE": {
      const template = classicCharacters.find((t) => t.id === action.templateId);
      if (!template) return state;
      const equipment: FUCharacterEquipment = { weapons: [] };
      return {
        ...emptyDraft(),
        identity: state.identity,
        theme: state.theme,
        origin: state.origin,
        attributePreset: "custom",
        attributes: { ...template.attributes },
        classLevels: template.classLevels.map((cl) => ({
          classId: cl.classId,
          levels: cl.levels,
          skillsTaken: [],
        })),
        equipment,
        templateId: template.id,
        name: template.name,
      };
    }

    case "RESET":
      return emptyDraft();

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Selectors — pure helpers over a draft, used by the wizard shell + steps
// ---------------------------------------------------------------------------

export function totalLevelsPlaced(draft: FUDraft): number {
  return draft.classLevels.reduce((sum, cl) => sum + cl.levels, 0);
}

export function classCount(draft: FUDraft): number {
  return draft.classLevels.filter((cl) => cl.levels > 0).length;
}

export function isClassStepValid(draft: FUDraft): boolean {
  const count = classCount(draft);
  return totalLevelsPlaced(draft) === TOTAL_CREATION_LEVELS && count >= MIN_CLASSES && count <= MAX_CLASSES;
}

export function selectedClasses(draft: FUDraft) {
  return draft.classLevels
    .filter((cl) => cl.levels > 0)
    .map((cl) => classesById[cl.classId])
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface WizardContextValue {
  draft: FUDraft;
  dispatch: Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children, initialDraft }: { children: ReactNode; initialDraft?: FUDraft }) {
  const [draft, dispatch] = useReducer(wizardReducer, initialDraft ?? emptyDraft());
  return createElement(WizardContext.Provider, { value: { draft, dispatch } }, children);
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within a WizardProvider");
  return ctx;
}
