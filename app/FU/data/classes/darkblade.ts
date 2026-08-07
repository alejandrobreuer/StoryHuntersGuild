// Transcribed from Reference/reference-data/classes/darkblade.txt
import type { FUClass } from "../types";

export const darkblade: FUClass = {
  id: "darkblade",
  name: "Darkblade",
  alsoKnownAs: ["Avenger", "Black Knight", "Death Knight"],
  description:
    "Darkblades are somber and powerful warriors who hide a sorrowful past. Due to tragic " +
    "experiences on the battlefield or in personal life, their souls have developed an " +
    "affinity for pain and shadow energy. An unlikely hero to say the very least, a Darkblade " +
    "may now sacrifice their lifeforce to unleash mighty attacks and is able to draw resolve, " +
    "power and even knowledge from the suffering they experience.",
  roleplayQuestions: [
    "What tragic experience awakened your abilities?",
    "Many would regard your powers as evil. How do you feel about them?",
    "What do your weapons and fighting style look like?",
    "Are there many practicing your art, or are you the exception?",
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
      name: "Agony",
      maxLevel: 5,
      text:
        "After you deal damage to one or more creatures, if you have a Bond towards at least " +
        "one of those creatures, you may recover【SL × 2】Hit Points and【SL × 2】Mind Points.",
    },
    {
      name: "Dark Blood",
      maxLevel: 1,
      text: "As long as you are in Crisis, you have Resistance to dark damage and poison damage.",
    },
    {
      name: "Heart of Darkness",
      maxLevel: 1,
      text:
        "Once per scene upon entering Crisis, you may choose a specific creature you can see " +
        "that you don't have a Bond towards. If you do, create a Bond of hatred towards that " +
        "creature.",
    },
    {
      name: "Painful Lesson",
      maxLevel: 3,
      text:
        "After another creature causes you to lose Hit Points (with an attack, a spell or any " +
        "other method), you may immediately perform the Study action on that creature (see page " +
        "74) for free. If you do, gain a bonus equal to【SL】to your Check.\n\n" +
        "Remember, you can study the same aspect of a creature only once.",
    },
    {
      name: "Shadow Strike",
      maxLevel: 5,
      text:
        "You have learned to channel your vital force into your attacks. You may use an action " +
        "to perform a Shadow Strike: roll your current Might die and lose an amount of Hit " +
        "Points equal to【the number rolled on your Might die】. If this didn't reduce your Hit " +
        "Points to 0, you may perform a free attack with a weapon you have equipped: if this " +
        "attack hits one or more targets, it deals extra damage equal to【SL + the number rolled " +
        "on your Might die】. However, all damage dealt by this attack becomes dark and its " +
        "damage type cannot be changed.",
    },
  ],
};
