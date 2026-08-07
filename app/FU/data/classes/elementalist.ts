// Transcribed from Reference/reference-data/classes/elementalist.txt
import type { FUClass } from "../types";

export const elementalist: FUClass = {
  id: "elementalist",
  name: "Elementalist",
  alsoKnownAs: ["Battle Mage", "Geomancer", "Sorcerer"],
  description:
    "An Elementalist has learned to channel the souls that flow within the basic elements " +
    "of creation: Air, Earth, Fire and Water. Some of them develop complex spells to contain " +
    "the powerful energies of nature; others seek its protection in harmony and communion. " +
    "Elemental magic can be highly destructive, causing damage and inflicting negative status " +
    "effects. Due to this, there are many who would covet an Elementalist’s abilities... " +
    "often for nefarious purposes.",
  roleplayQuestions: [
    "Who trained you in the way of the Elements?",
    "Your magic can be devastating... are you afraid of yourself?",
    "Elemental magic is often used in war. Did you serve in the military?",
    "What does your magic look like?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Mind Points by 5.", statBonus: { stat: "mp", amount: 5 } },
    { text: "You may perform Rituals whose effects fall within the Ritualism discipline." },
  ],
  skills: [
    {
      name: "Cataclysm",
      maxLevel: 3,
      text:
        "When you cast an instantaneous spell, if you have an arcane weapon equipped, you " +
        "may increase the spell's total MP cost by up to【SL × 10】Mind Points. If you do so and " +
        "the spell deals damage to one or more creatures, it will deal 5 extra damage to each " +
        "creature for every 10 Mind Points by which you increased its total MP cost.",
    },
    {
      name: "Elemental Magic",
      maxLevel: 10,
      text:
        "Each time you acquire this Skill, learn one Elementalist spell (see next two pages). " +
        "Offensive (r) Elementalist spells use【INS + WLP】for the Magic Check.",
    },
    {
      name: "Magical Artillery",
      maxLevel: 3,
      text:
        "When you cast an offensive (r) spell, if you have an arcane weapon equipped, you " +
        "gain a bonus to your Magic Check equal to【SL × 2】.",
    },
    {
      name: "Ritual Elementalism",
      maxLevel: 1,
      text:
        "You may perform Rituals whose effects fall within the Elementalism discipline. " +
        "Elementalism Rituals use【INS + WLP】for the Magic Check.",
    },
    {
      name: "Spellblade",
      maxLevel: 4,
      text:
        "When you cast an offensive (r) spell targeting a single creature, if the spell has a " +
        "total Mind Point cost of【SL × 10】or lower and you have one or more bow, brawling, " +
        "dagger, flail, spear or sword weapons equipped, you may choose one of those weapons. " +
        "If you do, your Magic Check for the spell will use the chosen weapon's Accuracy Check " +
        "formula; for instance, the Magic Check for an Elementalist spell cast through a bronze " +
        "sword (page 131) will be【DEX + MIG】+1 instead of【INS + WLP】.",
    },
  ],
  subsystem: {
    type: "spells",
    entries: [
      {
        name: "Elemental Shroud",
        offensive: false,
        mpCost: "5 × T",
        target: "Up to three creatures",
        duration: "Scene",
        text:
          "You weave magical energy and protect the targets from the fury of the elements. " +
          "Choose a damage type: air, bolt, earth, fire or ice. Until this spell ends, each " +
          "target gains Resistance against the chosen damage type.",
      },
      {
        name: "Elemental Weapon",
        offensive: false,
        mpCost: "10",
        target: "One weapon",
        duration: "Scene",
        text:
          "You imbue a weapon with elemental energy. Choose a damage type: air, bolt, earth, " +
          "fire, or ice. Until this spell ends, all damage dealt by the weapon becomes of the " +
          "chosen damage type. If you have that weapon equipped while you cast this spell, you " +
          "may perform a free attack with it as part of the same action. This spell can only be " +
          "cast on a weapon equipped by a willing creature.",
      },
      {
        name: "Flare",
        offensive: true,
        mpCost: "20",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "You channel a single ray of fire towards your foe, its temperature so high that it " +
          "will pierce through most defenses. The target suffers【HR + 25】fire damage. Damage " +
          "dealt by this spell ignores Resistances.",
      },
      {
        name: "Fulgur",
        offensive: true,
        mpCost: "10 × T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You weave electricity into a wave of crackling bolts. Each target hit by this spell " +
          "suffers【HR + 15】bolt damage.",
        opportunity: "Each target hit by this spell suffers dazed.",
      },
      {
        name: "Glacies",
        offensive: true,
        mpCost: "10 × T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You coat your foes under a thick layer of frost. Each target hit by this spell " +
          "suffers【HR + 15】ice damage.",
        opportunity: "Each target hit by this spell suffers slow.",
      },
      {
        name: "Iceberg",
        offensive: true,
        mpCost: "20",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "A pillar of ice magic envelops your foe, suddenly dropping their body temperature to " +
          "a critical level. The target suffers【HR + 25】ice damage. Damage dealt by this spell " +
          "ignores Resistances.",
      },
      {
        name: "Ignis",
        offensive: true,
        mpCost: "10 × T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You unleash a searing barrage against your foes, conjuring flames out of thin air. " +
          "Each target hit by this spell suffers【HR + 15】fire damage.",
        opportunity: "Each target hit by this spell suffers shaken.",
      },
      {
        name: "Soaring Strike",
        offensive: false,
        mpCost: "10",
        target: "Self",
        duration: "Instantaneous",
        text:
          "The wind carries your strikes across the battlefield. You may immediately perform a " +
          "free attack with a melee weapon you have equipped. This attack may target creatures " +
          "that can only be targeted by ranged attacks. If you used a weapon belonging to the " +
          "brawling or spear Category for this attack, it deals 5 extra damage. If you hit a " +
          "flying target with this attack, you may force them to land immediately.",
      },
      {
        name: "Terra",
        offensive: true,
        mpCost: "10 × T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "Spires of jagged rock erupt from the ground beneath your foes, closing around them. " +
          "Each target hit by this spell suffers【HR + 15】earth damage. This spell cannot target " +
          "creatures who are flying, floating, falling, or otherwise in mid-air.",
        opportunity:
          "Each target hit by this spell performs one fewer action on their next turn (to a " +
          "minimum of 0 actions).",
      },
      {
        name: "Thunderbolt",
        offensive: true,
        mpCost: "20",
        target: "One creature",
        duration: "Instantaneous",
        text:
          "You send lightning striking at your foe. The target suffers【HR + 25】bolt damage. " +
          "Damage dealt by this spell ignores Resistances.",
      },
      {
        name: "Ventus",
        offensive: true,
        mpCost: "10 × T",
        target: "Up to three creatures",
        duration: "Instantaneous",
        text:
          "You summon the power of winds against your enemy. Each target hit by this spell " +
          "suffers【HR + 15】air damage.",
        opportunity: "Each flying target hit by this spell is forced to land immediately.",
      },
      {
        name: "Vortex",
        offensive: false,
        mpCost: "10",
        target: "Self",
        duration: "Scene",
        text:
          "A roaring gale surrounds you, blowing away arrows and bullets. Until this spell " +
          "ends, you gain a +2 bonus to your Defense against ranged attacks.",
      },
    ],
  },
};
