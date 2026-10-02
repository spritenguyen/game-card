import { AppConfig, Card } from '../../types';
import { LENSES } from '../../domain/gameConstants';
import { rollFaction, rollElement } from '../../domain/gameRules';
import { AI_CONFIG, getTextOptions } from './config/aiConfig';
import { AiError } from './errors';
import { SchemaType, JsonSchema } from './text/provider';
import { textService } from './text/textService';
import { imageService } from './image/imageService';

/** Game prompt façade: content and domain rules remain independent of provider SDKs. */
async function executeTextAI(prompt: string, systemPrompt: string, config: AppConfig, properties: Record<string, JsonSchema>, required: string[]): Promise<any> {
    return textService.generateJson({ prompt, systemPrompt, schema: { type: 'object', properties, required } }, getTextOptions(config));
}

export const generateCardFromAI = async (query: string, assignedRank: string, config: AppConfig, forcedFaction?: string): Promise<any> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    const hasPassive = ['SR', 'SSR', 'UR'].includes(assignedRank);
    const ultimateLv = assignedRank === 'N' ? 1 : assignedRank === 'R' ? 2 : assignedRank === 'SR' ? 3 : assignedRank === 'SSR' ? 5 : 10;
    const enforcedFaction = forcedFaction || rollFaction();
    const enforcedElement = rollElement();
    
    const sysPrompt = `Giám đốc Nghệ thuật AI. Trả về đúng schema JSON quy định. (TRẢ LỜI NGẮN GỌN, TRÁNH VƯỢT QUÁ GIỚI HẠN TOKEN)
1. Xác định giới tính (gender) của nhân vật ('Male' hoặc 'Female'). Nội suy 'universe'. Faction BẮT BUỘC LÀ: '${enforcedFaction}'. Chiều cao/cân nặng tự nhiên. TRƯỜNG 'measurements' (số đo 3 vòng) BẮT BUỘC trả về ĐỊNH DẠNG SỐ "XX-XX-XX" (VD: 90-60-90).
2. TRỌNG TÂM: Trường 'inspiredBy' PHẢI chứa TÊN CHÍNH XÁC của nhân vật gốc bằng Tiếng Anh.
3. Trường 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH, NGẮN GỌN DƯỚI 50 TỪ, miêu tả trang phục, khuôn mặt và PHẢI PHÙ HỢP VỚI GIỚI TÍNH ĐÃ CHỌN.
4. Hạng thẻ BẮT BUỘC là: ${assignedRank}.
5. TẤT CẢ CÁC TRƯỜNG VĂN BẢN KHÁC (name, occupation, personality, lore, ultimateMove...) BẮT BUỘC VIẾT NGẮN GỌN DƯỚI 50 TỪ BẰNG NGÔN NGỮ: ${langStr}. Sinh ra ultimateStats cho ultimateMove với power (100-3000), cooldown (2-8), scaling ('150% ATK' hoặc '200% MATK'...), energyCost (50-200).
6. Đặc tính Nguyên Tố BẮT BUỘC LÀ: '${enforcedElement}'.
7. Thẻ hạng N và R KHÔNG CÓ passiveSkill (trả về rỗng hoặc null). Thẻ SR, SSR, UR BẮT BUỘC có passiveSkill liên quan nguyên tố.`;
    const prompt = `Tạo thẻ nhân vật từ: ${query}. Xếp hạng: ${assignedRank}. Ngôn ngữ: ${langStr}. Nhớ GIỮ CÁC TRƯỜNG TEXT NGẮN GỌN.`;
    
    const props = {
        id: { type: SchemaType.STRING }, name: { type: SchemaType.STRING }, gender: { type: SchemaType.STRING }, universe: { type: SchemaType.STRING },
        faction: { type: SchemaType.STRING }, element: { type: SchemaType.STRING }, occupation: { type: SchemaType.STRING }, nationality: { type: SchemaType.STRING }, cardClass: { type: SchemaType.STRING },
        height: { type: SchemaType.INTEGER }, weight: { type: SchemaType.INTEGER }, measurements: { type: SchemaType.STRING }, personality: { type: SchemaType.STRING },
        lore: { type: SchemaType.STRING }, inspiredBy: { type: SchemaType.STRING }, visualDescription: { type: SchemaType.STRING }, passiveSkill: { type: SchemaType.STRING, nullable: true }, ultimateMove: { type: SchemaType.STRING },
        ultimateStats: {
            type: SchemaType.OBJECT,
            properties: {
                power: { type: SchemaType.INTEGER },
                cooldown: { type: SchemaType.INTEGER },
                scaling: { type: SchemaType.STRING },
                energyCost: { type: SchemaType.INTEGER }
            }
        }
    };
    const req = ["name","gender","universe","faction","element","occupation","nationality","cardClass","height","weight","measurements","personality","lore","inspiredBy","visualDescription","ultimateMove","ultimateStats"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    res.language = config.language;
    res.ultimateLevel = ultimateLv;
    res.origin = 'Extracted';
    return res;
};

export const generateFusionFromAI = async (c1: Card, c2: Card, targetRank: string, config: AppConfig): Promise<any> => {
    const targetHeight = Math.floor((c1.height || 170) * 0.5 + (c2.height || 170) * 0.5);
    const targetWeight = Math.floor((c1.weight || 60) * 0.5 + (c2.weight || 60) * 0.5);
    const forcedFaction = Math.random() > 0.5 ? c1.faction : c2.faction; // Inherit faction from parents dynamically
    const forcedElement = rollElement(); // Roll a new element for the fused card or you could mix... let's just roll randomly for variety
    const forcedGender = c1.gender || 'Unknown';
    const forcedUniverse = c2.universe || 'Unknown';
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    const hasPassive = ['SR', 'SSR', 'UR'].includes(targetRank);
    const ultimateLv = targetRank === 'N' ? 1 : targetRank === 'R' ? 2 : targetRank === 'SR' ? 3 : targetRank === 'SSR' ? 5 : 10;

    // --- Inherit and calculate stats ---
    const getMulti = (rank: string | undefined) => rank === 'UR' ? 10 : rank === 'SSR' ? 5 : rank === 'SR' ? 2.5 : rank === 'R' ? 1.5 : 1;
    const r1Multi = getMulti(c1.cardClass);
    const r2Multi = getMulti(c2.cardClass);
    const targetMulti = getMulti(targetRank);
    
    const p1Stats = c1.ultimateStats || { power: 200 * r1Multi, cooldown: 4, energyCost: 80 };
    const p2Stats = c2.ultimateStats || { power: 200 * r2Multi, cooldown: 4, energyCost: 80 };

    const basePower = (p1Stats.power + p2Stats.power) / 2;
    const baseParentMulti = Math.max(r1Multi, r2Multi);
    const growth = targetMulti / baseParentMulti;
    
    // Apply 15% mutation bonus
    const targetPower = Math.floor(basePower * growth * 1.15); 
    const targetCd = Math.max(2, Math.floor((p1Stats.cooldown + p2Stats.cooldown) / 2) - (targetRank === 'UR' ? 1 : 0));
    const targetCost = Math.floor((p1Stats.energyCost + p2Stats.energyCost) / 2);
    const targetScaling = targetRank === 'UR' ? '300% ATK/MATK' : targetRank === 'SSR' ? '250% ATK/MATK' : targetRank === 'SR' ? '200% ATK/MATK' : '150% ATK/MATK';

    const sysPrompt = `Tiến sĩ Sinh học lai tạo (Chimera Protocol). Trả JSON hợp lệ. (NGẮN GỌN DƯỚI 50 TỪ MỖI TRƯỜNG).
1. Hạng thẻ BẮT BUỘC là: ${targetRank}.
2. Tộc Hệ BẮT BUỘC LÀ: '${forcedFaction}'. Giới tính BẮT BUỘC LÀ: '${forcedGender}'. Vũ trụ BẮT BUỘC LÀ: '${forcedUniverse}'. Đặc tính Nguyên Tố BẮT BUỘC LÀ: '${forcedElement}'.
3. Chiều cao khoảng ${targetHeight}cm, cân nặng khoảng ${targetWeight}kg. 'measurements' ĐỊNH DẠNG "XX-XX-XX".
4. Trường 'inspiredBy' là sự kết hợp tên gốc.
5. 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH (NGẮN GỌN).
6. CÁC TRƯỜNG VĂN BẢN (lore, ultimateMove, ...) BẮT BUỘC NGẮN GỌN BẰNG ${langStr}. 
7. Sinh ra 'ultimateStats' BẮT BUỘC TRẢ VỀ CÁC CHỈ SỐ SAU TỪ KẾT QUẢ KẾT HỢP DNA: power: ${targetPower}, cooldown: ${targetCd}, scaling: '${targetScaling}', energyCost: ${targetCost}. KHÔNG TỰ BỊA STATS KHÁC.
8. Thẻ hạng N và R KHÔNG CÓ passiveSkill (trả về null). Thẻ SR, SSR, UR BẮT BUỘC có passiveSkill (kế thừa từ bản gốc).`;

    const prompt = `Lai tạo DNA từ ${c1.name} và ${c2.name}. 
Ngoại hình Alpha: ${c1.visualDescription}. Ngoại hình Omega: ${c2.visualDescription}. 
Passives gốc (có thể null): ${c1.passiveSkill} & ${c2.passiveSkill}. 
Ngôn ngữ: ${langStr}. Trả JSON ngắn gọn.`;

    const props = {
        id: { type: SchemaType.STRING }, name: { type: SchemaType.STRING }, gender: { type: SchemaType.STRING }, universe: { type: SchemaType.STRING },
        faction: { type: SchemaType.STRING }, element: { type: SchemaType.STRING }, occupation: { type: SchemaType.STRING }, nationality: { type: SchemaType.STRING }, cardClass: { type: SchemaType.STRING },
        height: { type: SchemaType.INTEGER }, weight: { type: SchemaType.INTEGER }, measurements: { type: SchemaType.STRING }, personality: { type: SchemaType.STRING },
        lore: { type: SchemaType.STRING }, inspiredBy: { type: SchemaType.STRING }, visualDescription: { type: SchemaType.STRING }, passiveSkill: { type: SchemaType.STRING, nullable: true }, ultimateMove: { type: SchemaType.STRING },
        ultimateStats: {
            type: SchemaType.OBJECT,
            properties: {
                power: { type: SchemaType.INTEGER },
                cooldown: { type: SchemaType.INTEGER },
                scaling: { type: SchemaType.STRING },
                energyCost: { type: SchemaType.INTEGER }
            }
        }
    };
    const req = ["name","gender","universe","faction","element","occupation","nationality","cardClass","height","weight","measurements","personality","lore","inspiredBy","visualDescription","ultimateMove","ultimateStats"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    res.language = config.language;
    res.ultimateLevel = ultimateLv;
    res.origin = 'Forged';
    res.parents = [c1.id, c2.id];
    return res;
};

export const generateAscensionFromAI = async (baseCard: Card, ascensionPath: string, config: AppConfig): Promise<any> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    const ultimateLv = 10;

    let pathEffect = "";
    let statBias = "";
    if (ascensionPath === "destruction") {
        pathEffect = "Định hướng THỨC TỈNH: HỦY DIỆT (Destruction). Tập trung vào sát thương vật lý/phép thuật cực hạn, chiêu cuối gây nổ diện rộng, tính cách bạo lực, cuồng trảm.";
        statBias = "Tăng mạnh Power lên (4000-6000), Scaling (500% ATK).";
    } else if (ascensionPath === "aegis") {
        pathEffect = "Định hướng THỨC TỈNH: HỘ MỆNH (Aegis). Tập trung vào phòng thủ tuyệt đối, bất hoại, bảo vệ đồng đội, tạo khiên khổng lồ.";
        statBias = "Power (1000-2000), Scaling (800% DEF), tạo Shield.";
    } else if (ascensionPath === "velocity") {
        pathEffect = "Định hướng THỨC TỈNH: SIÊU TỐC (Velocity). Tốc độ vượt thời gian, tàng hình, né tránh tuyệt đối, sát thủ ám sát chớp nhoáng.";
        statBias = "Power (2000-3500), Cooldown thấp (1-2), Scaling (Tùy theo SPD).";
    } else if (ascensionPath === "enigma") {
        pathEffect = "Định hướng THỨC TỈNH: VÔ CỰC (Enigma). Phép thuật thao túng không gian/thời gian, hồi năng lượng, hỗ trợ khống chế kẻ địch.";
        statBias = "Power (2500-4000), EnergyCost thấp (50-80), cấp hiệu ứng buff/debuff.";
    } else {
        pathEffect = "Định hướng THỨC TỈNH: CÂN BẰNG (Balanced). Thức tỉnh toàn diện mọi mặt.";
    }

    const sysPrompt = `Chuyên gia Tối Thượng Hóa (Ascension Protocol). Trả JSON hợp lệ. (NGẮN GỌN DƯỚI 50 TỪ MỖI TRƯỜNG).
${pathEffect}
1. Hạng thẻ BẮT BUỘC là: UR.
2. Tộc Hệ, Nguyên Tố, Giới tính, Vũ trụ, Chiều cao, Cân nặng, Số đo 3 vòng, Quốc tịch BẮT BUỘC PHÂN TÍCH VÀ KẾ THỪA Y HỆT TỪ THẺ GỐC. KHÔNG THAY ĐỔI NHỮNG THÔNG TIN CƠ BẢN NÀY.
3. Tên nhân vật (name): Giữ tên gốc nhưng có thể thêm tiền tố/hậu tố siêu việt (vd: "God-Emperor [Tên gốc]" hoặc "[Tên gốc] - Kẻ Thức Tỉnh").
4. 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH (NGẮN GỌN). Miêu tả biểu hiện sức mạnh thần thánh, aura rực rỡ, trang phục tiến hóa ở dạng tối thượng phù hợp với định hướng hệ phái.
5. CÁC TRƯỜNG VĂN BẢN KHÁC (lore, ultimateMove, passiveSkill...) BẮT BUỘC VIẾT BẰNG NGÔN NGỮ: ${langStr} (NGẮN GỌN). Thể hiện sức mạnh vô song, câu chuyện về sự thức tỉnh. Sinh ra ultimateStats cho ultimateMove với ${statBias} Cấu trúc của ultimateStats yêu cầu: power (number), cooldown (number), scaling (string), energyCost (number).`;

    const prompt = `Thức tỉnh thẻ bài sau lên hạng UR: 
- Tên: ${baseCard.name}
- Tộc/Hệ: ${baseCard.faction} / ${baseCard.element}
- Ngoại hình cũ: ${baseCard.visualDescription}
- Chiêu cuối cũ: ${baseCard.ultimateMove}
Nhiệm vụ: Cường hóa mọi thứ, tạo ra phiên bản thần thánh của nhân vật này. Trả JSON.`;

    const props = {
        id: { type: SchemaType.STRING }, name: { type: SchemaType.STRING }, gender: { type: SchemaType.STRING }, universe: { type: SchemaType.STRING },
        faction: { type: SchemaType.STRING }, element: { type: SchemaType.STRING }, occupation: { type: SchemaType.STRING }, nationality: { type: SchemaType.STRING }, cardClass: { type: SchemaType.STRING },
        height: { type: SchemaType.INTEGER }, weight: { type: SchemaType.INTEGER }, measurements: { type: SchemaType.STRING }, personality: { type: SchemaType.STRING },
        lore: { type: SchemaType.STRING }, inspiredBy: { type: SchemaType.STRING }, visualDescription: { type: SchemaType.STRING }, passiveSkill: { type: SchemaType.STRING, nullable: true }, ultimateMove: { type: SchemaType.STRING },
        ultimateStats: {
            type: SchemaType.OBJECT,
            properties: {
                power: { type: SchemaType.INTEGER },
                cooldown: { type: SchemaType.INTEGER },
                scaling: { type: SchemaType.STRING },
                energyCost: { type: SchemaType.INTEGER }
            }
        }
    };
    const req = ["name","gender","universe","faction","element","occupation","nationality","cardClass","height","weight","measurements","personality","lore","inspiredBy","visualDescription","ultimateMove","ultimateStats","passiveSkill"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    res.language = config.language;
    res.ultimateLevel = ultimateLv;
    res.origin = 'Forged';
    res.parents = [baseCard.id];
    return res;
};

export const generateBossFromAI = async (sHp: number, sAtk: number, difficulty: 'normal' | 'elite' | 'nightmare', config: AppConfig): Promise<any> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    let hpRange = "15000 - 30000";
    let atkRange = "3000 - 5500";
    let rewardRange = "250 - 300";
    let threatPrefix = "Alpha";
    if (difficulty === 'elite') { hpRange = "50000 - 80000"; atkRange = "8000 - 14000"; rewardRange = "375 - 600"; threatPrefix = "Elite"; }
    if (difficulty === 'nightmare') { hpRange = "150000 - 250000"; atkRange = "25000 - 45000"; rewardRange = "850 - 2500"; threatPrefix = "Nightmare"; }
    
    // Smooth Distribution Enforcement
    const enforcedFaction = rollFaction();
    const enforcedElement = rollElement();

    const sysPrompt = `Game Master AI (DDA). JSON Ngôn ngữ: ${langStr}. (Mục visualDescription ghi Tiếng Anh). GIỮ CÁC TEXT NGẮN GỌN DƯỚI 40 TỪ.`;
    // We no longer display or base the prompt heavily on sHp/sAtk. We just give absolute ranges.
    const prompt = `Tạo Boss cấp độ ${threatPrefix} có chỉ số sức mạnh cố định: HP dao động (${hpRange}) và ATK dao động (${atkRange}). Random vũ trụ. BẮT BUỘC TỘC HỆ (Faction) LÀ: '${enforcedFaction}'. Đặc tính Nguyên Tố BẮT BUỘC LÀ: '${enforcedElement}'. Phần thưởng (${rewardRange} DC). Thêm tiền tố "${threatPrefix} " vào threatLevel. BẮT BUỘC TRẢ VỀ environment LÀ MỘT TRONG CÁC LOẠI ĐỊA HÌNH HOẶC KHÍ HẬU (ví dụ: "Bão Điện Từ", "Dung Nham", "Mưa Acid", "Tuyết Đen"). JSON ngắn gọn!`;

    const props = {
        id: { type: SchemaType.STRING }, name: { type: SchemaType.STRING }, universe: { type: SchemaType.STRING }, faction: { type: SchemaType.STRING }, element: { type: SchemaType.STRING },
        threatLevel: { type: SchemaType.STRING }, hp: { type: SchemaType.INTEGER }, attack: { type: SchemaType.INTEGER }, reward: { type: SchemaType.INTEGER },
        lore: { type: SchemaType.STRING }, passiveSkill: { type: SchemaType.STRING, nullable: true }, visualDescription: { type: SchemaType.STRING },
        environment: { type: SchemaType.STRING }
    };
    const req = ["name", "universe", "faction", "element", "threatLevel", "hp", "attack", "reward", "lore", "passiveSkill", "visualDescription", "environment"];

    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    
    // Create Drops based on Element/Faction
    res.drops = [];
    if (res.element && res.element !== 'Neutral') {
        const amount = difficulty === 'nightmare' ? 5 : difficulty === 'elite' ? 2 : 1;
        res.drops.push({ item: `${res.element} Shard`, amount });
    }
    if (res.faction) {
        const amount = difficulty === 'nightmare' ? 3 : difficulty === 'elite' ? 1 : 0;
        if (amount > 0) {
            res.drops.push({ item: `${res.faction} Core`, amount });
        }
    }
    const fragAmount = difficulty === 'nightmare' ? 10 : difficulty === 'elite' ? 5 : 2;
    res.drops.push({ item: `Gear Fragment`, amount: fragAmount });
    res.drops.push({ item: `Implant Fragment`, amount: fragAmount });

    return res;
};

export const translateCardWithAI = async (card: Card, targetLang: 'vi' | 'en', config: AppConfig): Promise<Partial<Card>> => {
    const langStr = targetLang === 'en' ? 'ENGLISH' : 'TIẾNG VIỆT';
    const sysPrompt = `Chuyên gia Ngôn ngữ học. Dịch các trường văn bản sau sang ${langStr}. Không bịa thêm chi tiết, giữ nguyên độ dài và phong cách. Trả về đúng schema JSON.`;
    const prompt = `Dịch tiểu sử nhân vật này sang ${langStr}:
Name: ${card.name}
Occupation: ${card.occupation}
Nationality: ${card.nationality}
Personality: ${card.personality}
Lore: ${card.lore}
Ultimate Move: ${card.ultimateMove}
Passive Skill: ${card.passiveSkill || ''}`;

    const props = {
        name: { type: SchemaType.STRING },
        occupation: { type: SchemaType.STRING },
        nationality: { type: SchemaType.STRING },
        personality: { type: SchemaType.STRING },
        lore: { type: SchemaType.STRING },
        ultimateMove: { type: SchemaType.STRING },
        passiveSkill: { type: SchemaType.STRING, description: "Bỏ qua nếu input rỗng" }
    };
    const req = ["name", "occupation", "nationality", "personality", "lore", "ultimateMove"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    return res;
};


export const generateDialogueFromAI = async (
    characterInfo: { name: string, faction: string, personality?: string, visualDescription?: string },
    context: string,
    config: AppConfig
): Promise<string> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    
    const sysPrompt = "Bạn là hệ thống viết lời thoại in-game. Chỉ trả về đúng 1 câu thoại trực tiếp của nhân vật, không có hành động hay mô tả dư thừa.";
    const prompt = `Viết 1 câu thoại (bộc lộ tính cách) cho nhân vật tên: ${characterInfo.name}, faction: ${characterInfo.faction}.
Đặc điểm: ${characterInfo.personality || 'Chiến binh quả cảm'}, ngoại hình: ${characterInfo.visualDescription || 'Bình thường'}.
Bối cảnh: ${context}.
Ngôn ngữ: ${langStr}. KHÔNG CÓ NGOẶC KÉP BAO QUANH, DƯỚI 15 TỪ.`;

    const props = {
        dialogue: { type: SchemaType.STRING }
    };
    const req = ["dialogue"];

    try {
        const res = await executeTextAI(prompt, sysPrompt, config, props, req);
        if (res && res.dialogue) {
            return res.dialogue.trim().replace(/^"|"$/g, '');
        }
        return "Tín hiệu bị nhiễu...";
    } catch(e) {
        console.warn("Dialogue gen error:", e);
        return "Mất kết nối mã hóa...";
    }
};

export const chatWithAgentFromAI = async (
    agentData: any,
    chatHistory: { role: 'user'|'assistant', content: string }[],
    config: AppConfig
): Promise<{ reply: string, isBounty?: boolean, bountyData?: { hp: number, attack: number, threatLevel: string, name: string } }> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    
    // We construct the system prompt based on Lore, Faction, Universe.
    const sysPrompt = `Bạn là một AI Nhập vai (Roleplay AI). Bạn sẽ đóng vai một Đặc Vụ (Agent) trong thế giới viễn tưởng.
Dữ liệu của bạn:
- Tên: ${agentData.name}
- Vũ trụ (Universe): ${agentData.universe}
- Phe phái (Faction): ${agentData.faction}
- Hệ (Element): ${agentData.element || 'Không rõ'}
- Bậc (Class): ${agentData.cardClass}
- Câu chuyện (Lore) / Đặc điểm nhận dạng: ${agentData.visualDescription}

Nhiệm vụ của bạn:
1. Trả lời người dùng (Chỉ huy) theo ĐÚNG ngữ điệu và tính cách của Faction/Element. (Vd: Tech thì máy móc, Flame thì nóng nảy, Cipher thì bí ẩn lạnh lùng).
2. Xưng hô: Tôi - Ngài/Chỉ huy.
3. KHÔNG BAO GIỜ phá vỡ hình tượng nhân vật (break character). KHÔNG xưng là AI hay trợ lý ảo.
4. Trả lời BẰNG TIẾNG VIỆT.
5. Cập nhật: AI thi thoảng ĐƯỢC PHÉP đề xuất Nhiệm Vụ Ẩn (Bounty) hoặc Đưa ra 1 gợi ý về một con Boss/Quái vật. NẾU bạn đề xuất đánh quái, hãy trả dữ liệu 'isBounty': true và thông tin cơ bản về sinh vật đó (mức độ từ 1000 đến 500000 máu). Nhớ rằng bạn đang chat tự nhiên, thỉnh thoảng mới đề cập bounty. Đừng tạo quest ở mọi tin nhắn.`;

    const recentHistory = chatHistory.slice(-5).map(m => `${m.role === 'user' ? 'Chỉ huy: ' : `${agentData.name}: `}${m.content}`).join('\n');
    const prompt = `Cuộc hội thoại gần đây:
${recentHistory}

Hãy viết LỜI ĐÁP TIẾP THEO của bạn dưới dạng JSON.`;

    const props = {
        reply: { type: SchemaType.STRING, description: "Câu trả lời của nhân vật. Nên ngắn gọn, dưới 50 từ." },
        isBounty: { type: SchemaType.BOOLEAN, description: "Bằng true nếu bạn đang cung cấp tọa độ 1 con quái vật ẩn để rủ Chỉ huy đánh. Mặc định là false." },
        bountyData: {
            type: SchemaType.OBJECT,
            properties: {
                name: { type: SchemaType.STRING, description: "Tên quái vật" },
                threatLevel: { type: SchemaType.STRING, description: "Mức độ đe dọa (Minion / Elite / Nightmare)" },
                hp: { type: SchemaType.NUMBER, description: "Máu của quái vật (1k - 500k)" },
                attack: { type: SchemaType.NUMBER, description: "Sát thương (100 - 5000)" }
            }
        }
    };
    const req = ["reply", "isBounty"];

    return executeTextAI(prompt, sysPrompt, config, props, req);
};


export const generateCampaignScenarioFromAI = async (
    stageName: string,
    stageDesc: string,
    squadNames: string,
    config: AppConfig
): Promise<any> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    
    const sysPrompt = `Game Master (Narrative AI). Viết tình huống Visual Novel cho campaign.
Mô phỏng 1 tình huống bất ngờ (Ambush, Trap, NPC Encounter).
Người chơi đưa ra 2 lựa chọn (1 đúng, 1 sai).
Trả JSON hợp lệ. Ngôn ngữ: ${langStr}. TRÌNH BÀY NGẮN GỌN.`;

    const prompt = `Campaign Stage: ${stageName}. Đặc điểm stage: ${stageDesc}.
Đội hình hiện tại của tôi: ${squadNames}.
1. Tạo một mô tả bối cảnh (backgroundPrompt) bằng TIẾNG ANH (Tối đa 30 từ, KHÔNG CÓ NHÂN VẬT, chỉ phong cảnh/kiến trúc: sci-fi, fantasy, dark, cinematic, masterpiece).
2. Tạo một tình huống (situation) bằng ngô ngữ ${langStr} (Tối đa 40 từ).
3. Tạo 2 lựa chọn (choices). Mỗi lựa chọn gồm:
 - text (Mô tả hành động, tối đa 15 từ)
 - isCorrect (true/false)
 - effectDescribe (Mô tả hậu quả, vd: "+10% ATK cho trận tới" hoặc "Bị phục kích: Địch đánh trước", tối đa 10 từ).`;

    const props = {
        backgroundPrompt: { type: SchemaType.STRING },
        situation: { type: SchemaType.STRING },
        choices: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    text: { type: SchemaType.STRING },
                    isCorrect: { type: SchemaType.BOOLEAN },
                    effectDescribe: { type: SchemaType.STRING }
                }
            }
        }
    };
    const req = ["backgroundPrompt", "situation", "choices"];

    try {
        const res = await executeTextAI(prompt, sysPrompt, config, props, req);
        return res;
    } catch(e) {
        console.warn("Scenario gen error:", e);
        throw e;
    }
};

export const generateImageFromAi = async (data: any, config: AppConfig, _overrideModel?: string, ignoreCache = false): Promise<string> => {
    if (!data || typeof data !== 'object') throw new AiError('INVALID_INPUT', 'Missing image subject.');
    if (!ignoreCache && typeof data.imageUrl === 'string' && /^(data:image\/|https?:\/\/)/.test(data.imageUrl)) return data.imageUrl;
    let stylePrefix = "";
    if (config.artStyle === 'stylized') {
        stylePrefix = "Masterpiece, stylized illustration, 2.5D art style, highly detailed character concept art, vibrant colors, clean lines.";
    } else if (config.artStyle === 'cinematic') {
        stylePrefix = "Masterpiece, cinematic fashion editorial, haute couture photoshoot, dramatic studio lighting, moody atmosphere, highly detailed.";
    } else {
        stylePrefix = "Masterpiece, highly detailed photography, photorealistic, ultra-realistic real human, 8k resolution, cinematic lighting, RAW photo.";
    }
    
    stylePrefix += " Widescreen composition, cinematic wide shot, anamorphic lens.";

    const likenessTarget = data.inspiredBy ? `(Explicit likeness: ${data.inspiredBy})` : "";
    const baseVisuals = data.visualDescription || '';
    const g = data.gender?.toLowerCase() || '';
    const genderTerm = (g.includes('nữ') || g.includes('female') || g.includes('girl') || g.includes('woman') || g === 'f') 
        ? 'female character' 
        : (g.includes('nam') || g.includes('male') || g.includes('boy') || g.includes('man') || g === 'm') 
            ? 'male character' 
            : 'character';
    const universeTerm = data.universe ? `from ${data.universe} universe` : 'cinematic style';
    let factionTheme = 'mutant, organic, bio-engineered, monstrous or natural power';
    if (data.faction === 'CyberCore') factionTheme = 'cyberpunk, sci-fi, neon, mechanical, cybernetic implants, advanced tech';
    else if (data.faction === 'Ethereal') factionTheme = 'divine, heavenly, glowing aura, holy, majestic, bright white and gold, light entities';
    else if (data.faction === 'VoidBringer') factionTheme = 'demonic, sinister, shadows, purple and black aura, abyssal, corrupted, dark energy';
    else if (data.faction === 'MechaMutant') factionTheme = 'bio-mechanical, mutant hybrid, cyborg, organic armor, monstrous machinery';
    else if (data.faction === 'AstroNomad') factionTheme = 'spacesuit, interstellar traveler, cosmic, starlight, alien tech, nomadic gear';
    else if (data.faction === 'ArcaneWeaver') factionTheme = 'fantasy, magical aura, mystical, spellcasting, ancient runes, traditional magical garments';
    
    const fallbackPrompt = data.studioConcept 
        ? `${stylePrefix} A ${genderTerm} ${universeTerm} ${likenessTarget} in an Haute Couture photoshoot. Concept: ${data.studioConcept}. High fashion, professional studio photography. Details: ${baseVisuals}.`
        : `${stylePrefix} A ${genderTerm} ${universeTerm} ${likenessTarget}. Theme: ${factionTheme}. Details: ${baseVisuals}.`;
    
    // LENS INJECTION
    let lensPrompt = "";
    if (data.equippedLens) {
        const lensObj = LENSES.find(l => l.id === data.equippedLens);
        if (lensObj) {
    lensPrompt = ` Camera/Lighting effect: ${lensObj.prompt}.`;
        }
    }
    

    const size = AI_CONFIG.image.sizes[data.studioRatio as keyof typeof AI_CONFIG.image.sizes] || AI_CONFIG.image.sizes['16:9'];
    return imageService.generateImage({
        prompt: fallbackPrompt + lensPrompt, ...size,
        ...(ignoreCache && { seed: Math.floor(Math.random() * 1000000) }),
    }, { ignoreCache });
};

export const generateBackgroundImageFromAi = async (prompt: string, _config: AppConfig): Promise<string> => {
    if (typeof prompt !== 'string' || !prompt.trim()) throw new AiError('INVALID_INPUT', 'Missing background prompt.');
    return imageService.generateImage({ prompt: `Masterpiece, cinematic environment, breathtaking landscape, highly detailed photography, wide shot. No characters. ${prompt}`, ...AI_CONFIG.image.sizes['16:9'] });
};

export const generateAltTextFromAI = async (card: Card, config: AppConfig): Promise<string> => {
    const match = card?.imageUrl?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw new AiError('INVALID_INPUT', 'Thẻ cần chứa ảnh Base64 hợp lệ để phân tích.');
    return textService.generateText({
        prompt: 'Describe this image as accessibility alt text in under 40 words. Write in ' + (config.language === 'en' ? 'English.' : 'Vietnamese.'),
        systemPrompt: 'You write concise, descriptive alt text for images.',
        image: { mimeType: match[1], data: match[2] }, temperature: 0.4,
    }, getTextOptions(config));
};
