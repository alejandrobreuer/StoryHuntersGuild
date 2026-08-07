// Transcribed from Reference/reference-data/classes/entropist.txt
import type { FUClass } from "../types";

export const entropist: FUClass = {
  id: "entropist",
  name: "Entropist",
  alsoKnownAs: ["Astromancer", "Chaos Mage", "Gambler"],
  description:
    "High above the stars, where their lights do not shine, lies a bottomless void where life " +
    "and souls wither and transform in unfathomable ways. This realm is a non-reality, an " +
    "endless expanse of chaos impervious to the laws of time, space, and probability. " +
    "Entropists refer to this realm as the Cosmos, the Heavens, or quite simply as Lady Luck: " +
    "they are among the few gifted with the ability to channel its reality-bending energies.",
  roleplayQuestions: [
    "Who taught you to channel the reality-bending powers of the Cosmos?",
    "What do you know of the Cosmos? Are they the end of reality, or a new beginning?",
    "What does your magic look like?",
    "Are there many practicing your art, or are you the exception?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Mind Points by 5.", statBonus: { stat: "mp", amount: 5 } },
    { text: "You may perform Rituals whose effects fall within the Ritualism discipline." },
  ],
  skills: [
    {
      name: "Absorb MP",
      maxLevel: 5,
      text: "After you suffer damage, you may immediately recover【SL × 2】Mind Points.",
    },
    {
      name: "Entropic Magic",
      maxLevel: 10,
      text:
        "Each time you acquire this Skill, learn one Entropist spell (see next two pages).\n\n" +
        "Offensive (r) Entropist spells use【INS + WLP】for the Magic Check.",
    },
    {
      name: "Lucky Seven",
      maxLevel: 1,
      text:
        "You have a lucky number; at the beginning of each session, that number is 7. Once per " +
        "scene after you perform a Check, you may replace the value shown on one of the dice you " +
        "rolled with your lucky number (even if this would give an impossible Result, such as a " +
        "value of 7 on a d6). If you do, the replaced value becomes your new lucky number.",
    },
    {
      name: "Ritual Entropism",
      maxLevel: 1,
      text:
        "You may perform Rituals whose effects fall within the Entropism discipline.\n\n" +
        "Entropism Rituals use【INS + WLP】for the Magic Check.",
    },
    {
      name: "Stolen Time",
      maxLevel: 4,
      text:
        "During a conflict, you may use an action to interfere with the flow of time by spending " +
        "up to【SL × 5】Mind Points. For every 5 Mind Points you spend this way, choose one " +
        "option: one creature you can see suffers slow; or one creature you can see recovers " +
        "from slow; or one creature you can see may immediately perform the Equipment action for " +
        "free; or choose one ally you can see who has yet to take a turn during this round: that " +
        "ally may take their turn immediately after yours during this round. Each option can " +
        "only be chosen once per use of this Skill.",
    },
  ],
  subsystem: {
    type: "spells",
    entries: [
      {
        name: "Acceleration",
        offensive: false,
        mpCost: "20",
        target: "One creature",
        duration: "Scene",
        text:
          "You bend the fabric of time. Until this spell ends, the target gains the ability to " +
          "perform a single additional action during each of their turns. Once the target has " +
          "performed a total of two additional actions granted by this spell, this spell ends.",
      },
      {
        name: "Anomaly",
        offensive: true,
        mpCost: "20",
        target: "One creature",
        duration: "Scene",
        text:
          "You alter the very nature of your target. Until this spell ends, if the target would " +
          "suffer damage of a type they Absorb or are Immune to, they are instead treated as if " +
          "they were Vulnerable to that damage type. Once that happens, this spell ends.",
      },
      {
        name: "Dark Weapon",
        offensive: false,
        mpCost: "10",
        target: "One equipped weapon",
        duration: "Scene",
        text:
          "You imbue a weapon with dark energy. Until this spell ends, all damage dealt by the " +
          "weapon becomes of the dark type. If you have that weapon equipped while you cast this " +
          "spell, you may perform a free attack with it as part of the same action. This spell " +
          "can only be cast on a weapon equipped by a willing creature.",
      },
      {
        name: "Dispel",
        offensive: false,
        mpCost: "10",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "You release a wave of negative energy and cleanse all magic from a creature. If the " +
          "target is affected by one or more spells with a duration of Scene, they are no longer " +
          "affected by any of those spells instead.",
      },
      {
        name: "Divination",
        offensive: false,
        mpCost: "10",
        target: "Self",
        duration: "Scene",
        text:
          "You glimpse briefly into the future. Until this spell ends, after a creature you can " +
          "see performs a Check, if it was not a fumble nor a critical success, you may force " +
          "that creature to reroll both dice. Once you have forced two rerolls this way, this " +
          "spell ends.",
      },
      {
        name: "Drain Spirit",
        offensive: true,
        mpCost: "5",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "You consume a creature's psyche. The target loses【HR + 15】Mind Points. Then, you " +
          "recover an amount of Mind Points equal to half the Mind Points loss they suffered (if " +
          "the loss was reduced to 0 in some way, you recover none).",
      },
      {
        name: "Drain Vigor",
        offensive: true,
        mpCost: "10",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "You steal another creature's life force. The target suffers【HR + 15】dark damage. " +
          "Then, you recover an amount of Hit Points equal to half the Hit Points loss they " +
          "suffered (if the loss was reduced to 0 in some way, you recover none).",
      },
      {
        name: "Gamble",
        offensive: false,
        mpCost: "up to 20",
        target: "Special",
        duration: "Instantaneous",
        text:
          "You summon a vortex of chaotic energy. Roll your current Willpower die once for " +
          "every 10 Mind Points spent while casting this spell, then keep the single die you " +
          "prefer: the number on that die determines the effects of this spell.\n\n" +
          "1 You lose half of your current Hit Points and half of your current Mind Points.\n" +
          "2-3 Each creature present on the scene, including yourself, suffers poisoned.\n" +
          "4-6 Each creature present on the scene, including yourself, suffers slow.\n" +
          "7-8 Choose up to three creatures you can see: each of them recovers 50 Hit Points and " +
          "also recovers from all status effects.\n" +
          "9+ Choose any number of creatures you can see: each of them suffers 30 damage. The " +
          "damage type is determined randomly by rolling a d6: 1. air   2. bolt   3. dark   " +
          "4. earth   5. fire   6. poison",
      },
      {
        name: "Mirror",
        offensive: false,
        mpCost: "10",
        target: "One creature",
        duration: "Scene",
        text:
          "You twist the laws of magic. Until this spell ends, if an offensive (r) spell is cast " +
          "on the target, the creature who cast that offensive spell will be targeted in their " +
          "stead (any other targets of the offensive spell will be targeted as normal). Once " +
          "that happens, this spell ends.",
      },
      {
        name: "Omega",
        offensive: true,
        mpCost: "20",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "You invoke doom on your foe, turning strength into frailty. The target loses an " +
          "amount of Hit Points equal to【20 + half the target's level】.",
      },
      {
        name: "Stop",
        offensive: true,
        mpCost: "10",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "You trap a foe inside a circle of altered time and space. The target will perform " +
          "one fewer action on their next turn (to a minimum of 0 actions).",
      },
      {
        name: "Umbra",
        offensive: true,
        mpCost: "10 × T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "A storm of dark energy turns matter into ash. Each target hit by this spell suffers " +
          "【HR + 15】dark damage.",
        opportunity: "Each target hit by this spell suffers weak.",
      },
    ],
  },
};
