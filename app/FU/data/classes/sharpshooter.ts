// Transcribed from Reference/reference-data/classes/sharpshooter.txt
import type { FUClass } from "../types";

export const sharpshooter: FUClass = {
  id: "sharpshooter",
  name: "Sharpshooter",
  alsoKnownAs: ["Archer", "Gunslinger", "Sniper"],
  description:
    "A majority of Sharpshooters are exceptionally good at dealing with threats from a " +
    "carefully calculated distance; others are brave, skilled or reckless enough to engage " +
    "their foes at point-blank. While many of these skilled snipers are battle-hardened " +
    "soldiers, some have turned to a life of piracy, bounty hunting or banditry. A few have " +
    "put their abilities at the service of the people, or use them to protect a sacred or " +
    "forbidden site from intruders.",
  roleplayQuestions: [
    "Some believe arrows and bullets to be a coward's weapons. What's your opinion?",
    "When caught unprepared, do you improvise or do you retreat?",
    "Are you quiet and reserved, confident and cunning, or boisterous and reckless?",
    "What do your weapons and fighting style look like?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Hit Points by 5.", statBonus: { stat: "hp", amount: 5 } },
    {
      text: "Gain the ability to equip martial ranged weapons and martial shields.",
      equipGrant: { weapons: "ranged", shields: true },
    },
  ],
  skills: [
    {
      name: "Barrage",
      maxLevel: 1,
      text:
        "When you perform a ranged attack, you may spend 10 Mind Points to choose one " +
        "option: the attack gains multi (2); or you increase the attack's multi property by " +
        "one, up to a maximum of multi (3).",
    },
    {
      name: "Crossfire",
      maxLevel: 1,
      text:
        "After a creature you can see performs a ranged attack, you may spend an amount of " +
        "Mind Points equal to the total Result of their Accuracy Check in order to have the " +
        "attack fail automatically against all targets. You can only use this Skill if you " +
        "have a ranged weapon equipped, and it has no effect if the Accuracy Check was a " +
        "critical success.",
    },
    {
      name: "Hawkeye",
      maxLevel: 5,
      text:
        "When you perform the Guard action, if you choose not to provide cover to another " +
        "creature, you may choose one option: the next ranged attack you perform before the " +
        "end of the current scene will deal【SL × 2】extra damage; or you may immediately " +
        "perform a free attack with a bow or firearm you have equipped, treating your High " +
        "Roll (HR) as 0 when calculating damage dealt by this attack.",
    },
    {
      name: "Ranged Weapon Mastery",
      maxLevel: 4,
      text: "You gain a bonus equal to【SL】to all Accuracy Checks with ranged weapons.",
    },
    {
      name: "Warning Shot",
      maxLevel: 4,
      text:
        "When you hit one or more targets with a ranged attack that would deal damage, you " +
        "may have the attack deal no damage. If you do, choose one option: inflict shaken on " +
        "each target hit by the attack; or inflict slow on each target hit by the attack; or " +
        "each target hit by the attack loses【SL × 10】Mind Points. Describe your maneuver!",
    },
  ],
};
