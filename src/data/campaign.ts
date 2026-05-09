import { Boss, ElementType, FactionType } from "../types";

export interface CampaignStage {
    id: string;
    chapter: number;
    stage: number;
    name: string;
    description: string;
    dialogue: { speaker: string; text: string }[];
    enemies: (Partial<Boss> | null)[];
    rewardDC: number;
    rewardDust?: number;
    recommendedLevel?: number;
}

export const CAMPAIGN_STAGES: CampaignStage[] = [
    {
        id: "c1-s1",
        chapter: 1,
        stage: 1,
        name: "Awakening",
        description: "The core begins to destabilize. Rogue programs are appearing.",
        dialogue: [
            { speaker: "System", text: "Warning: Unauthorized access detected in Sector 7." },
            { speaker: "Commander", text: "Deploy the vanguard. We need to secure the perimeter." },
            { speaker: "Vanguard", text: "Acknowledged. Engaging the enemy." }
        ],
        enemies: [
            { name: "Scrap Drone", hp: 100, attack: 10, element: "Neutral" as ElementType, faction: "CyberCore" as FactionType, universe: "Core", threatLevel: "Low", id: "drone1" },
            null,
            { name: "Scrap Drone", hp: 100, attack: 10, element: "Neutral" as ElementType, faction: "CyberCore" as FactionType, universe: "Core", threatLevel: "Low", id: "drone2" },
            null,
            null,
            null
        ],
        rewardDC: 100,
        recommendedLevel: 1
    },
    {
        id: "c1-s2",
        chapter: 1,
        stage: 2,
        name: "First Blood",
        description: "A stronger presence is felt in the mainframe.",
        dialogue: [
            { speaker: "Commander", text: "The drones were just the beginning. Something larger is approaching." },
            { speaker: "Unknown Entity", text: "You cannot stop the inevitable upgrade." }
        ],
        enemies: [
            null,
            { name: "Mecha Brute", hp: 300, attack: 25, element: "Fire" as ElementType, faction: "MechaMutant" as FactionType, universe: "Core", threatLevel: "Medium", id: "brute1" },
            null,
            null,
            null,
            null
        ],
        rewardDC: 200,
        rewardDust: 50,
        recommendedLevel: 3
    }
];
