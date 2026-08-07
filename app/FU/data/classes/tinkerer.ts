// Transcribed from Reference/reference-data/classes/tinkerer.txt
import type { FUClass } from "../types";

export const tinkerer: FUClass = {
  id: "tinkerer",
  name: "Tinkerer",
  alsoKnownAs: ["Alchemist", "Magitech Engineer", "Mechanic"],
  description:
    "Tinkerers possess exceptional ingenuity and are known for their eccentric and " +
    "marvelous inventions. They travel the world in an endless search for lost theories " +
    "and ancient machinery, eyes glimmering whenever they witness the wonders of " +
    "architecture and engineering.\n\n" +
    "In a way, Tinkerers could be seen as the ultimate dreamers and rebels, challenging " +
    "the very rules of nature and society in their pursuit of a better future.",
  roleplayQuestions: [
    "Did you learn your craft from someone? What is your relationship with them?",
    "What have you lost in the pursuit of progress and innovation?",
    "Is your craft something revolutionary, or is it an established field of work?",
    "When an item or effect is created through your abilities, what does it look like?",
  ],
  freeBenefits: [
    {
      text: "Permanently increase your maximum Inventory Points by 2.",
      statBonus: { stat: "ip", amount: 2 },
    },
    { text: "You may initiate Projects." },
  ],
  skills: [
    {
      name: "Emergency Item",
      maxLevel: 1,
      text:
        "Once per conflict scene, if you are in Crisis, you may perform an additional " +
        "action on your turn. This action must be the Inventory action.",
    },
    {
      name: "Gadgets",
      maxLevel: 5,
      text:
        "When you first acquire this Skill, choose a gadget type: alchemy, infusions or " +
        "magitech (see next four pages). You gain its basic benefits.\n\n" +
        "Whenever you take this Skill again, choose one option: you gain the basic " +
        "benefits of a new gadget type; or you gain the advanced benefits of a gadget " +
        "type whose basic benefits you already obtained; or you gain the superior " +
        "benefits of a gadget type whose advanced benefits you already obtained.",
    },
    {
      name: "Potion Rain",
      maxLevel: 2,
      text:
        "When you create a potion that restores a single creature's HP and/or MP, you " +
        "may have it affect up to【SL】additional creatures. If you do, the potion only " +
        "restores half the normal amount of HP and MP to each creature.",
    },
    {
      name: "Secret Formula",
      maxLevel: 5,
      text:
        "When you create a potion or magisphere whose effects restore HP and/or MP, each " +
        "restored amount is increased by【SL × 5】.\n\n" +
        "When you create an elemental shard, potion or magisphere that deals damage, that " +
        "item deals【SL】extra damage.",
    },
    {
      name: "Visionary",
      maxLevel: 5,
      text:
        "When you work on a Project, up to【SL × 100】zenit of material costs are " +
        "automatically paid; additionally, you generate an additional【SL】progress every " +
        "day. If multiple characters with this Skill work on the same Project, the " +
        "effects will be cumulative.",
    },
  ],
  subsystem: {
    type: "inventions",
    entries: [
      {
        id: "alchemy",
        name: "Alchemy",
        alsoKnownAs: ["Chemistry", "Bombs", "Mutations"],
        description:
          "You may perform the Inventory action to rapidly craft a potion with powerful " +
          "but somewhat unpredictable effects. When you do so, choose one type of mix " +
          "among those you have unlocked (basic, advanced or superior) and spend the " +
          "appropriate amount of Inventory Points.",
        tiers: [
          {
            tier: "basic",
            ipCost: 3,
            text: "Roll two d20s and assign one to target and one to effect.",
          },
          {
            tier: "advanced",
            ipCost: 4,
            text: "Roll three d20s and assign one to target and one to effect.",
          },
          {
            tier: "superior",
            ipCost: 5,
            text: "Roll four d20s and assign one to target and one to effect.",
          },
          // FLAG: The TARGET and EFFECT tables below aren't tied to a mix size, but
          // FUInventionTier requires a "basic"|"advanced"|"superior" tier value, so both
          // reuse "basic" (the least misleading option) and carry a distinguishing `name`
          // instead. Their `text` holds the connective rules paragraphs that surround each
          // table in the source, since `text` is a required field and these paragraphs
          // explain how to use the corresponding table.
          {
            tier: "basic",
            name: "Target Table",
            text:
              "When you create a mix, roll the amount of twenty-sided dice indicated by " +
              "that mix, then assign one of those rolls to the target table (below) and " +
              "one to the effect table (on the right). Discard all remaining dice, then " +
              "describe the effects of the mix!\n\n" +
              "Want to craft airships, golems, sleep potions and more? See Projects, on " +
              "page 136!",
            table: {
              headers: ["Die", "The potion affects..."],
              rows: [
                ["1-6", "... you or one ally you can see that is present on the scene."],
                ["7-11", "... one enemy you can see that is present on the scene."],
                ["12-16", "... you and every ally present on the scene."],
                ["17-20", "... every enemy present on the scene."],
              ],
            },
          },
          {
            tier: "basic",
            name: "Effect Table",
            text:
              "Example: You spend 5 Inventory Points for a superior mix and roll four " +
              "twenty-sided dice. You roll 3, 14, 9 and 4. You might assign 14 to target " +
              "and 9 to effect to grant yourself and all allies Resistance to air and " +
              "fire; or you could go on the offensive and assign 9 to target and 4 to " +
              "effect to deal bolt damage to a single enemy; or even assign 9 to target " +
              "and 14 to effect to inflict four status effects on that foe! Whatever your " +
              "choice, the two dice you don't assign will be discarded.\n\n" +
              "The two effects marked with \"Any\" on the effect table are always " +
              "available and can be chosen if none of the available effects appeal to you.",
            table: {
              headers: ["Die", "Each creature affected by the potion..."],
              rows: [
                ["Any", "... suffers 20 poison damage."],
                ["Any", "... recovers 30 Hit Points."],
                [
                  "1",
                  "... treats their Dexterity and Might dice as if they were one size " +
                    "higher (up to a maximum of d12) until the end of your next turn.",
                ],
                ["2", "As effect 1, but with Insight and Willpower."],
                [
                  "3",
                  "... suffers 20 air damage. This amount increases to 30 damage if you " +
                    "are level 20 or higher, or to 40 damage if you are level 40 or higher.",
                ],
                ["4", "As effect 3, but with bolt damage."],
                ["5", "As effect 3, but with dark damage."],
                ["6", "As effect 3, but with earth damage."],
                ["7", "As effect 3, but with fire damage."],
                ["8", "As effect 3, but with ice damage."],
                ["9", "... gains Resistance to air and fire damage until the end of the scene."],
                ["10", "As effect 9, but with bolt and ice damage."],
                ["11", "As effect 9, but with dark and earth damage."],
                ["12", "... suffers enraged."],
                ["13", "... suffers poisoned."],
                ["14", "... suffers dazed, shaken, slow and weak."],
                ["15", "... recovers from all status effects."],
                // FLAG: The source table row spans two die results ("16-17") rather than
                // listing them separately, unlike every other single-value row below.
                // Represented literally as printed.
                ["16-17", "... recovers 50 Hit Points and 50 Mind Points."],
                ["18", "... recovers 100 Hit Points."],
                ["19", "... recovers 100 Mind Points."],
                ["20", "... recovers 100 Hit Points and 100 Mind Points."],
              ],
            },
          },
        ],
      },
      {
        id: "infusions",
        name: "Infusions",
        alsoKnownAs: ["Arcane Ammunition", "Blade Coatings", "Combat Runes"],
        description:
          "When you successfully hit one or more targets with an attack, you may spend " +
          "2 Inventory Points to produce a special infusion and apply the corresponding " +
          "effect to that attack (if the attack had the multi property, apply the " +
          "effects of the infusion to each target).\n\n" +
          "You cannot apply more than one infusion to the same attack; producing and " +
          "using an infusion are both part of the action you used to attack with the " +
          "weapon.",
        tiers: [
          {
            tier: "basic",
            name: "Cryo",
            text: "The attack deals 5 extra damage, and its damage becomes ice.",
          },
          {
            tier: "basic",
            name: "Pyro",
            text: "The attack deals 5 extra damage, and its damage becomes fire.",
          },
          {
            tier: "basic",
            name: "Volt",
            text: "The attack deals 5 extra damage, and its damage becomes bolt.",
          },
          {
            tier: "advanced",
            name: "Cyclone",
            text: "The attack deals 5 extra damage, and its damage becomes air.",
          },
          {
            tier: "advanced",
            name: "Exorcism",
            text: "The attack deals 5 extra damage, and its damage becomes light.",
          },
          {
            tier: "advanced",
            name: "Seismic",
            text: "The attack deals 5 extra damage, and its damage becomes earth.",
          },
          {
            tier: "advanced",
            name: "Shadow",
            text: "The attack deals 5 extra damage, and its damage becomes dark.",
          },
          {
            tier: "superior",
            name: "Vampire",
            text:
              "Choose one option: you recover an amount of HP equal to half the HP loss " +
              "suffered by the target of the attack; or you recover an amount of MP equal " +
              "to half the HP loss suffered by the target of the attack. This infusion can " +
              "only be used if the attack targeted a single creature.",
          },
          {
            tier: "superior",
            name: "Venom",
            text:
              "The attack deals 5 extra damage, its damage becomes poison, and each " +
              "creature hit by the attack suffers poisoned.",
          },
        ],
      },
      {
        id: "magitech",
        name: "Magitech",
        alsoKnownAs: ["Engineering", "Golemcraft", "Robotics"],
        description: "This invention type grants a variety of different benefits.",
        tiers: [
          {
            tier: "basic",
            name: "Magitech Override",
            text:
              "You may use an action and spend 10 Mind Points to perform an Opposed " +
              "【INS + INS】Check against a nearby soldier-rank construct you can see (the " +
              "Game Master must tell you who is a valid target). If you succeed, you gain " +
              "control of the creature until the end of the scene (the Game Master gives " +
              "you its profile). You may only control one construct at any given time, " +
              "but may set it free whenever you want; the construct is also set free as " +
              "soon as it is harmed by you or by one of your allies. Once free, the " +
              "construct is again in control of its actions and might turn against you.",
          },
          {
            tier: "advanced",
            name: "Magicannon",
            ipCost: 3,
            // FLAG: source reads "as soon as you use create a new magicannon" — kept
            // verbatim (likely a book typo/errata) rather than silently corrected, per
            // the no-paraphrase rule.
            text:
              "You may perform the Inventory action and spend 3 Inventory Points to " +
              "create a firearm weapon known as a magicannon (see below). The magicannon " +
              "will crumble to pieces as soon as you use create a new magicannon. When " +
              "you create a magicannon, choose the type of damage it deals (air, bolt, " +
              "earth, fire, ice, or physical).\n\n" +
              "Magicannon — 【DEX + INS】+1 accuracy, 【HR + 10】damage. Two-handed, " +
              "Ranged, No Quality.",
          },
          {
            tier: "superior",
            name: "Magispheres",
            ipCost: 2,
            text:
              "You develop three magisphere prototypes; each of them can replicate a " +
              "spell chosen from the following lists: Elementalist, Entropist and " +
              "Spiritist. The spells you choose may come from the same list or different " +
              "lists.\n\n" +
              "You also develop two more prototypes upon reaching level 20, and another " +
              "two upon reaching level 40 (the same applies if you already reached those " +
              "levels).\n\n" +
              "You may perform the Inventory action and spend 2 Inventory Points to " +
              "create a magisphere and immediately perform the Spell action for free, " +
              "casting one of the spells you have developed a prototype for. The spell " +
              "follows the normal rules (including MP costs and Magic Checks) and the " +
              "magisphere is destroyed upon use.",
          },
        ],
      },
    ],
  },
};
