// Transcribed from Reference/reference-data/classes/rogue.txt
import type { FUClass } from "../types";

export const rogue: FUClass = {
  id: "rogue",
  name: "Rogue",
  alsoKnownAs: ["Bandit", "Ninja", "Thief"],
  description:
    "Be they criminals, rebels or spies, Rogues are more than willing to play dirty in " +
    "order to get what they want. Rogues are generally quick, witty and elusive: while a " +
    "few of them are infamous for being mostly concerned with their personal wealth and " +
    "profit, many see themselves as fighting against injustice, tyranny, or social " +
    "exclusion. Tragically, it is quite common for Rogues to end up being painted as " +
    "threats by those same people they fight for.",
  roleplayQuestions: [
    "What drives you? Is it desire, vengeance, or a burning need for freedom?",
    "Are you part of a criminal gang or guild, or do you work on your own?",
    "Is there a place you can call home? Or is it true that, in the end, we all die alone?",
    "What is the most important rule in your personal code?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Inventory Points by 2.", statBonus: { stat: "ip", amount: 2 } },
  ],
  skills: [
    {
      name: "Cheap Shot",
      maxLevel: 5,
      text:
        "When you hit a creature with an attack, if the attack only targeted that creature " +
        "and they are suffering from one or more status effects, you may have it deal extra " +
        "damage equal to【SL + the number of status effects on the creature】.",
    },
    {
      name: "Dodge",
      maxLevel: 3,
      text:
        "As long as you have no shields and no martial armor equipped, your Defense score is " +
        "increased by【SL】.",
    },
    {
      name: "High Speed",
      maxLevel: 3,
      text:
        "At the start of a conflict, you may spend 10 Mind Points. If you do, choose one " +
        "option and apply it before the start of the first round: perform a free attack with " +
        "a weapon you have equipped; or perform a Hinder or Objective action. You also gain a " +
        "bonus equal to【SL】to all Checks you perform as part of the chosen option.",
    },
    {
      name: "See You Later",
      maxLevel: 1,
      text:
        "You may use an action and spend 1 Fabula Point to vanish from the current scene, " +
        "reappearing whenever you want during a different scene in which another Player " +
        "Character is present. Describe how you escaped and miraculously got here!",
    },
    {
      name: "Soul Steal",
      maxLevel: 5,
      text:
        "You may use an action to perform a【DEX + WLP】Check against the Magic Defense of a " +
        "creature you can see. If you succeed and the target is a soldier, you recover " +
        "【SL】Inventory Points; if they are an elite or champion, the GM gives you the " +
        "target's soul treasure, an item worth an amount of zenit equal to or lower than " +
        "【the target's level multiplied by 30, or by 50 if they are a Villain】. This soul " +
        "treasure will appear inside your backpack; a creature can be successfully stolen " +
        "from with this Skill only once. You gain a bonus equal to【SL】to your " +
        "【DEX + WLP】Checks for this Skill.",
    },
  ],
};
