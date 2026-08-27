import type { RolIconOutlineColor } from "@/types/database";

export interface IconOutlineColorOption {
  id:    RolIconOutlineColor;
  label: string;
  hex:   string;
}

export const ICON_OUTLINE_COLORS: IconOutlineColorOption[] = [
  { id: "black", label: "Negro",  hex: "#000000" },
  { id: "red",   label: "Rojo",   hex: "#e6392a" },
  { id: "white", label: "Blanco", hex: "#ffffff" },
];
