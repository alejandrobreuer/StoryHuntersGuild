import type { GameStatus } from "@/types/database";

type SpecialGameStatus = Exclude<GameStatus, "available">;

export const GAME_STATUS_LABEL: Record<SpecialGameStatus, string> = {
  unavailable:   "No disponible",
  request_ahead: "Solicitar con tiempo",
};

export const GAME_STATUS_BADGE_CLASS: Record<SpecialGameStatus, string> = {
  unavailable:   "bg-crimson/15 text-crimson",
  request_ahead: "bg-brass/15 text-brass",
};

// Shared copy for the "qué significan estos estados" (!) popover — one
// popup covering both special statuses (not one per status), since either
// badge showing on a game links to the same explanation.
export const GAME_STATUS_INFO = {
  title: "Estados especiales de la Ludoteca",
  items: [
    {
      label: GAME_STATUS_LABEL.unavailable,
      description: "El juego es demasiado grande o complejo para llevarlo al próximo evento.",
    },
    {
      label: GAME_STATUS_LABEL.request_ahead,
      description:
        "Si querés jugarlo, escribinos para pedirlo con anticipación — al ser grande o complejo, necesitamos repasar las reglas antes de traerlo.",
    },
  ],
};
