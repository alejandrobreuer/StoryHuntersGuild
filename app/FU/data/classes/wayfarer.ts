// Transcribed from Reference/reference-data/classes/wayfarer.txt
import type { FUClass } from "../types";

export const wayfarer: FUClass = {
  id: "wayfarer",
  name: "Wayfarer",
  alsoKnownAs: ["Adventurer", "Explorer", "Treasure Hunter"],
  description:
    "Nomads searching for a fabled continent, explorers braving the wilds, grizzled hunters " +
    "and travelers have one thing in common: they are Wayfarers. While a majority of heroes " +
    "travel the world during their adventures, Wayfarers live for the journey. They are " +
    "always eager to visit new places and learn from others. In the eyes of a Wayfarer, the " +
    "wilderness is neither foe nor an ally, but rather a stern teacher who can reveal many " +
    "forgotten truths.",
  roleplayQuestions: [
    "What led you to live a life of endless travels? Was it your choice? ...are you tired?",
    "Is there a place or person that feels like “home” to you?",
    "You have met many people and visited many places. Is there one you can’t forget?",
    "You lost something or someone because of your travels. What happened?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Inventory Points by 2.", statBonus: { stat: "ip", amount: 2 } },
  ],
  skills: [
    {
      name: "Faithful Companion",
      maxLevel: 5,
      text:
        "Together with the rest of your group, design a level 5 beast, construct, elemental " +
        "or plant creature (see page 302) that becomes your companion. This creature has no " +
        "Initiative score and does not level up, can have up to two basic attacks, gains a " +
        "bonus equal to【SL】to Accuracy Checks and Magic Checks, and their maximum Hit Points " +
        "are equal to【(SL multiplied by the companion's base Might die size) + half your " +
        "level】. Your companion doesn't get a turn during conflicts, but on your turn you " +
        "can use an action to have the companion perform an action (only once per turn). If " +
        "you leave a scene, your companion leaves with you. If your companion falls to 0 Hit " +
        "Points, they flee and rejoin you at the start of the next scene in which you are " +
        "present, with HP equal to their Crisis score. When you rest, your companion also " +
        "gains the full benefits of resting.",
    },
    {
      name: "Resourceful",
      maxLevel: 4,
      text: "You recover【SL】Inventory Points after each travel roll (see page 106).",
    },
    {
      name: "Tavern Talk",
      maxLevel: 3,
      text:
        "When you rest inside an inn or tavern, you may ask the Game Master up to【SL】" +
        "questions about your surroundings and the people who live here; the Game Master " +
        "will answer truthfully and you describe how you gathered the information.",
    },
    {
      name: "Treasure Hunter",
      maxLevel: 2,
      text:
        "When your group journeys on the world map, you will make a discovery on a roll of " +
        "【SL + 1】or lower on the travel roll (instead of only on a 1).",
    },
    {
      name: "Well-Traveled",
      maxLevel: 1,
      text:
        "You reduce the die rolled for your travel rolls by one size (to a minimum of d6). " +
        "If multiple characters have this Skill, the effects are not cumulative.",
    },
  ],
};
