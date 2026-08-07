// Transcribed from Reference/reference-data/classes/fury.txt
import type { FUClass } from "../types";

export const fury: FUClass = {
  id: "fury",
  name: "Fury",
  alsoKnownAs: ["Berserker", "Brawler", "Viking"],
  description:
    "Furies never know when to quit. In battle and life they are energetic, determined and " +
    "often restless. Whatever ideals or desires drive their actions, they will stop at " +
    "nothing and risk everything in order to achieve them. Some Furies undergo a rigid " +
    "training in order to control their emotions; others simply see might as the solution to " +
    "all problems and are constantly on the verge of letting rage get the best of them.",
  roleplayQuestions: [
    "Do you rely on your burning passion, or do you strive to keep it under control?",
    "There’s that one thing that always makes you lose it. What is it?",
    "In the past, your lack of control had tragic consequences. What have you lost?",
    "What do your weapons and fighting style look like?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Hit Points by 5.", statBonus: { stat: "hp", amount: 5 } },
    {
      text: "Gain the ability to equip martial melee weapons and martial armor.",
      equipGrant: { weapons: "melee", armor: true },
    },
  ],
  skills: [
    {
      name: "Adrenaline",
      maxLevel: 5,
      text:
        "As long as you are in Crisis, you deal【SL × 2】extra damage (be it with attacks, " +
        "spells, Arcana, items or any other method).",
    },
    {
      name: "Frenzy",
      maxLevel: 1,
      text:
        "Your Accuracy Checks with brawling, dagger, flail and thrown weapons trigger a " +
        "critical success if both dice show the same number (and the Check is not a fumble).",
    },
    {
      name: "Indomitable Spirit",
      maxLevel: 4,
      text:
        "When you spend one or more Fabula Points, you get an additional benefit — choose " +
        "one option: you recover【SL × 5】Hit Points; or you recover【SL × 5】Mind Points; or " +
        "you recover from a single status effect of your choice.",
    },
    {
      name: "Provoke",
      maxLevel: 5,
      text:
        "You may use an action and spend 5 Mind Points to perform an Opposed【MIG + WLP】 " +
        "Check against a creature you can see — describe how you taunt them! If you succeed, " +
        "the target suffers enraged and is compelled to focus their attention on you (their " +
        "attacks and offensive spells must include you among the targets if possible). This " +
        "compulsion ends if you fall unconscious or leave the scene, if the creature is no " +
        "longer enraged, or if they are successfully provoked by someone else. You gain a " +
        "bonus equal to【SL】to your【MIG + WLP】Checks for this Skill.",
    },
    {
      name: "Withstand",
      maxLevel: 5,
      text:
        "When you perform the Guard action, if you choose not to provide cover to another " +
        "creature, you recover Hit Points equal to【SL, multiplied by the highest strength " +
        "among your Bonds】and choose Might or Willpower: you treat the chosen Attribute as " +
        "being one die size higher (up to a maximum of d12) until the end of your next turn.",
    },
  ],
};
