// Transcribed from Reference/reference-data/classes/orator.txt
import type { FUClass } from "../types";

export const orator: FUClass = {
  id: "orator",
  name: "Orator",
  alsoKnownAs: ["Ambassador", "Diplomat", "Entertainer"],
  description:
    "Some are graceful and ever-smiling, others are subtle and witty: Orators are as good at " +
    "reading someone’s heart as they are at rounding up allies for their cause, sometimes " +
    "unintentionally. The words of an Orator may rekindle spirits or plunge their opponents " +
    "into despair: over the centuries, some Orators' talents have brought entire nations to " +
    "ruin... and just as many have granted fallen kingdoms a chance to rise from their very " +
    "ashes.",
  roleplayQuestions: [
    "Do you think everyone can be persuaded? Is it true that everyone has a price?",
    "You thought someone was on your side, but they betrayed you. Who are they?",
    "How do you feel about manipulating people, even if it is for a good cause?",
    "In the past, your words ended up putting you in trouble. What happened?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Mind Points by 5.", statBonus: { stat: "mp", amount: 5 } },
  ],
  skills: [
    {
      name: "Condemn",
      maxLevel: 4,
      text:
        "You may use an action and spend 5 Mind Points to perform an Opposed【INS + WLP】 " +
        "Check against a creature that can hear and understand you — describe your " +
        "accusations! If you succeed, the target loses【SL × 10】Mind Points and suffers " +
        "dazed or shaken (your choice). You gain a bonus equal to【SL】to your【INS + WLP】" +
        "Checks for this Skill.",
    },
    {
      name: "Encourage",
      maxLevel: 6,
      text:
        "During a conflict, you may use an action and spend 5 Mind Points to choose another " +
        "creature that can hear and understand you. That creature recovers【SL × 5】Hit " +
        "Points and chooses Dexterity, Insight, Might, or Willpower: they treat the chosen " +
        "Attribute as being one die size higher (up to a maximum of d12) until the start of " +
        "your next turn.",
    },
    {
      name: "My Trust in You",
      maxLevel: 2,
      text:
        "After another Player Character who is able to hear you performs a Check, you may " +
        "spend 1 Fabula Point and invoke one of their Traits or Bonds in order to let them " +
        "reroll dice or improve the Result of the Check (following the normal rules). Then, " +
        "if you have a Bond towards that character, they recover【SL × 10】Mind Points.",
    },
    {
      name: "Persuasive",
      maxLevel: 2,
      text:
        "When you successfully perform a Check to fill or erase sections of a Clock, if your " +
        "approach relied on charm, diplomacy, deception or intimidation, you may spend up to " +
        "【SL × 20】Mind Points. If you do, fill or erase an additional section of that Clock " +
        "for every 20 Mind Points you spend this way.",
    },
    {
      name: "Unexpected Ally",
      maxLevel: 1,
      text:
        "You may use an action and spend 1 Fabula Point to choose a non-hostile creature able " +
        "to hear and understand you. If you do, that creature becomes helpful towards you so " +
        "long as you are kind and respectful to them and your requests are reasonable.",
    },
  ],
};
