// Transcribed from Reference/reference-data/classes/loremaster.txt
import type { FUClass } from "../types";

export const loremaster: FUClass = {
  id: "loremaster",
  name: "Loremaster",
  alsoKnownAs: ["Archivist", "Sage", "Scholar"],
  description:
    "Loremasters are known for their insatiable curiosity and appetite for discovery. They " +
    "firmly believe that knowledge equates to power, and would often trade all gold in the " +
    "world for a chance at solving a good mystery. Unfortunately, a majority of Loremasters " +
    "tend to be aloof and easily distracted, rarely concerning themselves with “pragmatic” " +
    "matters... to the point of sometimes failing to realize the darker implications of " +
    "their discoveries.",
  roleplayQuestions: [
    "Who is (or was) your mentor? What is (or was) your relationship with them?",
    "Did you attend an academy or college? What kind of people did you meet there?",
    "There is this centuries-old mystery you’re obsessed with. What is it?",
    "Is it true that some things are better left buried beneath the sands of time?",
  ],
  freeBenefits: [
    { text: "Permanently increase your maximum Mind Points by 5.", statBonus: { stat: "mp", amount: 5 } },
  ],
  skills: [
    {
      name: "Flash of Insight",
      maxLevel: 3,
      text:
        "When you roll a 13 or higher on a Check performed to investigate a creature, item or " +
        "location — this includes using the Study action during a conflict — you may ask the " +
        "Game Master up to【SL】questions concerning the subject of your investigation. You " +
        "may ask these questions immediately or save them for later; whenever you ask one of " +
        "these questions, the Game Master will answer truthfully and you will describe your " +
        "character's deductive process. This Skill may only be used once on the same " +
        "creature, item or location.",
    },
    {
      name: "Focused",
      maxLevel: 5,
      text:
        "Permanently increase your maximum Mind Points by【SL × 3】. When you perform an Open " +
        "Check using【INS + INS】, you gain a bonus equal to【SL】on that Check (this only " +
        "applies to Open Checks).",
    },
    {
      name: "Knowledge is Power",
      maxLevel: 1,
      text:
        "When you perform an Accuracy Check, you may replace one of the Attribute dice with " +
        "Insight (such as【INS + INS】for a pistol or【INS + MIG】for a waraxe).",
    },
    {
      name: "Quick Assessment",
      maxLevel: 6,
      text:
        "At the start of a conflict, you may spend up to【SL × 5】Mind Points. For every 5 " +
        "Mind Points you spend this way, choose one option: choose a creature you can see and " +
        "the GM reveals one of their Traits; or name a damage type and choose a creature you " +
        "can see, and the GM reveals that creature's Affinity towards that damage type.",
    },
    {
      name: "Trained Memory",
      maxLevel: 1,
      text:
        "You may perfectly recall the details of any scene you have visited within the past " +
        "week. You can \"go back in time\" within your mind in order to examine and " +
        "investigate such scenes again — your Flash of Insight Skill will apply to these " +
        "memories as well.",
    },
  ],
};
