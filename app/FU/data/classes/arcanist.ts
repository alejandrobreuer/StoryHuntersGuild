// Transcribed from Reference/reference-data/classes/arcanist.txt
import type { FUClass } from "../types";

export const arcanist: FUClass = {
  id: "arcanist",
  name: "Arcanist",
  alsoKnownAs: ["Avatar", "Chosen", "Summoner"],
  description:
    "Arcanists can fall into a deep trance and temporarily project a considerable portion of " +
    "their soul outside the body, giving it physical form. Surrounded by this magical shroud, " +
    "the Arcanist gains a variety of supernatural abilities; these summoned forms are said to " +
    "be manifestations of the ancestral souls belonging to mythical entities of legend, known " +
    "as the Arcana. In some worlds, the Arcana are even worshipped as deities.",
  roleplayQuestions: [
    "Where do your powers come from? Are they a gift from your bloodline?",
    "Have you ever communicated with an Arcanum, or are they silent and distant?",
    "Do people see you as mysterious, powerful, or otherworldly?",
    "Are there many practicing your art, or are you the exception?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Mind Points by 5.", statBonus: { stat: "mp", amount: 5 } },
  ],
  skills: [
    {
      name: "Arcane Circle",
      maxLevel: 4,
      text:
        "After you willingly dismiss an Arcanum on your turn during a conflict (see next page), " +
        "if that Arcanum had not been summoned during this same turn and you have an arcane " +
        "weapon equipped, you may immediately perform the Spell action for free. The spell you " +
        "cast this way must have a total Mind Point cost of【SL × 5】or lower (you must still pay " +
        "the spell's MP cost).",
    },
    {
      name: "Arcane Regeneration",
      maxLevel: 2,
      text: "When you summon an Arcanum, you immediately recover【SL × 5】Hit Points.",
    },
    {
      name: "Bind and Summon",
      maxLevel: 1,
      text:
        "You may bind Arcana to your soul and summon them later. The Game Master will tell you " +
        "the details of each binding process when you first encounter the Arcanum in question.\n\n" +
        "You may use an action and spend 40 Mind Points to summon an Arcanum you have bound: the " +
        "details of this process are explained on the next page.\n\n" +
        "If you take this Skill at character creation, you begin play with one Arcanum of your " +
        "choice already bound to you, chosen from the list on the next pages. Other than that, " +
        "you may only obtain new Arcana through exploration and story progression.",
    },
    {
      name: "Emergency Arcanum",
      maxLevel: 6,
      text:
        "As long as you are in Crisis, the cost for summoning your Arcana is reduced by " +
        "【SL × 5】Mind Points.",
    },
    {
      name: "Ritual Arcanism",
      maxLevel: 1,
      text:
        "You may perform Rituals of the Arcanism discipline, as long as their effects fall " +
        "within the domains of one or more Arcana you have bound (see next pages).\n\n" +
        "Arcanism Rituals use【WLP + WLP】for the Magic Check.",
    },
  ],
  subsystem: {
    type: "arcana",
    entries: [
      {
        name: "Arcanum of the Forge",
        domains: ["fire", "heat", "metal"],
        mergeText: "You have Resistance to fire damage. Any fire damage you deal ignores Resistances.",
        dismissText:
          "When you dismiss this Arcanum, choose Forge or Inferno: Forge. You create a basic " +
          "armor, shield or weapon of your choice (see pages 130 to 133). If you select this " +
          "option again, the previously created item vanishes. If you create a weapon this way, " +
          "it deals fire damage instead of physical. Inferno. Choose any number of creatures you " +
          "can see: each of them suffers 30 fire damage. This damage ignores Resistances.",
      },
      {
        name: "Arcanum of the Frost",
        domains: ["cold", "ice", "silence"],
        mergeText:
          "You have Resistance to ice damage and are immune to enraged. Any ice damage you deal " +
          "ignores Resistances.",
        dismissText:
          "Ice Age. Choose any number of creatures you can see: each of them suffers 30 ice " +
          "damage. This damage ignores Resistances.",
      },
      {
        name: "Arcanum of the Gate",
        domains: ["space", "travel", "void"],
        mergeText: "You have Resistance to dark damage. You gain a +1 bonus to your Magic Defense.",
        dismissText:
          "When you dismiss this Arcanum, choose Oblivion or Warp: Oblivion. Choose any number " +
          "of creatures you can see: each of them suffers 30 dark damage. This damage ignores " +
          "Resistances. Warp. You teleport yourself and up to five other nearby willing " +
          "creatures to a location you previously visited, if that location is within 1 travel day.",
      },
      {
        name: "Arcanum of the Grimoire",
        domains: ["knowledge", "revelations", "understanding"],
        mergeText:
          "You are able to read, write, speak and understand all languages. You treat your " +
          "Insight as if it were one die size higher (up to a maximum of d12).",
        dismissText:
          "Oracle. You ask the Game Master a single question. The Game Master must answer " +
          "truthfully, describing the vision shown to you by the Grimoire. Once used, this " +
          "dismiss effect will not be available until the next dawn. Furthermore, the same " +
          "question may never be asked more than once. The Game Master has final say on which " +
          "questions are too similar to be asked again.",
      },
      {
        name: "Arcanum of the Oak",
        domains: ["earth", "plants", "poison"],
        mergeText:
          "You have Resistance to earth and poison damage and are immune to poisoned. Whenever " +
          "you recover Hit Points, you recover 5 extra Hit Points.",
        dismissText:
          "Blossom. Choose any number of creatures you can see (you may also choose yourself): " +
          "each of them recovers from the poisoned status effect and recovers 40 Hit Points. " +
          "This amount increases to 50 Hit Points if you are level 20 or higher, or to 60 Hit " +
          "Points if you are level 40 or higher.",
      },
      {
        name: "Arcanum of the Sky",
        domains: ["fog", "rain", "storms"],
        mergeText:
          "You have Resistance to air and bolt damage. You may use an action to accurately " +
          "predict weather conditions for the next day within a range of two travel days — the " +
          "Game Master will tell you what the weather conditions will be.",
        dismissText:
          "Thunderstorm. Choose any number of creatures you can see: each of them suffers 30 " +
          "bolt damage. This damage ignores Resistances.",
      },
      {
        name: "Arcanum of the Sword",
        domains: ["conquest", "heroism", "leadership"],
        mergeText:
          "Your attacks deal 5 extra damage, and all damage dealt by your attacks is treated as " +
          "having no type (thus being unaffected by damage Affinities). Damage dealt by your " +
          "attacks cannot gain a type as long as you are merged with this Arcanum. When you " +
          "perform an attack, you may have that attack gain the multi (any number of targets) " +
          "property. If you do, this Arcanum will be automatically dismissed after the attack " +
          "is resolved (this is not considered a willing dismiss).",
        // FLAG: source has no DISMISS box for this Arcanum (its only "dismissal" is the automatic one described in mergeText) — left empty rather than inventing a manual dismiss effect.
        dismissText: "",
      },
      {
        name: "Arcanum of the Tower",
        domains: ["judgment", "protection", "sacrifice"],
        mergeText:
          "When you summon this Arcanum, choose a damage type: air, bolt, dark, earth, fire, or " +
          "ice. Until this Arcanum is dismissed, each of your allies present on the scene has " +
          "Resistance to the chosen damage type (you do not gain this Resistance).",
        dismissText:
          "Judgment. Choose any number of creatures you can see: each of them suffers 30 light " +
          "damage. This damage ignores Resistances.",
      },
      {
        name: "Arcanum of the Wheel",
        domains: ["destiny", "speed", "time"],
        mergeText: "You are immune to slow. You gain a +1 bonus to your Defense.",
        dismissText:
          "Time Freeze. Choose any number of creatures you can see: each of them suffers slow. " +
          "If a creature chosen this way is already slow, that creature will instead perform " +
          "one fewer action during their next turn (to a minimum of 0 actions).",
      },
    ],
  },
};
