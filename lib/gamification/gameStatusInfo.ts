import type { GameStatus } from "@/types/database";

type SpecialGameStatus = Exclude<GameStatus, "available">;

export const GAME_STATUS_LABEL: Record<SpecialGameStatus, string> = {
  unavailable:   "No disponible",
  request_ahead: "Solicitar con tiempo",
};

// Translucent chip — used where the badge sits on its own light
// (surface-parchment) card, e.g. the game detail popup.
export const GAME_STATUS_BADGE_CLASS: Record<SpecialGameStatus, string> = {
  unavailable:   "bg-crimson/15 text-crimson",
  request_ahead: "bg-brass/15 text-brass",
};

// Solid/opaque banner — used where the badge overlays a game's own cover
// image instead of a light card, so it needs to stay legible regardless of
// what colors are underneath it.
export const GAME_STATUS_BANNER_CLASS: Record<SpecialGameStatus, string> = {
  unavailable:   "bg-crimson text-crimson-foreground",
  request_ahead: "bg-brass text-ink",
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
