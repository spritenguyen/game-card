import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, Card, Boss } from "../types";
import { LENSES } from "../lib/constants";

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

    const geminiKeyToUse = config.useCustomGemini ? (config.geminiKey?.trim() || process.env.GEMINI_API_KEY) : null;
    if (geminiKeyToUse && Date.now() > GlobalApiState.geminiBannedUntil) {
        try {
            const isSystemKey = !config.geminiKey?.trim();
            GlobalApiState.setCurrentApi(isSystemKey ? "Gemini (System Key)" : "Gemini (Custom Key)");
            GlobalApiState.notify(isSystemKey ? "Đang chạy Gemini API hệ thống..." : "Đang dùng Gemini theo tùy chọn...");
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
    const FREE_URL = "https://text.pollinations.ai/openai";

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
    if (r < 25) return 'CyberCore';
    if (r < 45) return 'Ethereal';
    if (r < 65) return 'VoidBringer';
    if (r < 80) return 'MechaMutant';
    if (r < 90) return 'AstroNomad';
    return 'ArcaneWeaver';
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
1. Xác định giới tính (gender) của nhân vật ('Male' hoặc 'Female'). Nội suy 'universe'. Faction BẮT BUỘC LÀ: '${enforcedFaction}'. Chiều cao/cân nặng tự nhiên. TRƯỜNG 'measurements' (số đo 3 vòng) BẮT BUỘC trả về ĐỊNH DẠNG SỐ "XX-XX-XX" (VD: 90-60-90).
2. TRỌNG TÂM: Trường 'inspiredBy' PHẢI chứa TÊN CHÍNH XÁC của nhân vật gốc bằng Tiếng Anh.
3. Trường 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH, NGẮN GỌN DƯỚI 50 TỪ, miêu tả trang phục, khuôn mặt và PHẢI PHÙ HỢP VỚI GIỚI TÍNH ĐÃ CHỌN.
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
    const prompt = `Tạo Boss cấp độ ${threatPrefix} có chỉ số sức mạnh cố định: HP dao động (${hpRange}) và ATK dao động (${atkRange}). Random vũ trụ. BẮT BUỘC TỘC HỆ (Faction) LÀ: '${enforcedFaction}'. Đặc tính Nguyên Tố BẮT BUỘC LÀ: '${enforcedElement}'. Phần thưởng (${rewardRange} DC). Thêm tiền tố "${threatPrefix} " vào threatLevel. BẮT BUỘC TRẢ VỀ environment LÀ MỘT TRONG CÁC LOẠI ĐỊA HÌNH HOẶC KHÍ HẬU (ví dụ: "Bão Điện Từ", "Dung Nham", "Mưa Acid", "Tuyết Đen"). JSON ngắn gọn!`;

    const props = {
        id: { type: Type.STRING }, name: { type: Type.STRING }, universe: { type: Type.STRING }, faction: { type: Type.STRING }, element: { type: Type.STRING },
        threatLevel: { type: Type.STRING }, hp: { type: Type.INTEGER }, attack: { type: Type.INTEGER }, reward: { type: Type.INTEGER },
        lore: { type: Type.STRING }, passiveSkill: { type: Type.STRING }, visualDescription: { type: Type.STRING },
        environment: { type: Type.STRING }
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
Ultimate Move: ${card.ultimateMove}
Passive Skill: ${card.passiveSkill || ''}`;

    const props = {
        name: { type: Type.STRING },
        occupation: { type: Type.STRING },
        nationality: { type: Type.STRING },
        personality: { type: Type.STRING },
        lore: { type: Type.STRING },
        ultimateMove: { type: Type.STRING },
        passiveSkill: { type: Type.STRING, description: "Bỏ qua nếu input rỗng" }
    };
    const req = ["name", "occupation", "nationality", "personality", "lore", "ultimateMove"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    GlobalApiState.setIdle();
    return res;
};

// Cache in-memory to prevent multiple calls for the same card description in one session
const renderCache = new Map<string, string>();
const activeRenders = new Map<string, Promise<string>>();

export const generateImageFromAi = async (data: any, config: AppConfig, overrideModel?: string, ignoreCache: boolean = false): Promise<string> => {
    // 1. Create a fingerprint based on physical attributes
    const fingerprint = `${data.name}-${data.cardClass || data.rank || 'N'}-${data.faction}-${data.element}-${data.level || data.overclockLevel || 0}`;

    // 2. Check early exit (already has URL) - Skip if ignoring cache
    if (!ignoreCache && data.imageUrl && (data.imageUrl.startsWith('data:image/') || data.imageUrl.startsWith('http'))) {
        return data.imageUrl;
    }

    // 3. Check session cache - Skip if ignoring cache
    if (!ignoreCache && renderCache.has(fingerprint)) {
        return renderCache.get(fingerprint)!;
    }

    // 4. Boss Image Caching Logic (Pool by Faction and Threat Level to save API calls)
    // Moved up to avoid triggering "AI Render (Khởi tạo)" API status prematurely
    const isBoss = data.hp && data.attack && !data.cardClass; // Boss detection
    let bossCacheKey = "";
    if (isBoss && !ignoreCache) {
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
    
    const randomSeed = Math.floor(Math.random() * 1000000);
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
    
    let enhancedPrompt = fallbackPrompt + lensPrompt;
    try {
        GlobalApiState.notify("Đang nội suy prompt tối ưu cho " + modelToUse + "...");
        
        let modelRules = "";
        if (modelToUse === "flux") {
            modelRules = "Flux model responds well to concise keywords, high-fidelity tags like '4k', 'sharp focus', and clear subject definitions. Avoid overly long prose.";
        } else if (modelToUse === "gptimage") {
            modelRules = "GPT Image model prefers natural language descriptions and understands exact spatial layouts. Be precise about the composition.";
        } else if (modelToUse === "qwen-image") {
            modelRules = "Qwen Image Plus excels at intricate details and complex scenes. Prioritize lighting, texture, and atmospheric keywords.";
        } else if (modelToUse === "zimage") {
            modelRules = "Z-Image Turbo thrives on extreme brevity and hyper-specific visual markers. Use short, punchy aesthetic tags.";
        } else if (modelToUse === "wan-image") {
            modelRules = "Wan Image is versatile and highly stylistic. Clearly define the medium, mood, and color palette.";
        }

        const sysPrompt = `You are an expert AI prompt engineer. Write a highly optimized, descriptive English prompt for the chosen image generation model. Maintain the core essence of the character but enhance the wording to get the best visual quality out of the specific target model and art style. 

CRITICAL ANATOMY RULES: You must explicitly include strong positive keywords in your prompt to enforce flawless human anatomy, perfectly formed structural hands/fingers (exactly 5 fingers, realistic joints), symmetrical eyes, and correct bodily proportions.

Important specific rules for the model '${modelToUse}': ${modelRules} Keep it under 60 words. Return JSON.`;
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
        const ratio = data.studioRatio || '16:9';
        let reqWidth = 1920;
        let reqHeight = 1080;
        if (ratio === '1:1') { reqWidth = 1024; reqHeight = 1024; }
        else if (ratio === '9:16') { reqWidth = 768; reqHeight = 1344; }
        else if (ratio === '16:9') { reqWidth = 1920; reqHeight = 1080; }

        const fluxUrl = `${baseUrl}/image/${encodeURIComponent(enhancedPrompt)}?width=${reqWidth}&height=${reqHeight}&nologo=true&model=${modelToUse}&seed=${randomSeed}`;
        
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
}).catch(() => {
    // Expected: Caller will catch, cache won't be set
});

return renderPromise;
};

export const generateAltTextFromAI = async (card: Card, config: AppConfig): Promise<string> => {
    const apiKey = config.useCustomGemini ? (config.geminiKey?.trim() || process.env.GEMINI_API_KEY) : null;
    if (!apiKey) {
        throw new Error("Tính năng này yêu cầu bật Gemini Protocol trong Cài đặt.");
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

    try {
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
    } catch(e: any) {
        console.warn("Gemini Vision Error:", e);
        GlobalApiState.setCurrentApi("Lỗi API ❌");
        GlobalApiState.notify("Gemini Vision lỗi: " + (e.message || "Unknown error"));
        GlobalApiState.setIdle();
        throw e;
    }
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
        dialogue: { type: Type.STRING }
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
        reply: { type: Type.STRING, description: "Câu trả lời của nhân vật. Nên ngắn gọn, dưới 50 từ." },
        isBounty: { type: Type.BOOLEAN, description: "Bằng true nếu bạn đang cung cấp tọa độ 1 con quái vật ẩn để rủ Chỉ huy đánh. Mặc định là false." },
        bountyData: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "Tên quái vật" },
                threatLevel: { type: Type.STRING, description: "Mức độ đe dọa (Minion / Elite / Nightmare)" },
                hp: { type: Type.NUMBER, description: "Máu của quái vật (1k - 500k)" },
                attack: { type: Type.NUMBER, description: "Sát thương (100 - 5000)" }
            }
        }
    };
    const req = ["reply", "isBounty"];

    try {
        const res = await executeTextAI(prompt, sysPrompt, config, props, req);
        return res as any;
    } catch(e) {
        console.warn("Chat Gen error:", e);
        return { reply: "Tín hiệu liên lạc bị nhiễu... (Lỗi kết nối AI)" };
    }
};

export const generateBackgroundImageFromAi = async (promptMsg: string, config: AppConfig): Promise<string> => {
    GlobalApiState.setCurrentApi("AI Render (Môi trường)");
    const seed = Math.floor(Math.random() * 1000000);
    const modelToUse = config.defaultImageModel || 'flux';
    const finalPrompt = `Masterpiece, cinematic environment, breathtaking landscape, highly detailed photography, wide shot. No characters. ${promptMsg}`;

    const hasCustomKey = config.pollinationsKey && config.pollinationsKey.trim() !== "";

    const tryFetchImage = async (baseUrl: string, useKey: boolean, apiName: string): Promise<string> => {
        GlobalApiState.setCurrentApi(apiName);
        const fluxUrl = `${baseUrl}/image/${encodeURIComponent(finalPrompt)}?width=1920&height=1080&nologo=true&model=${modelToUse}&seed=${seed}`;
        
        const headers: Record<string, string> = {};
        if (useKey && hasCustomKey) {
            headers['Authorization'] = `Bearer ${config.pollinationsKey.trim()}`;
        }

        const res = await fetch(fluxUrl, { method: 'GET', headers });
        if (!res.ok) {
            throw new Error(`Load Image fail: ${res.status}`);
        }
        const blob = await res.blob();
        return URL.createObjectURL(blob); // Note: Since it's a temp background, Object URL is fine.
    };

    const PROXY_URL = "https://pollinations-proxy.spritenguyen.workers.dev";
    const FREE_URL = "https://image.pollinations.ai";

    if (hasCustomKey) {
        try {
            GlobalApiState.notify("Đang tải Môi trường (Custom Key)...");
            const res = await tryFetchImage(FREE_URL, true, "Polli Image (Custom Key)");
            GlobalApiState.setIdle();
            return res;
        } catch (e: any) {
            console.warn("Pollinations Custom Key Image Error:", e);
        }
    } 

    try {
        GlobalApiState.notify("Đang tải Môi trường (Proxy)...");
        const res = await tryFetchImage(PROXY_URL, false, "Polli Image (Proxy SK_KEY)");
        GlobalApiState.setIdle();
        return res;
    } catch (e: any) {
        console.warn("Pollinations Proxy Image Error:", e);
    } 

    try {
        GlobalApiState.notify("Sử dụng Pollinations Image Free API...");
        const res = await tryFetchImage(FREE_URL, false, "Polli Image (Free API)");
        GlobalApiState.setIdle();
        return res;
    } catch (e: any) {
        GlobalApiState.setCurrentApi("Lỗi Render Ảnh Môi Trường ❌");
        GlobalApiState.setIdle();
        throw e;
    }
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
        backgroundPrompt: { type: Type.STRING },
        situation: { type: Type.STRING },
        choices: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    isCorrect: { type: Type.BOOLEAN },
                    effectDescribe: { type: Type.STRING }
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
