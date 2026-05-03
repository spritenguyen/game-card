import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, Card, Boss } from "../types";

export const GlobalApiState = {
    geminiBannedUntil: 0,
    currentStatusMsg: "",
    notify: (msg: string) => {
        if (typeof window !== 'undefined') {
            GlobalApiState.currentStatusMsg = msg;
            window.dispatchEvent(new CustomEvent('api_status_message', { detail: msg }));
        }
    },
    setCurrentApi: (apiName: string) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('api_active_name', { detail: apiName }));
        }
    },
    setIdle: () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('api_active_name', { detail: 'Idle' }));
            GlobalApiState.currentStatusMsg = "";
            window.dispatchEvent(new CustomEvent('api_status_message', { detail: '' }));
        }
    }
};

function extractJsonFromString(text: string) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && start < end) {
        return text.substring(start, end + 1);
    }
    return text;
}

async function executeTextAI(prompt: string, sysPrompt: string, config: AppConfig, schemaProps: any, required: string[]): Promise<any> {
    const formatPrompt = `${sysPrompt}

MUST format response as raw JSON matching this structure:
${JSON.stringify({ ...Object.keys(schemaProps).reduce((a,k)=>({...a, [k]: schemaProps[k].type}), {}) })}`;

    const geminiKeyToUse = (config.useCustomGemini && config.geminiKey) ? config.geminiKey.trim() : process.env.GEMINI_API_KEY;
    if (config.useCustomGemini && geminiKeyToUse && Date.now() > GlobalApiState.geminiBannedUntil) {
        try {
            GlobalApiState.setCurrentApi("Gemini (Google AI)");
            GlobalApiState.notify("Đang dùng Gemini theo tùy chọn...");
            const ai = new GoogleGenAI({ apiKey: geminiKeyToUse });
            const response = await ai.models.generateContent({
                model: config.geminiModel || "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    systemInstruction: sysPrompt,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: schemaProps,
                        required: required
                    }
                }
            });
            if (response.text) {
                const textOutput = response.text || "";
                return JSON.parse(extractJsonFromString(textOutput));
            }
        } catch (err: any) {
            console.warn("Gemini Error:", err);
            const errStr = String(err.message || "").toLowerCase();
            if (errStr.includes("api key not valid") || errStr.includes("invalid api key")) {
                GlobalApiState.geminiBannedUntil = Date.now() + 5 * 60 * 1000;
                GlobalApiState.notify("Gemini API Key lỗi! Tạm ngưng Gemini 5 phút, chuyển sang Pollinations...");
            } else if (errStr.includes("429") || errStr.includes("quota")) {
                GlobalApiState.geminiBannedUntil = Date.now() + 5 * 60 * 1000;
                GlobalApiState.notify("Gemini hết Quota/Limit! Đang chuyển tự động sang Pollinations API.");
            } else {
                GlobalApiState.notify("Gemini gặp lỗi: " + (err.message || "Unknown").substring(0, 30) + "... Chuyển tự động sang API dự phòng.");
            }
        }
    }

    const hasCustomKey = config.pollinationsKey && config.pollinationsKey.trim() !== "";
    const payload = {
        model: "openai",
        jsonMode: true,
        messages: [
            { role: "system", content: formatPrompt },
            { role: "user", content: prompt }
        ]
    };

    const tryFetchText = async (url: string, useKey: boolean, apiName: string): Promise<any> => {
        GlobalApiState.setCurrentApi(apiName);
        
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (useKey && hasCustomKey) {
            headers["Authorization"] = `Bearer ${config.pollinationsKey.trim()}`;
        }
        
        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(payload)
            });
        } catch (fetchErr: any) {
            console.error("Fetch Network Error:", fetchErr);
            throw new Error(`Network/CORS Error: ${fetchErr.message}`);
        }
        
        if (!res.ok) {
            if (res.status === 402 || res.status === 429 || res.status === 403) {
                throw new Error(`429_LIMIT`);
            }
            throw new Error(`Status ${res.status}`);
        }
        
        let responseText = await res.text();
        let actualContent = "";
        try {
            let parsedRaw = JSON.parse(responseText);
            if (parsedRaw && parsedRaw.choices && parsedRaw.choices[0] && parsedRaw.choices[0].message) {
                actualContent = parsedRaw.choices[0].message.content;
            } else if (parsedRaw && parsedRaw.error) {
                throw new Error("POLLI_API_ERROR:" + (parsedRaw.error.message || "Unknown error"));
            } else {
                actualContent = responseText;
            }
        } catch (e: any) {
            if (e.message?.startsWith("POLLI_API_ERROR:")) {
                 throw new Error(e.message.replace("POLLI_API_ERROR:", ""));
            }
            actualContent = responseText;
        }

        let parsed;
        try {
            parsed = JSON.parse(extractJsonFromString(actualContent));
            if (!parsed || Object.keys(parsed).length === 0) throw new Error("Empty json");
        } catch(err) {
            console.error("Parse AI Error:", err, actualContent);
            throw new Error("Dữ liệu trả về không phải JSON hợp lệ.");
        }
        return parsed;
    };

    const PROXY_URL = "https://pollinations-proxy.spritenguyen.workers.dev/v1/chat/completions";
    const FREE_URL = "https://text.pollinations.ai/v1/chat/completions";

    // Tier 1: User's Custom SK_KEY
    if (hasCustomKey) {
        try {
            GlobalApiState.notify("Đang dùng Pollinations (Custom Key)...");
            return await tryFetchText(FREE_URL, true, "Polli Text (Custom Key)");
        } catch (e: any) {
            console.warn("Pollinations Custom Key Error:", e);
            GlobalApiState.notify("Custom Key lỗi/hết phấn hoa! Chuyển sang Proxy...");
        }
    }

    // Tier 2: Proxy (Built-in SK_KEY)
    try {
        GlobalApiState.notify("Đang dùng Pollinations (Proxy SK_KEY)...");
        return await tryFetchText(PROXY_URL, false, "Polli Text (Proxy SK_KEY)");
    } catch (e: any) {
        console.warn("Pollinations Proxy Text Error:", e);
        GlobalApiState.notify("Proxy lỗi/hết phấn hoa! Chuyển tự động sang API Free...");
    }

    // Tier 3: Free URL (No Key)
    try {
        GlobalApiState.notify("Sử dụng Pollinations Free API (No Key)...");
        return await tryFetchText(FREE_URL, false, "Polli Text (Free API)");
    } catch(e: any) {
        GlobalApiState.setCurrentApi("Lỗi API ❌");
        GlobalApiState.notify("Tất cả Cổng kết nối Text AI đều lỗi: " + (e.message || "Unknown error"));
        throw e;
    }
}

export const rollFaction = (): string => {
    const r = Math.random() * 100;
    if (r < 30) return 'Tech';
    if (r < 60) return 'Magic';
    if (r < 90) return 'Mutant';
    if (r < 95) return 'Light';
    return 'Dark';
};

export const rollElement = (): string => {
    const r = Math.random() * 100;
    if (r < 18) return 'Fire';
    if (r < 36) return 'Water';
    if (r < 54) return 'Earth';
    if (r < 72) return 'Wind';
    if (r < 90) return 'Lightning';
    return 'Neutral';
};

export const generateCardFromAI = async (query: string, assignedRank: string, config: AppConfig, forcedFaction?: string): Promise<any> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    const hasPassive = ['SR', 'SSR', 'UR'].includes(assignedRank);
    const ultimateLv = assignedRank === 'N' ? 1 : assignedRank === 'R' ? 2 : assignedRank === 'SR' ? 3 : assignedRank === 'SSR' ? 5 : 10;
    const enforcedFaction = forcedFaction || rollFaction();
    const enforcedElement = rollElement();
    
    const sysPrompt = `Giám đốc Nghệ thuật AI. Trả về đúng schema JSON quy định. (TRẢ LỜI NGẮN GỌN, TRÁNH VƯỢT QUÁ GIỚI HẠN TOKEN)
1. Nội suy 'gender', 'universe'. Faction BẮT BUỘC LÀ: '${enforcedFaction}'. Chiều cao/cân nặng tự nhiên. TRƯỜNG 'measurements' (số đo 3 vòng) BẮT BUỘC trả về ĐỊNH DẠNG SỐ "XX-XX-XX" (VD: 90-60-90).
2. TRỌNG TÂM: Trường 'inspiredBy' PHẢI chứa TÊN CHÍNH XÁC của nhân vật gốc bằng Tiếng Anh.
3. Trường 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH, NGẮN GỌN DƯỚI 50 TỪ, miêu tả trang phục, khuôn mặt.
4. Hạng thẻ BẮT BUỘC là: ${assignedRank}.
5. TẤT CẢ CÁC TRƯỜNG VĂN BẢN KHÁC (name, occupation, personality, lore, ultimateMove...) BẮT BUỘC VIẾT NGẮN GỌN DƯỚI 50 TỪ BẰNG NGÔN NGỮ: ${langStr}. Sinh ra ultimateStats cho ultimateMove với power (100-3000), cooldown (2-8), scaling ('150% ATK' hoặc '200% MATK'...), energyCost (50-200).
6. Đặc tính Nguyên Tố BẮT BUỘC LÀ: '${enforcedElement}'.
7. Thẻ hạng N và R KHÔNG CÓ passiveSkill (trả về rỗng hoặc null). Thẻ SR, SSR, UR BẮT BUỘC có passiveSkill liên quan nguyên tố.`;
    const prompt = `Tạo thẻ nhân vật từ: ${query}. Xếp hạng: ${assignedRank}. Ngôn ngữ: ${langStr}. Nhớ GIỮ CÁC TRƯỜNG TEXT NGẮN GỌN.`;
    
    const props = {
        id: { type: Type.STRING }, name: { type: Type.STRING }, gender: { type: Type.STRING }, universe: { type: Type.STRING },
        faction: { type: Type.STRING }, element: { type: Type.STRING }, occupation: { type: Type.STRING }, nationality: { type: Type.STRING }, cardClass: { type: Type.STRING },
        height: { type: Type.INTEGER }, weight: { type: Type.INTEGER }, measurements: { type: Type.STRING }, personality: { type: Type.STRING },
        lore: { type: Type.STRING }, inspiredBy: { type: Type.STRING }, visualDescription: { type: Type.STRING }, passiveSkill: { type: Type.STRING }, ultimateMove: { type: Type.STRING },
        ultimateStats: {
            type: Type.OBJECT,
            properties: {
                power: { type: Type.INTEGER },
                cooldown: { type: Type.INTEGER },
                scaling: { type: Type.STRING },
                energyCost: { type: Type.INTEGER }
            }
        }
    };
    const req = ["name","gender","universe","faction","element","occupation","nationality","cardClass","height","weight","measurements","personality","lore","inspiredBy","visualDescription","ultimateMove","ultimateStats"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    res.language = config.language;
    res.ultimateLevel = ultimateLv;
    res.origin = 'Extracted';
    GlobalApiState.setIdle();
    return res;
};

export const generateFusionFromAI = async (c1: Card, c2: Card, targetRank: string, config: AppConfig): Promise<any> => {
    const targetHeight = Math.floor((c1.height || 170) * 0.3 + (c2.height || 170) * 0.7);
    const targetWeight = Math.floor((c1.weight || 60) * 0.3 + (c2.weight || 60) * 0.7);
    const forcedFaction = Math.random() > 0.5 ? c1.faction : c2.faction; // Inherit faction from parents dynamically
    const forcedElement = rollElement(); // Roll a new element for the fused card or you could mix... let's just roll randomly for variety
    const forcedGender = c1.gender || 'Unknown';
    const forcedUniverse = c2.universe || 'Unknown';
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    const hasPassive = ['SR', 'SSR', 'UR'].includes(targetRank);
    const ultimateLv = targetRank === 'N' ? 1 : targetRank === 'R' ? 2 : targetRank === 'SR' ? 3 : targetRank === 'SSR' ? 5 : 10;

    const sysPrompt = `Tiến sĩ Sinh học lai tạo (Chimera Protocol). Trả JSON hợp lệ. (NGẮN GỌN DƯỚI 50 TỪ MỖI TRƯỜNG).
1. Hạng thẻ BẮT BUỘC là: ${targetRank}.
2. Tộc Hệ BẮT BUỘC LÀ: '${forcedFaction}'. Giới tính BẮT BUỘC LÀ: '${forcedGender}'. Vũ trụ BẮT BUỘC LÀ: '${forcedUniverse}'. Đặc tính Nguyên Tố BẮT BUỘC LÀ: '${forcedElement}'.
3. Chiều cao khoảng ${targetHeight}cm, cân nặng khoảng ${targetWeight}kg. 'measurements' ĐỊNH DẠNG "XX-XX-XX".
4. Trường 'inspiredBy' là sự kết hợp tên gốc.
5. 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH (NGẮN GỌN).
6. CÁC TRƯỜNG VĂN BẢN KHÁC (lore, ultimateMove...) BẮT BUỘC VIẾT BẰNG NGÔN NGỮ: ${langStr} (NGẮN GỌN). Sinh ra ultimateStats cho ultimateMove với power (100-3000), cooldown (2-8), scaling ('150% ATK' hoặc '200% MATK'...), energyCost (50-200).
7. Thẻ hạng N và R KHÔNG CÓ passiveSkill (trả về null). Thẻ SR, SSR, UR BẮT BUỘC có passiveSkill (kế thừa hoặc tiến hóa từ bản gốc).`;

    const prompt = `Lai tạo DNA từ ${c1.name} và ${c2.name}. 
Ngoại hình Alpha: ${c1.visualDescription}. Ngoại hình Omega: ${c2.visualDescription}. 
Passives gốc (có thể null): ${c1.passiveSkill} & ${c2.passiveSkill}. 
Ngôn ngữ: ${langStr}. Trả JSON ngắn gọn.`;

    const props = {
        id: { type: Type.STRING }, name: { type: Type.STRING }, gender: { type: Type.STRING }, universe: { type: Type.STRING },
        faction: { type: Type.STRING }, element: { type: Type.STRING }, occupation: { type: Type.STRING }, nationality: { type: Type.STRING }, cardClass: { type: Type.STRING },
        height: { type: Type.INTEGER }, weight: { type: Type.INTEGER }, measurements: { type: Type.STRING }, personality: { type: Type.STRING },
        lore: { type: Type.STRING }, inspiredBy: { type: Type.STRING }, visualDescription: { type: Type.STRING }, passiveSkill: { type: Type.STRING }, ultimateMove: { type: Type.STRING },
        ultimateStats: {
            type: Type.OBJECT,
            properties: {
                power: { type: Type.INTEGER },
                cooldown: { type: Type.INTEGER },
                scaling: { type: Type.STRING },
                energyCost: { type: Type.INTEGER }
            }
        }
    };
    const req = ["name","gender","universe","faction","element","occupation","nationality","cardClass","height","weight","measurements","personality","lore","inspiredBy","visualDescription","ultimateMove","ultimateStats"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    res.language = config.language;
    res.ultimateLevel = ultimateLv;
    res.origin = 'Forged';
    res.parents = [c1.id, c2.id];
    GlobalApiState.setIdle();
    return res;
};

export const generateAscensionFromAI = async (baseCard: Card, config: AppConfig): Promise<any> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    const ultimateLv = 10;

    const sysPrompt = `Chuyên gia Tối Thượng Hóa (Ascension Protocol). Trả JSON hợp lệ. (NGẮN GỌN DƯỚI 50 TỪ MỖI TRƯỜNG).
1. Hạng thẻ BẮT BUỘC là: UR.
2. Tộc Hệ, Nguyên Tố, Giới tính, Vũ trụ, Chiều cao, Cân nặng, Số đo 3 vòng, Quốc tịch BẮT BUỘC PHÂN TÍCH VÀ KẾ THỪA Y HỆT TỪ THẺ GỐC. KHÔNG THAY ĐỔI NHỮNG THÔNG TIN CƠ BẢN NÀY.
3. Tên nhân vật (name): Giữ tên gốc nhưng có thể thêm tiền tố/hậu tố siêu việt (vd: "God-Emperor [Tên gốc]" hoặc "[Tên gốc] - Kẻ Thức Tỉnh").
4. 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH (NGẮN GỌN). Miêu tả biểu hiện sức mạnh thần thánh, aura rực rỡ, trang phục tiến hóa ở dạng tối thượng.
5. CÁC TRƯỜNG VĂN BẢN KHÁC (lore, ultimateMove, passiveSkill...) BẮT BUỘC VIẾT BẰNG NGÔN NGỮ: ${langStr} (NGẮN GỌN). Thể hiện sức mạnh vô song, câu chuyện về sự thức tỉnh. Sinh ra ultimateStats cho ultimateMove với power (2500-5000), cooldown (2-5), scaling ('300% ATK' hoặc '400% MATK'...), energyCost (80-150).`;

    const prompt = `Thức tỉnh thẻ bài sau lên hạng UR: 
- Tên: ${baseCard.name}
- Tộc/Hệ: ${baseCard.faction} / ${baseCard.element}
- Ngoại hình cũ: ${baseCard.visualDescription}
- Chiêu cuối cũ: ${baseCard.ultimateMove}
Nhiệm vụ: Cường hóa mọi thứ, tạo ra phiên bản thần thánh của nhân vật này. Trả JSON.`;

    const props = {
        id: { type: Type.STRING }, name: { type: Type.STRING }, gender: { type: Type.STRING }, universe: { type: Type.STRING },
        faction: { type: Type.STRING }, element: { type: Type.STRING }, occupation: { type: Type.STRING }, nationality: { type: Type.STRING }, cardClass: { type: Type.STRING },
        height: { type: Type.INTEGER }, weight: { type: Type.INTEGER }, measurements: { type: Type.STRING }, personality: { type: Type.STRING },
        lore: { type: Type.STRING }, inspiredBy: { type: Type.STRING }, visualDescription: { type: Type.STRING }, passiveSkill: { type: Type.STRING }, ultimateMove: { type: Type.STRING },
        ultimateStats: {
            type: Type.OBJECT,
            properties: {
                power: { type: Type.INTEGER },
                cooldown: { type: Type.INTEGER },
                scaling: { type: Type.STRING },
                energyCost: { type: Type.INTEGER }
            }
        }
    };
    const req = ["name","gender","universe","faction","element","occupation","nationality","cardClass","height","weight","measurements","personality","lore","inspiredBy","visualDescription","ultimateMove","ultimateStats","passiveSkill"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    res.language = config.language;
    res.ultimateLevel = ultimateLv;
    res.origin = 'Forged';
    res.parents = [baseCard.id];
    GlobalApiState.setIdle();
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
    const prompt = `Tạo Boss cấp độ ${threatPrefix} có chỉ số sức mạnh cố định: HP dao động (${hpRange}) và ATK dao động (${atkRange}). Random vũ trụ. BẮT BUỘC TỘC HỆ (Faction) LÀ: '${enforcedFaction}'. Đặc tính Nguyên Tố BẮT BUỘC LÀ: '${enforcedElement}'. Phần thưởng (${rewardRange} DC). Thêm tiền tố "${threatPrefix} " vào threatLevel. JSON ngắn gọn!`;

    const props = {
        id: { type: Type.STRING }, name: { type: Type.STRING }, universe: { type: Type.STRING }, faction: { type: Type.STRING }, element: { type: Type.STRING },
        threatLevel: { type: Type.STRING }, hp: { type: Type.INTEGER }, attack: { type: Type.INTEGER }, reward: { type: Type.INTEGER },
        lore: { type: Type.STRING }, passiveSkill: { type: Type.STRING }, visualDescription: { type: Type.STRING }
    };
    const req = ["name", "universe", "faction", "element", "threatLevel", "hp", "attack", "reward", "lore", "passiveSkill", "visualDescription"];

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

    GlobalApiState.setIdle();
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
Ultimate Move: ${card.ultimateMove}`;

    const props = {
        name: { type: Type.STRING },
        occupation: { type: Type.STRING },
        nationality: { type: Type.STRING },
        personality: { type: Type.STRING },
        lore: { type: Type.STRING },
        ultimateMove: { type: Type.STRING }
    };
    const req = ["name", "occupation", "nationality", "personality", "lore", "ultimateMove"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    GlobalApiState.setIdle();
    return res;
};

// Cache in-memory to prevent multiple calls for the same card description in one session
const renderCache = new Map<string, string>();
const activeRenders = new Map<string, Promise<string>>();

export const generateImageFromAi = async (data: any, config: AppConfig, overrideModel?: string): Promise<string> => {
    // 1. Create a fingerprint based on physical attributes
    const fingerprint = `${data.name}-${data.rank}-${data.faction}-${data.element}-${data.level}`;

    // 2. Check early exit (already has URL)
    if (data.imageUrl && (data.imageUrl.startsWith('data:image/') || data.imageUrl.startsWith('http'))) {
        return data.imageUrl;
    }

    // 3. Check session cache
    if (renderCache.has(fingerprint)) {
        return renderCache.get(fingerprint)!;
    }

    // 4. Boss Image Caching Logic (Pool by Faction and Threat Level to save API calls)
    // Moved up to avoid triggering "AI Render (Khởi tạo)" API status prematurely
    const isBoss = data.hp && data.attack && !data.cardClass; // Boss detection
    let bossCacheKey = "";
    if (isBoss) {
        const threatLvlStr = data.threatLevel ? data.threatLevel.split(" ")[0].toLowerCase() : "alpha";
        bossCacheKey = `boss_img_pool_${data.faction}_${threatLvlStr}`.replace(/\s+/g, '_').toLowerCase();
        const cached = localStorage.getItem(bossCacheKey);
        if (cached) {
            GlobalApiState.notify("Sử dụng diện mạo Boss tái tổ hợp từ Archive (Cache)...");
            return cached;
        }
    }

    // 5. Check if a render is already in progress for this fingerprint
    if (activeRenders.has(fingerprint)) {
        return activeRenders.get(fingerprint)!;
    }

    const renderPromise = (async () => {
        try {
            GlobalApiState.setCurrentApi("AI Render (Khởi tạo)");
            
            const modelToUse = overrideModel || config.defaultImageModel || 'flux';
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
            const baseVisuals = data.visualDescription;
            const genderTerm = data.gender?.toLowerCase().includes('nữ') ? 'female character' : (data.gender?.toLowerCase().includes('nam') ? 'male character' : 'character');
            const universeTerm = data.universe ? `from ${data.universe} universe` : 'cinematic style';
            let factionTheme = 'mutant, organic, bio-engineered, monstrous or natural power';
            if (data.faction === 'Tech') factionTheme = 'cyberpunk, sci-fi, neon, mechanical';
    else if (data.faction === 'Magic') factionTheme = 'fantasy, magical aura, mystical, spellcasting';
    else if (data.faction === 'Light') factionTheme = 'divine, heavenly, glowing aura, holy, majestic, bright white and gold';
    else if (data.faction === 'Dark') factionTheme = 'demonic, sinister, shadows, purple and black aura, abyssal, corrupted';
    
    const randomSeed = Math.floor(Math.random() * 1000000);
    const fallbackPrompt = `${stylePrefix} A ${genderTerm} ${universeTerm} ${likenessTarget}. Theme: ${factionTheme}. Details: ${baseVisuals}.`;
    
    let enhancedPrompt = fallbackPrompt;
    try {
        GlobalApiState.notify("Đang nội suy prompt tối ưu cho " + modelToUse + "...");
        const sysPrompt = "You are an expert AI prompt engineer. Write a highly optimized, descriptive English prompt for an image generation model. Maintain the core essence of the character but enhance the wording to get the best visual quality out of the specific target model and art style. Keep it under 60 words. Return JSON.";
        const userPrompt = `Target Model: ${modelToUse}
Target Art Style: ${config.artStyle}
Base Character Info: ${fallbackPrompt}`;
        const promptProps = { optimizedPrompt: { type: Type.STRING, description: "The final optimized English prompt" } };
        const promptRes = await executeTextAI(userPrompt, sysPrompt, config, promptProps, ["optimizedPrompt"]);
        if (promptRes && promptRes.optimizedPrompt) {
            enhancedPrompt = promptRes.optimizedPrompt;
        }
    } catch (e) {
        console.warn("Auto-prompt optimization failed, using fallback:", e);
    }

    // Internal function to save to cache
    const saveToCacheIfBoss = (imgUrl: string) => {
        if (isBoss && bossCacheKey) {
            try {
                localStorage.setItem(bossCacheKey, imgUrl);
            } catch(e) {
                // Clear old boss images if quota exceeded
                Object.keys(localStorage).filter(k=>k.startsWith('boss_img_pool_')).forEach(k=>localStorage.removeItem(k));
                localStorage.setItem(bossCacheKey, imgUrl);
            }
        }
    };

    const hasCustomKey = config.pollinationsKey && config.pollinationsKey.trim() !== "";

    const tryFetchImage = async (baseUrl: string, useKey: boolean, apiName: string): Promise<string> => {
        GlobalApiState.setCurrentApi(apiName);
        const fluxUrl = `${baseUrl}/image/${encodeURIComponent(enhancedPrompt)}?width=1920&height=1080&nologo=true&model=${modelToUse}&seed=${randomSeed}`;
        
        const headers: Record<string, string> = {};
        if (useKey && hasCustomKey) {
            headers['Authorization'] = `Bearer ${config.pollinationsKey.trim()}`;
        }

        const res = await fetch(fluxUrl, { method: 'GET', headers });
        if (!res.ok) {
            if (res.status === 402 || res.status === 429 || res.status === 403) {
                 throw new Error(`429_LIMIT`);
            }
            throw new Error(`Load Image fail: ${res.status}`);
        }
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const res = reader.result as string;
                        saveToCacheIfBoss(res);
                        resolve(res);
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/webp', 0.8);
                saveToCacheIfBoss(dataUrl);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error("Lỗi parse ảnh tải về"));
            img.src = URL.createObjectURL(blob);
        });
    };

    const PROXY_URL = "https://pollinations-proxy.spritenguyen.workers.dev";
    const FREE_URL = "https://image.pollinations.ai";

    // Tier 1: User's Custom SK_KEY
    if (hasCustomKey) {
        try {
            GlobalApiState.notify("Đang dùng Pollinations Image (Custom Key)...");
            const res = await tryFetchImage(FREE_URL, true, "Polli Image (Custom Key)");
            GlobalApiState.setIdle();
            return res;
        } catch (e: any) {
            console.warn("Pollinations Custom Key Image Error:", e);
            GlobalApiState.notify("Custom Key lỗi ảnh! Chuyển qua Proxy...");
        }
    } 

    // Tier 2: Proxy (Has SK_KEY built-in)
    try {
        GlobalApiState.notify("Đang dùng Pollinations Image (Proxy SK_KEY)...");
        const res = await tryFetchImage(PROXY_URL, false, "Polli Image (Proxy SK_KEY)");
        GlobalApiState.setIdle();
        return res;
    } catch (e: any) {
        console.warn("Pollinations Proxy Image Error:", e);
        GlobalApiState.notify("Proxy lỗi ảnh! Chuyển qua API Free...");
    } 

    // Tier 3: Free API URL (No Key)
    try {
        GlobalApiState.notify("Sử dụng Pollinations Image Free API (No Key)...");
        const res = await tryFetchImage(FREE_URL, false, "Polli Image (Free API)");
        GlobalApiState.setIdle();
        return res;
    } catch (e: any) {
        console.warn("Lỗi tải ảnh qua tất cả API:", e);
        GlobalApiState.setCurrentApi("Lỗi Render Ảnh ❌");
        GlobalApiState.notify("Tất cả API ảnh đều quá tải hoặc lỗi!");
        GlobalApiState.setIdle();
        throw e;
    }
} finally {
    activeRenders.delete(fingerprint);
}
})();

activeRenders.set(fingerprint, renderPromise);
renderPromise.then(url => {
    renderCache.set(fingerprint, url);
});

return renderPromise;
};

export const generateAltTextFromAI = async (card: Card, config: AppConfig): Promise<string> => {
    const apiKey = (config.useCustomGemini && config.geminiKey) ? config.geminiKey.trim() : process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing Gemini API Key for image analysis.");
    }

    if (!card.imageUrl || !card.imageUrl.startsWith('data:image/')) {
        throw new Error("Không tìm thấy dữ liệu ảnh (Base64) hợp lệ của thẻ. Thẻ phải chứa ảnh để phân tích.");
    }

    const mimeType = card.imageUrl.split(';')[0].split(':')[1];
    const base64Data = card.imageUrl.split(',')[1];
    const modelStr = config.geminiModel || "gemini-3-flash-preview";

    GlobalApiState.setCurrentApi("Gemini Vision");
    GlobalApiState.notify("Đang phân tích hình ảnh (Vision)...");

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: base64Data
        }
    };
    const textPart = {
        text: "Describe this image in detail as an alt text for accessibility and context. Keep it under exactly 40 words. Write in " + (config.language === 'en' ? 'English' : 'Vietnamese') + "."
    };

    const response = await ai.models.generateContent({
        model: modelStr,
        contents: { parts: [imagePart, textPart] },
        config: {
            systemInstruction: "You are an expert at writing concise and descriptive alt text for images.",
            temperature: 0.4
        }
    });

    GlobalApiState.setIdle();
    
    if (response.text) return response.text.trim();
    return "Alt text generation failed.";
};
