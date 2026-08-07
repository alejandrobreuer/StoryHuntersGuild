// Transcribed from Reference/reference-data/classes/chimerist.txt
import type { FUClass } from "../types";

export const chimerist: FUClass = {
  id: "chimerist",
  name: "Chimerist",
  alsoKnownAs: ["Druid", "Shapeshifter", "Wild Mage"],
  description:
    "Chimerists gather their power from the souls of the monsters and beasts they encounter. " +
    "By manipulating their inner wild energy, these mages may mimic the magical abilities of " +
    "monsters and have reached a supernatural understanding of feral creatures. Chimerists " +
    "frequently rely on their toughness and physical prowess in addition to magic; they are " +
    "often seen traveling the world in search of rare and enchanted creatures.",
  roleplayQuestions: [
    "Who taught you the art of Chimerism? Is your mentor human or monstrous?",
    "Can people and monsters live in harmony, or are they bound to threaten each other?",
    "What does your magic look like?",
    "Are there many practicing your art, or are you the exception?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Mind Points by 5.", statBonus: { stat: "mp", amount: 5 } },
    { text: "You may perform Rituals whose effects fall within the Ritualism discipline." },
  ],
  skills: [
    {
      name: "Consume",
      maxLevel: 5,
      text:
        "After you deal damage to one or more creatures with a spell, if you have an arcane, " +
        "dagger or flail weapon equipped, you recover【SL × 2】Mind Points.",
    },
    {
      name: "Feral Speech",
      maxLevel: 1,
      text: "You can communicate with creatures of the beast, monster and plant Species.",
    },
    {
      name: "Pathogenesis",
      maxLevel: 1,
      text:
        "When you deal damage to one or more creatures with one of your Chimerist spells, each " +
        "of those creatures that share their Species with the creature you originally learned " +
        "that spell from suffers poisoned.",
    },
    {
      name: "Ritual Chimerism",
      maxLevel: 1,
      text:
        "You may perform Rituals whose effects fall within the Chimerism discipline. When you " +
        "acquire this Skill, choose【INS + WLP】or【MIG + WLP】. From now on, your Chimerism " +
        "Rituals will use the chosen Attributes for the Magic Check.",
    },
    {
      name: "Spell Mimic",
      maxLevel: 10,
      text:
        "When you see a creature belonging to the beast, monster or plant Species cast a spell, " +
        "you may immediately choose to learn that spell as a Chimerist spell of your own: if you " +
        "do, record the Species of the creature you learned it from.\n\n" +
        "When you first acquire this Skill, choose【INS + WLP】or【MIG + WLP】. From now on, your " +
        "offensive (r) Chimerist spells will use the chosen Attributes for the Magic Check, " +
        "regardless of the Attributes used by the creature you learned the spell from.\n\n" +
        "You may have up to【SL + 2】different Chimerist spells memorized this way. If you want " +
        "to memorize a new Chimerist spell but are already at your limit, you must forget one of " +
        "your old spells and replace it with the new spell.",
    },
  ],
};
