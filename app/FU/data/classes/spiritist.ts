// Transcribed from Reference/reference-data/classes/spiritist.txt
import type { FUClass } from "../types";

export const spiritist: FUClass = {
  id: "spiritist",
  name: "Spiritist",
  alsoKnownAs: ["Healer", "Priest", "Witch"],
  description:
    "Spiritists have developed a powerful connection with the raw aspects of soul: emotion, " +
    "energy, life, and death. They wield power both miraculous and frightening, and are " +
    "quite often affiliated with cults or religions. Several worlds see the powers of " +
    "Spiritism as gifts from a deity or proof that a person's heart is pure; however, there " +
    "is no definite proof of these abilities coming from anything but discipline, empathy, " +
    "and focus.",
  roleplayQuestions: [
    "Where does your magic come from? What are your beliefs concerning life and death?",
    "How do you feel about manipulating other people’s emotions and vital energy?",
    "What do you think of religion? Are you part of a specific cult, church or institution?",
    "What does your magic look like?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Mind Points by 5.", statBonus: { stat: "mp", amount: 5 } },
    { text: "You may perform Rituals whose effects fall within the Ritualism discipline." },
  ],
  skills: [
    {
      name: "Healing Power",
      maxLevel: 2,
      text:
        "When you cast a spell that targets one or more allies, if you have an arcane " +
        "weapon equipped, you may have each of those allies recover an amount of Hit Points " +
        "equal to【SL, multiplied by the number of Bonds you have】. This healing is separate " +
        "from any healing caused by the effects of the spell.",
    },
    {
      name: "Ritual Spiritism",
      maxLevel: 1,
      text:
        "You may perform Rituals whose effects fall within the Spiritism discipline. " +
        "Spiritism Rituals use【INS + WLP】for the Magic Check.",
    },
    {
      name: "Spiritual Magic",
      maxLevel: 10,
      text:
        "Each time you acquire this Skill, learn one Spiritist spell (see next two pages). " +
        "Offensive (r) Spiritist spells use【INS + WLP】for the Magic Check.",
    },
    {
      name: "Support Magic",
      maxLevel: 1,
      text:
        "When you cast a spell that targets one or more allies, if you have an arcane " +
        "weapon equipped, you may choose one of those allies you have a Bond towards. If you " +
        "do, that ally gains a bonus to the next Check they perform during the current " +
        "scene; this bonus is equal to the strength of your Bond towards them.",
    },
    {
      name: "Vismagus",
      maxLevel: 1,
      text:
        "When you cast a spell, if you don't have enough Mind Points to pay for its total " +
        "cost, you may choose to spend twice as many Hit Points instead. You cannot use this " +
        "Skill if doing so would reduce you to 0 Hit Points. If a spell cast this way would " +
        "cause you to recover Hit Points, you instead recover no Hit Points (the spell " +
        "functions normally on any other target).",
    },
  ],
  subsystem: {
    type: "spells",
    entries: [
      {
        name: "Aura",
        offensive: false,
        mpCost: "5×T",
        target: "Up to three creatures",
        duration: "Scene",
        text:
          "You project your soul outside your body and direct it to surround the targets, " +
          "shielding them from dangerous magic. Until this spell ends, each target may treat " +
          "their Magic Defense as being equal to 12 against any effects that target it (they " +
          "are still free to use their normal Defense score if higher than 12).",
      },
      {
        name: "Awaken",
        offensive: false,
        mpCost: "20",
        target: "One creature",
        duration: "Scene",
        text:
          "You allow a creature to focus their vital energy into accomplishing what they " +
          "previously could not. Choose one Attribute: Dexterity, Insight, Might, or " +
          "Willpower. Until this spell ends, the target treats the chosen Attribute as if it " +
          "were one die size higher (up to a maximum of d12).",
      },
      {
        name: "Barrier",
        offensive: false,
        mpCost: "5×T",
        target: "Up to three creatures",
        duration: "Scene",
        text:
          "You project your soul outside your body and weave it into a barrier to protect " +
          "the targets from attacks. Until this spell ends, each target may treat their " +
          "Defense as being equal to 12 against any effects that target it (they are still " +
          "free to use their normal Defense score if higher than 12).",
      },
      {
        name: "Cleanse",
        offensive: false,
        mpCost: "5×T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You strengthen and purify the soul energy coursing through your companions. Each " +
          "target recovers from all status effects.",
      },
      {
        name: "Enrage",
        offensive: true,
        mpCost: "10",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "You cause a creature to lose any semblance of temper and act brazenly. The target " +
          "suffers enraged and cannot perform the Guard or Spell actions during their next " +
          "turn.",
      },
      {
        name: "Hallucination",
        offensive: true,
        mpCost: "5×T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You alter the senses of your enemies, causing them to experience bizarre or " +
          "frightening hallucinations. Choose dazed or shaken: you inflict the chosen status " +
          "effect on each target hit by this spell.",
      },
      {
        name: "Heal",
        offensive: false,
        mpCost: "10 × T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You invigorate your companions, soothing their pain and healing their fatigue. " +
          "Each target recovers 40 Hit Points. This amount increases to 50 Hit Points if you " +
          "are level 20 or higher, or to 60 Hit Points if you are level 40 or higher.",
      },
      {
        name: "Lux",
        offensive: true,
        mpCost: "10 × T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You focus your inner energy into a barrage of blinding soul rays. Each target hit " +
          "by this spell suffers【HR + 15】light damage.",
        opportunity: "Each target hit by this spell suffers dazed.",
      },
      {
        name: "Mercy",
        offensive: false,
        mpCost: "20",
        target: "One creature",
        duration: "Scene",
        text:
          "You strengthen the heart of a creature against suffering and despair. Until this " +
          "spell ends, if the target would be reduced to 0 Hit Points, they are instead left " +
          "standing with exactly 1 Hit Point. Once that happens, this spell ends.",
      },
      {
        name: "Reinforce",
        offensive: false,
        mpCost: "5×T",
        target: "Up to three creatures",
        duration: "Scene",
        text:
          "You protect the targets from attacks that would corrupt their body and spirit. " +
          "Choose dazed, enraged, poisoned, shaken, slow, or weak. Until this spell ends, " +
          "each target becomes immune to the chosen status effect.",
      },
      {
        name: "Soul Weapon",
        offensive: false,
        mpCost: "10",
        target: "One equipped weapon",
        duration: "Scene",
        text:
          "You imbue a weapon with the cleansing energy of your spirit. Until this spell " +
          "ends, all damage dealt by the weapon becomes of the light type. If you have that " +
          "weapon equipped while you cast this spell, you may perform a free attack with it " +
          "as part of the same action. This spell can only be cast on a weapon equipped by a " +
          "willing creature.",
      },
      {
        name: "Torpor",
        offensive: true,
        mpCost: "5×T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You smother the soul energy coursing through the bodies of your foes, hindering " +
          "their movements. Choose slow or weak: you inflict the chosen status effect on " +
          "each target hit by this spell.",
      },
    ],
  },
};
