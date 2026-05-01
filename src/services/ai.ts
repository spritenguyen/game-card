import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, Card, Boss } from "../types";

export const GlobalApiState = {
    geminiBannedUntil: 0,
    pollinationsCustomKeyBannedUntil: 0,
    pollinationsProBannedUntil: 0,
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
    }
};

function getNextHourTimestamp() {
    const now = new Date();
    // Reset at exactly the start of the next hour (e.g., 2:00, 3:00)
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    return now.getTime();
}

function formatWaitTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

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
                model: config.geminiModel || "gemini-2.5-flash",
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
    if (hasCustomKey && Date.now() > GlobalApiState.pollinationsCustomKeyBannedUntil) {
        let retries = 0;
        while (retries < 3) {
            try {
                if (retries === 0) GlobalApiState.notify("Đang sử dụng Pollinations (Custom Key)...");
                else GlobalApiState.notify(`Thử lại Custom Key (Lần ${retries}/2)...`);
                
                return await tryFetchText(FREE_URL, true, "Polli Text (Custom Key)");
            } catch (e: any) {
                if (e.message.includes("429_LIMIT") && retries < 2) {
                    retries++;
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                
                if (e.message.includes("429_LIMIT")) {
                    GlobalApiState.pollinationsCustomKeyBannedUntil = getNextHourTimestamp();
                    GlobalApiState.notify("Custom Key hết phấn hoa! Tự động chuyển sang Proxy...");
                } else {
                    console.warn("Pollinations Custom Key Error:", e);
                    GlobalApiState.notify("Lỗi Custom Key! Chuyển sang API dự phòng...");
                    GlobalApiState.pollinationsCustomKeyBannedUntil = Date.now() + 3 * 60 * 1000;
                }
                break;
            }
        }
    }

    // Tier 2: Proxy (Built-in SK_KEY)
    if (Date.now() > GlobalApiState.pollinationsProBannedUntil) {
        let retries = 0;
        while (retries < 3) {
            try {
                if (retries === 0) GlobalApiState.notify("Đang sử dụng Pollinations (Proxy SK_KEY)...");
                else GlobalApiState.notify(`Thử lại Pollinations Proxy (Lần ${retries}/2)...`);
                
                // useKey=false for PROXY_URL because proxy has built-in key
                return await tryFetchText(PROXY_URL, false, "Polli Text (Proxy SK_KEY)");
            } catch (e: any) {
                if (e.message.includes("429_LIMIT") && retries < 2) {
                    retries++;
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                
                if (e.message.includes("429_LIMIT")) {
                    GlobalApiState.pollinationsProBannedUntil = getNextHourTimestamp();
                    GlobalApiState.notify("Proxy hết phấn hoa! Chuyển tự động sang API Free...");
                } else {
                    console.warn("Pollinations Proxy Text Error:", e);
                    GlobalApiState.notify("Lỗi kết nối Proxy! Chuyển tự động sang API Free...");
                    GlobalApiState.pollinationsProBannedUntil = Date.now() + 3 * 60 * 1000;
                }
                break;
            }
        }
    }

    // Tier 3: Free URL (No Key)
    try {
        if (Date.now() <= GlobalApiState.pollinationsProBannedUntil && Date.now() <= GlobalApiState.pollinationsCustomKeyBannedUntil) {
            GlobalApiState.notify("Sử dụng Pollinations Free API (No Key)...");
        }
        return await tryFetchText(FREE_URL, false, "Polli Text (Free API)");
    } catch(e: any) {
        GlobalApiState.setCurrentApi("Lỗi API ❌");
        GlobalApiState.notify("Tất cả Cổng kết nối Text AI đều lỗi: " + (e.message || "Unknown error"));
        throw e;
    }
}

export const generateCardFromAI = async (query: string, assignedRank: string, config: AppConfig): Promise<any> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    const hasPassive = ['SR', 'SSR', 'UR'].includes(assignedRank);
    const ultimateLv = assignedRank === 'N' ? 1 : assignedRank === 'R' ? 2 : assignedRank === 'SR' ? 3 : assignedRank === 'SSR' ? 5 : 10;
    
    const sysPrompt = `Giám đốc Nghệ thuật AI. Trả về đúng schema JSON quy định. (TRẢ LỜI NGẮN GỌN, TRÁNH VƯỢT QUÁ GIỚI HẠN TOKEN)
1. Nội suy 'gender', 'universe'. Faction chọn 1 (Tech, Magic, Mutant). Chiều cao/cân nặng tự nhiên. TRƯỜNG 'measurements' (số đo 3 vòng) BẮT BUỘC trả về ĐỊNH DẠNG SỐ "XX-XX-XX" (VD: 90-60-90).
2. TRỌNG TÂM: Trường 'inspiredBy' PHẢI chứa TÊN CHÍNH XÁC của nhân vật gốc bằng Tiếng Anh.
3. Trường 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH, NGẮN GỌN DƯỚI 50 TỪ, miêu tả trang phục, khuôn mặt.
4. Hạng thẻ BẮT BUỘC là: ${assignedRank}.
5. TẤT CẢ CÁC TRƯỜNG VĂN BẢN KHÁC (name, occupation, personality, lore, ultimateMove...) BẮT BUỘC VIẾT NGẮN GỌN DƯỚI 50 TỪ BẰNG NGÔN NGỮ: ${langStr}.
6. Sinh ngẫu nhiên Đặc tính Nguyên Tố: 'Fire', 'Water', 'Earth', 'Lightning', 'Wind', 'Neutral'.
7. Thẻ hạng N và R KHÔNG CÓ passiveSkill (trả về rỗng hoặc null). Thẻ SR, SSR, UR BẮT BUỘC có passiveSkill liên quan nguyên tố.`;
    const prompt = `Tạo thẻ nhân vật từ: ${query}. Xếp hạng: ${assignedRank}. Ngôn ngữ: ${langStr}. Nhớ GIỮ CÁC TRƯỜNG TEXT NGẮN GỌN.`;
    
    const props = {
        id: { type: Type.STRING }, name: { type: Type.STRING }, gender: { type: Type.STRING }, universe: { type: Type.STRING },
        faction: { type: Type.STRING }, element: { type: Type.STRING }, occupation: { type: Type.STRING }, nationality: { type: Type.STRING }, cardClass: { type: Type.STRING },
        height: { type: Type.INTEGER }, weight: { type: Type.INTEGER }, measurements: { type: Type.STRING }, personality: { type: Type.STRING },
        lore: { type: Type.STRING }, inspiredBy: { type: Type.STRING }, visualDescription: { type: Type.STRING }, passiveSkill: { type: Type.STRING }, ultimateMove: { type: Type.STRING }
    };
    const req = ["name","gender","universe","faction","element","occupation","nationality","cardClass","height","weight","measurements","personality","lore","inspiredBy","visualDescription","ultimateMove"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    res.language = config.language;
    res.ultimateLevel = ultimateLv;
    res.origin = 'Extracted';
    return res;
};

export const generateFusionFromAI = async (c1: Card, c2: Card, targetRank: string, config: AppConfig): Promise<any> => {
    const targetHeight = Math.floor((c1.height || 170) * 0.3 + (c2.height || 170) * 0.7);
    const targetWeight = Math.floor((c1.weight || 60) * 0.3 + (c2.weight || 60) * 0.7);
    const forcedFaction = c1.faction || 'Tech';
    const forcedGender = c1.gender || 'Unknown';
    const forcedUniverse = c2.universe || 'Unknown';
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    const hasPassive = ['SR', 'SSR', 'UR'].includes(targetRank);
    const ultimateLv = targetRank === 'N' ? 1 : targetRank === 'R' ? 2 : targetRank === 'SR' ? 3 : targetRank === 'SSR' ? 5 : 10;

    const sysPrompt = `Tiến sĩ Sinh học lai tạo (Chimera Protocol). Trả JSON hợp lệ. (NGẮN GỌN DƯỚI 50 TỪ MỖI TRƯỜNG).
1. Hạng thẻ BẮT BUỘC là: ${targetRank}.
2. Tộc Hệ BẮT BUỘC LÀ: '${forcedFaction}'. Giới tính BẮT BUỘC LÀ: '${forcedGender}'. Vũ trụ BẮT BUỘC LÀ: '${forcedUniverse}'.
3. Chiều cao khoảng ${targetHeight}cm, cân nặng khoảng ${targetWeight}kg. 'measurements' ĐỊNH DẠNG "XX-XX-XX".
4. Trường 'inspiredBy' là sự kết hợp tên gốc.
5. 'visualDescription' BẮT BUỘC viết bằng TIẾNG ANH (NGẮN GỌN).
6. CÁC TRƯỜNG VĂN BẢN KHÁC (lore, ultimateMove...) BẮT BUỘC VIẾT BẰNG NGÔN NGỮ: ${langStr} (NGẮN GỌN).
7. Thẻ hạng N và R KHÔNG CÓ passiveSkill (trả về null). Thẻ SR, SSR, UR BẮT BUỘC có passiveSkill (kế thừa hoặc tiến hóa từ bản gốc).`;

    const prompt = `Lai tạo DNA từ ${c1.name} và ${c2.name}. 
Ngoại hình Alpha: ${c1.visualDescription}. Ngoại hình Omega: ${c2.visualDescription}. 
Passives gốc (có thể null): ${c1.passiveSkill} & ${c2.passiveSkill}. 
Ngôn ngữ: ${langStr}. Trả JSON ngắn gọn.`;

    const props = {
        id: { type: Type.STRING }, name: { type: Type.STRING }, gender: { type: Type.STRING }, universe: { type: Type.STRING },
        faction: { type: Type.STRING }, element: { type: Type.STRING }, occupation: { type: Type.STRING }, nationality: { type: Type.STRING }, cardClass: { type: Type.STRING },
        height: { type: Type.INTEGER }, weight: { type: Type.INTEGER }, measurements: { type: Type.STRING }, personality: { type: Type.STRING },
        lore: { type: Type.STRING }, inspiredBy: { type: Type.STRING }, visualDescription: { type: Type.STRING }, passiveSkill: { type: Type.STRING }, ultimateMove: { type: Type.STRING }
    };
    const req = ["name","gender","universe","faction","element","occupation","nationality","cardClass","height","weight","measurements","personality","lore","inspiredBy","visualDescription","ultimateMove"];
    
    const res = await executeTextAI(prompt, sysPrompt, config, props, req);
    res.language = config.language;
    res.ultimateLevel = ultimateLv;
    res.origin = 'Forged';
    res.parents = [c1.id, c2.id];
    return res;
};

export const generateBossFromAI = async (sHp: number, sAtk: number, difficulty: 'normal' | 'elite' | 'nightmare', config: AppConfig): Promise<any> => {
    const langStr = config.language === 'en' ? 'ENGLISH (Tiếng Anh)' : 'TIẾNG VIỆT';
    let hpRange = "5000 - 9000";
    let atkRange = "1200 - 2500";
    let rewardRange = "300 - 1000";
    let threatPrefix = "Alpha";
    if (difficulty === 'elite') { hpRange = "15000 - 25000"; atkRange = "3500 - 6000"; rewardRange = "1500 - 3000"; threatPrefix = "Elite"; }
    if (difficulty === 'nightmare') { hpRange = "35000 - 55000"; atkRange = "8000 - 13000"; rewardRange = "5000 - 15000"; threatPrefix = "Nightmare"; }

    const sysPrompt = `Game Master AI (DDA). JSON Ngôn ngữ: ${langStr}. (Mục visualDescription ghi Tiếng Anh). GIỮ CÁC TEXT NGẮN GỌN DƯỚI 40 TỪ.`;
    // We no longer display or base the prompt heavily on sHp/sAtk. We just give absolute ranges.
    const prompt = `Tạo Boss cấp độ ${threatPrefix} có chỉ số sức mạnh cố định: HP dao động (${hpRange}) và ATK dao động (${atkRange}). Random vũ trụ, Tộc Hệ, Đặc tính Nguyên Tố. Phần thưởng đánh bại (${rewardRange} DC). Thêm tiền tố "${threatPrefix} " vào threatLevel. JSON ngắn gọn!`;

    const props = {
        id: { type: Type.STRING }, name: { type: Type.STRING }, universe: { type: Type.STRING }, faction: { type: Type.STRING }, element: { type: Type.STRING },
        threatLevel: { type: Type.STRING }, hp: { type: Type.INTEGER }, attack: { type: Type.INTEGER }, reward: { type: Type.INTEGER },
        lore: { type: Type.STRING }, passiveSkill: { type: Type.STRING }, visualDescription: { type: Type.STRING }
    };
    const req = ["name", "universe", "faction", "element", "threatLevel", "hp", "attack", "reward", "lore", "passiveSkill", "visualDescription"];

    return await executeTextAI(prompt, sysPrompt, config, props, req);
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
    
    return await executeTextAI(prompt, sysPrompt, config, props, req);
};

export const generateImageFromAi = async (data: any, config: AppConfig, overrideModel?: string): Promise<string> => {
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
    const factionTheme = data.faction === 'Tech' ? 'cyberpunk, sci-fi, neon, mechanical' : (data.faction === 'Magic' ? 'fantasy, magical aura, mystical, spellcasting' : 'mutant, organic, bio-engineered, monstrous or natural power');
    
    // Boss Image Caching Logic
    const isBoss = data.hp && data.attack && !data.cardClass; // Boss detection
    if (isBoss) {
        const cacheKey = `boss_img_${data.universe}_${data.name}`.replace(/\s+/g, '_').toLowerCase();
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            GlobalApiState.notify("Sử dụng diện mạo Boss từ Archive (Cache)...");
            return cached;
        }
    }

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
        if (isBoss) {
            const cacheKey = `boss_img_${data.universe}_${data.name}`.replace(/\s+/g, '_').toLowerCase();
            try {
                localStorage.setItem(cacheKey, imgUrl);
            } catch(e) {
                // Clear old boss images if quota exceeded
                Object.keys(localStorage).filter(k=>k.startsWith('boss_img_')).forEach(k=>localStorage.removeItem(k));
                localStorage.setItem(cacheKey, imgUrl);
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
    if (hasCustomKey && Date.now() > GlobalApiState.pollinationsCustomKeyBannedUntil) {
        let retries = 0;
        while (retries < 3) {
            try {
                if (retries === 0) GlobalApiState.notify("Đang dùng Pollinations Image (Custom Key)...");
                else GlobalApiState.notify(`Thử lại kết nối ảnh Custom Key (Lần ${retries}/2)...`);
                
                return await tryFetchImage(FREE_URL, true, "Polli Image (Custom Key)");
            } catch (e: any) {
                if (e.message.includes("429_LIMIT") && retries < 2) {
                    retries++;
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                
                if (e.message.includes("429_LIMIT")) {
                    GlobalApiState.pollinationsCustomKeyBannedUntil = getNextHourTimestamp();
                    GlobalApiState.notify("Custom Key hết phấn hoa hình ảnh! Chuyển qua Proxy...");
                } else {
                    console.warn("Pollinations Custom Key Image Error:", e);
                    GlobalApiState.notify("Lỗi kết nối ảnh Custom Key! Chuyển qua dự phòng...");
                    GlobalApiState.pollinationsCustomKeyBannedUntil = Date.now() + 3 * 60 * 1000;
                }
                break;
            }
        }
    } 

    // Tier 2: Proxy (Has SK_KEY built-in)
    if (Date.now() > GlobalApiState.pollinationsProBannedUntil) {
        let retries = 0;
        while (retries < 3) {
            try {
                if (retries === 0) GlobalApiState.notify("Đang dùng Pollinations Image (Proxy SK_KEY)...");
                else GlobalApiState.notify(`Thử lại kết nối ảnh Proxy (Lần ${retries}/2)...`);
                
                return await tryFetchImage(PROXY_URL, false, "Polli Image (Proxy SK_KEY)");
            } catch (e: any) {
                if (e.message.includes("429_LIMIT") && retries < 2) {
                    retries++;
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                
                if (e.message.includes("429_LIMIT")) {
                    GlobalApiState.pollinationsProBannedUntil = getNextHourTimestamp();
                    GlobalApiState.notify("Proxy hết phấn hoa hình ảnh! Chuyển qua API Free...");
                } else {
                    console.warn("Pollinations Proxy Image Error:", e);
                    GlobalApiState.notify("Lỗi kết nối ảnh Proxy! Chuyển qua API Free...");
                    GlobalApiState.pollinationsProBannedUntil = Date.now() + 3 * 60 * 1000;
                }
                break;
            }
        }
    } 

    // Tier 3: Free API URL (No Key)
    try {
        if (Date.now() <= GlobalApiState.pollinationsProBannedUntil && Date.now() <= GlobalApiState.pollinationsCustomKeyBannedUntil) {
            GlobalApiState.notify("Sử dụng Pollinations Image Free API (No Key)...");
        }
        return await tryFetchImage(FREE_URL, false, "Polli Image (Free API)");
    } catch (e: any) {
        console.warn("Lỗi tải ảnh qua tất cả API:", e);
        GlobalApiState.setCurrentApi("Lỗi Render Ảnh ❌");
        GlobalApiState.notify("Tất cả API ảnh đều quá tải hoặc lỗi!");
        throw e;
    }
}

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
    const modelStr = config.geminiModel || "gemini-2.5-flash";

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

    if (response.text) return response.text.trim();
    return "Alt text generation failed.";
};
