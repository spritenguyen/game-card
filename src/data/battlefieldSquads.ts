import { Boss } from "../types";

export const BATTLEFIELD_SQUADS: { name: string; squad: (Boss | null)[]; cost: number }[] = [
  {
    name: "Inferno-Hydro Coalition",
    cost: 50,
    squad: [
      {
        id: "s1-vanguard-1",
        name: "Inferno Vanguard",
        universe: "Battlefield",
        faction: "CyberCore",
        element: "Fire",
        threatLevel: "Elite",
        hp: 35000,
        attack: 450,
        reward: 100,
        lore: "A sturdy frontliner bathed in flames.",
        visualDescription: "A massive cyborg wielding a thermal shield."
      },
      null,
      {
        id: "s1-vanguard-2",
        name: "Hydro Vanguard",
        universe: "Battlefield",
        faction: "AstroNomad",
        element: "Water",
        threatLevel: "Elite",
        hp: 32000,
        attack: 420,
        reward: 100,
        lore: "Uses high-pressure water streams to block incoming attacks.",
        visualDescription: "An alien bruiser emitting a watery aura."
      },
      {
        id: "s1-striker-1",
        name: "Flame Striker",
        universe: "Battlefield",
        faction: "Ethereal",
        element: "Fire",
        threatLevel: "Elite",
        hp: 18000,
        attack: 900,
        reward: 100,
        lore: "A relentless attacker that seeks to burn everything.",
        visualDescription: "A fast-moving fiery elemental."
      },
      {
        id: "s1-support-1",
        name: "Tide Support",
        universe: "Battlefield",
        faction: "ArcaneWeaver",
        element: "Water",
        threatLevel: "Elite",
        hp: 12000,
        attack: 600,
        reward: 100,
        lore: "Provides healing and buffs with mystical waters.",
        visualDescription: "A mystic floating above a pool of water."
      },
      {
        id: "s1-striker-2",
        name: "Ignis Striker",
        universe: "Battlefield",
        faction: "VoidBringer",
        element: "Fire",
        threatLevel: "Elite",
        hp: 16000,
        attack: 950,
        reward: 100,
        lore: "Dashes through shadows, leaving a trail of ash.",
        visualDescription: "A dark rogue with flaming daggers."
      }
    ]
  },
  {
    name: "Terra-Volt Brigade",
    cost: 60,
    squad: [
      {
        id: "s2-vanguard-1",
        name: "Terra Vanguard",
        universe: "Battlefield",
        faction: "MechaMutant",
        element: "Earth",
        threatLevel: "Elite",
        hp: 40000,
        attack: 400,
        reward: 120,
        lore: "A massive golem that absorbs damage like a sponge.",
        visualDescription: "A hulking mutated beast with rocky armor."
      },
      {
        id: "s2-striker-1",
        name: "Volt Striker",
        universe: "Battlefield",
        faction: "CyberCore",
        element: "Lightning",
        threatLevel: "Elite",
        hp: 16000,
        attack: 1000,
        reward: 120,
        lore: "Strikes with the speed and power of a thunderbolt.",
        visualDescription: "A sleek combat android generating sparks."
      },
      null,
      {
        id: "s2-striker-2",
        name: "Quake Striker",
        universe: "Battlefield",
        faction: "Ethereal",
        element: "Earth",
        threatLevel: "Elite",
        hp: 20000,
        attack: 850,
        reward: 120,
        lore: "Uses tremors to destabilize enemies before striking.",
        visualDescription: "An earth spirit wielding a massive hammer."
      },
      {
        id: "s2-support-1",
        name: "Thunder Support",
        universe: "Battlefield",
        faction: "AstroNomad",
        element: "Lightning",
        threatLevel: "Elite",
        hp: 14000,
        attack: 700,
        reward: 120,
        lore: "Empowers allies with jolting electrical fields.",
        visualDescription: "A floating entity surrounded by plasma."
      },
      null
    ]
  },
  {
    name: "Aero-Nebula Syndicate",
    cost: 70,
    squad: [
      {
        id: "s3-vanguard-1",
        name: "Aero Vanguard",
        universe: "Battlefield",
        faction: "ArcaneWeaver",
        element: "Wind",
        threatLevel: "Elite",
        hp: 31000,
        attack: 500,
        reward: 150,
        lore: "Deflects attacks using localized tornadoes.",
        visualDescription: "A robed guardian manipulating wind currents."
      },
      {
        id: "s3-vanguard-2",
        name: "Nebula Vanguard",
        universe: "Battlefield",
        faction: "VoidBringer",
        element: "Neutral",
        threatLevel: "Elite",
        hp: 33000,
        attack: 480,
        reward: 150,
        lore: "Absorbs impacts into small dimensional rifts.",
        visualDescription: "A shadowy figure wrapped in cosmic dust."
      },
      null,
      {
        id: "s3-striker-1",
        name: "Gale Striker",
        universe: "Battlefield",
        faction: "Ethereal",
        element: "Wind",
        threatLevel: "Elite",
        hp: 17000,
        attack: 900,
        reward: 150,
        lore: "Moves like the breeze, strikes like a hurricane.",
        visualDescription: "An avian warrior with razor-sharp feathers."
      },
      null,
      {
        id: "s3-support-1",
        name: "Cosmic Support",
        universe: "Battlefield",
        faction: "AstroNomad",
        element: "Neutral",
        threatLevel: "Elite",
        hp: 13000,
        attack: 650,
        reward: 150,
        lore: "Utilizes starlight to revitalize the squad.",
        visualDescription: "An extraterrestrial being glowing with starlight."
      }
    ]
  }
];
