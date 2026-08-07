// Transcribed from Reference/reference-data/classes/guardian.txt
import type { FUClass } from "../types";

export const guardian: FUClass = {
  id: "guardian",
  name: "Guardian",
  alsoKnownAs: ["Paladin", "Soldier", "Yōjinbō"],
  description:
    "Proud and selfless, Guardians are individuals who know the value of life... and are " +
    "willing to sacrifice themselves for a person, nation or ideal they have sworn to " +
    "protect. They are often extraordinary and impressive individuals, such as valiant " +
    "soldiers or veterans scarred by a thousand battles. While some Guardians may appear " +
    "loud and boisterous, many are simply masking the tormented memory of those they " +
    "failed to protect.",
  roleplayQuestions: [
    "Who or what is it you would gladly give your life to protect?",
    "Are you, or have you ever been, the servant of a Lady or Lord? What were they like?",
    "What is it you were unable to protect? What have you lost?",
    "What are you using as your armor and/or shield?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Hit Points by 5.", statBonus: { stat: "hp", amount: 5 } },
    {
      text: "Gain the ability to equip martial armor and martial shields.",
      equipGrant: { armor: true, shields: true },
    },
  ],
  skills: [
    {
      name: "Bodyguard",
      maxLevel: 1,
      text:
        "If you perform the Guard action and choose to provide cover to another creature, " +
        "that creature gains Resistance to all damage types until the start of your next turn.",
    },
    {
      name: "Defensive Mastery",
      maxLevel: 5,
      text:
        "As long as you have a shield or a martial armor equipped, all damage you suffer is " +
        "reduced by【SL】(applied before damage Affinities).",
    },
    {
      name: "Dual Shieldbearer",
      maxLevel: 1,
      text:
        "You may now equip a shield in your main hand slot. As long as you have two shields " +
        "equipped, you gain the benefits of both items and may treat them as the following " +
        "combined two-handed melee brawling weapon:\n\n" +
        "Twin Shields — 【MIG + MIG】 accuracy, 【HR + 5】physical damage. Deals extra damage " +
        "equal to your【SL】in Defensive Mastery (above).",
    },
    {
      name: "Fortress",
      maxLevel: 5,
      text: "Permanently increase your maximum Hit Points by【SL × 3】.",
    },
    {
      name: "Protect",
      maxLevel: 1,
      text:
        "When another creature is threatened by an attack, spell or other danger, you may " +
        "take their place (any Checks that are part of the danger will be performed against " +
        "you; you may declare the use of this Skill before or after the Checks have been " +
        "made). If the danger already affected you, it affects you twice (resolve both " +
        "instances separately); you also cannot protect multiple creatures from the same " +
        "danger. If you use this Skill during a conflict, you cannot use it again until the " +
        "start of your next turn.",
    },
  ],
};
