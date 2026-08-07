// Transcribed from Reference/reference-data/classes/weaponmaster.txt
import type { FUClass } from "../types";

export const weaponmaster: FUClass = {
  id: "weaponmaster",
  name: "Weaponmaster",
  alsoKnownAs: ["Fighter", "Rōnin", "Warrior"],
  description:
    "Weaponmasters spend years upon years honing their close combat arts. Most of them " +
    "display remarkable skill with a variety of weapons; others have trained to become one " +
    "with a specific armament. Many Weaponmasters follow and protect someone out of love or " +
    "loyalty, but there are also those who tirelessly wander the world seeking worthy " +
    "opponents, legendary magical weapons, or capable teachers.",
  roleplayQuestions: [
    "What is your relationship with weapons? Are they mere objects, or something more?",
    "Is battle something you seek, or something you strive to avoid?",
    "Are you, or have you ever been, the servant of a Lady or Lord? What were they like?",
    "What do your weapons and fighting style look like?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Hit Points by 5.", statBonus: { stat: "hp", amount: 5 } },
    {
      text: "Gain the ability to equip martial melee weapons and martial shields.",
      equipGrant: { weapons: "melee", shields: true },
    },
  ],
  skills: [
    {
      name: "Bladestorm",
      maxLevel: 1,
      text:
        "When you perform a melee attack, you may spend 10 Mind Points to choose one " +
        "option: the attack gains multi (2); or you increase the attack's multi property by " +
        "one, up to a maximum of multi (3).",
    },
    {
      name: "Bone Crusher",
      maxLevel: 4,
      text:
        "When you hit one or more targets with a melee attack that would deal damage, you " +
        "may have the attack deal no damage. If you do, choose one option: inflict dazed on " +
        "each target hit by the attack; or inflict weak on each target hit by the attack; or " +
        "each target hit by the attack loses【SL × 10】Mind Points. Describe your maneuver!",
    },
    {
      name: "Breach",
      maxLevel: 3,
      text:
        "You may use an action and spend 5 Mind Points to perform a free attack with a melee " +
        "weapon you have equipped. This attack must target a single creature. If the attack " +
        "is successful, it deals no damage and you choose one option: you destroy one shield " +
        "equipped by the target; or you destroy the target's equipped armor; or whenever the " +
        "target suffers damage from a source before the start of your next turn, that source " +
        "deals【SL × 2】extra damage to them.",
    },
    {
      name: "Counterattack",
      maxLevel: 1,
      text:
        "After an enemy hits or misses you with a melee attack, if the Result of their " +
        "Accuracy Check was an even number, you may perform a free attack against that enemy " +
        "(after their attack has been fully resolved). This attack must be a melee attack and " +
        "must have that enemy as its only target; treat your High Roll (HR) as 0 when " +
        "calculating damage dealt by this attack.",
    },
    {
      name: "Melee Weapon Mastery",
      maxLevel: 4,
      text: "You gain a bonus equal to【SL】to all Accuracy Checks with melee weapons.",
    },
  ],
};
