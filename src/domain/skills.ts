export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number; // cost in SP (Skill Points)
  reqLevel: number;
  reqNodes: string[];
  icon: string;
  effect: { type: string; value: number };
}

export const SKILL_TREE: SkillNode[] = [
  // Tier 1
  {
    id: "hp_1",
    name: "Vitality I",
    description: "+5% HP Global for all units.",
    cost: 1,
    reqLevel: 2,
    reqNodes: [],
    icon: "fa-heart text-green-400",
    effect: { type: "hp_pct", value: 0.05 },
  },
  {
    id: "atk_1",
    name: "Power I",
    description: "+5% ATK Global for all units.",
    cost: 1,
    reqLevel: 2,
    reqNodes: [],
    icon: "fa-burst text-orange-400",
    effect: { type: "atk_pct", value: 0.05 },
  },
  // Tier 2
  {
    id: "def_1",
    name: "Armor I",
    description: "+5% DEF/MDEF Global.",
    cost: 1,
    reqLevel: 5,
    reqNodes: ["hp_1"],
    icon: "fa-shield text-zinc-300",
    effect: { type: "def_pct", value: 0.05 },
  },
  {
    id: "speed_1",
    name: "Agility I",
    description: "+5 Speed Global.",
    cost: 1,
    reqLevel: 5,
    reqNodes: ["atk_1"],
    icon: "fa-shoe-prints text-blue-300",
    effect: { type: "speed_flat", value: 5 },
  },
  // Tier 3
  {
    id: "hp_2",
    name: "Vitality II",
    description: "+10% HP Global.",
    cost: 2,
    reqLevel: 10,
    reqNodes: ["def_1"],
    icon: "fa-heart text-green-500",
    effect: { type: "hp_pct", value: 0.10 },
  },
  {
    id: "atk_2",
    name: "Power II",
    description: "+10% ATK Global.",
    cost: 2,
    reqLevel: 10,
    reqNodes: ["speed_1"],
    icon: "fa-burst text-orange-500",
    effect: { type: "atk_pct", value: 0.10 },
  },
  // Tier 4
  {
    id: "crit_1",
    name: "Precision I",
    description: "+5% Crit Rate.",
    cost: 2,
    reqLevel: 15,
    reqNodes: ["atk_2"],
    icon: "fa-crosshairs text-yellow-300",
    effect: { type: "crit_flat", value: 5 },
  },
  {
    id: "dodge_1",
    name: "Evasion I",
    description: "+5% Dodge Rate.",
    cost: 2,
    reqLevel: 15,
    reqNodes: ["hp_2"],
    icon: "fa-wind text-teal-300",
    effect: { type: "dodge_flat", value: 5 },
  },
];

export const getSkillEffects = (unlockedSkills: string[]) => {
  const effects = {
    hp_pct: 0,
    atk_pct: 0,
    def_pct: 0,
    mdef_pct: 0,
    speed_flat: 0,
    crit_flat: 0,
    dodge_flat: 0,
  };

  const unlockedSet = new Set(unlockedSkills);
  SKILL_TREE.forEach((skill) => {
    if (unlockedSet.has(skill.id)) {
      if (skill.effect.type === "hp_pct") effects.hp_pct += skill.effect.value;
      if (skill.effect.type === "atk_pct") effects.atk_pct += skill.effect.value;
      if (skill.effect.type === "def_pct") {
        effects.def_pct += skill.effect.value;
        effects.mdef_pct += skill.effect.value;
      }
      if (skill.effect.type === "speed_flat") effects.speed_flat += skill.effect.value;
      if (skill.effect.type === "crit_flat") effects.crit_flat += skill.effect.value;
      if (skill.effect.type === "dodge_flat") effects.dodge_flat += skill.effect.value;
    }
  });

  return effects;
};
