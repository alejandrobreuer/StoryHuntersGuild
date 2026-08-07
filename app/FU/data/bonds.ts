/**
 * Bonds — transcribed from Fabula_Ultima_Guide.pdf, "BONDS" (p.56) and the
 * shorter intro on p.35.
 *
 * Each Bond may carry up to three emotions, one from each of three
 * pairings — you can never have both emotions of the same pairing on the
 * same Bond. A Bond's strength equals its number of emotions (1-3).
 * Characters can have up to six Bonds at once, generally formed during
 * resting scenes.
 */

export type BondEmotionId = "admiration" | "inferiority" | "loyalty" | "mistrust" | "affection" | "hatred";

export interface BondEmotionDef {
  id: BondEmotionId;
  name: string;
  description: string;
}

export const bondEmotions: BondEmotionDef[] = [
  {
    id: "admiration",
    name: "Admiration",
    description:
      "You believe you have much to learn from this person and deeply respect them for their " +
      "efforts and achievements.",
  },
  {
    id: "inferiority",
    name: "Inferiority",
    description:
      "You envy this person or feel like you would be powerless against them. Their very " +
      "presence frustrates you, acting as a reminder of your failures.",
  },
  {
    id: "loyalty",
    name: "Loyalty",
    description:
      "This person has won your trust, or you believe in their ideals. You are ready to " +
      "endanger yourself to help or protect them.",
  },
  {
    id: "mistrust",
    name: "Mistrust",
    description: "You don't believe the words of this person and doubt their intentions.",
  },
  {
    id: "affection",
    name: "Affection",
    description:
      "You have tender feelings for this person, be they a love interest, a dear friend, or a " +
      "member of your family.",
  },
  {
    id: "hatred",
    name: "Hatred",
    description:
      "You can scarcely control yourself in the presence of this person, and would do anything " +
      "to see them broken and defeated.",
  },
];

export const bondEmotionsById: Record<BondEmotionId, BondEmotionDef> = Object.fromEntries(
  bondEmotions.map((e) => [e.id, e]),
) as Record<BondEmotionId, BondEmotionDef>;

/** Each pairing is mutually exclusive on a single Bond — pick at most one side. */
export const bondPairings: [BondEmotionId, BondEmotionId][] = [
  ["admiration", "inferiority"],
  ["loyalty", "mistrust"],
  ["affection", "hatred"],
];

export const MAX_BONDS = 6;

export const bondsRulesNote =
  "A Bond can carry up to three emotions — one from each pairing above — and its strength is " +
  "just how many it has (up to 3). Bonds are usually formed during resting scenes, can be " +
  "invoked like Traits to improve a roll, and can be re-shaped later as the story changes. You " +
  "can't have a Bond towards yourself, and you can have up to six at once.";
