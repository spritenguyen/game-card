import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Icon } from '../components/ui/Icon';
import { device } from "../lib/device";
const isMobileEnv = device.isMobile;
import { createPortal } from "react-dom";
import { Card, Boss, AppConfig } from "../types";
import {
  getFactionInfo,
  getComboStats,
  getEnemySpeed,
  getSquadDodgeRate,
  calculateCombatStats,
  calculateUltimateStats,
  getElementAdvantage,
  getCardRole,
} from "../lib/gameLogic";
import { generateBossFromAI, generateImageFromAi, generateDialogueFromAI } from "../services/ai";
import { ELEMENTS } from "../lib/constants";
import { BATTLEFIELD_SQUADS } from "../data/battlefieldSquads";
import { getSkillEffects } from "../lib/skills";
import { CombatLogPanel } from "../components/combat/CombatLogPanel";
import { CombatHeader } from "../components/combat/CombatHeader";
import { CombatControls } from "../components/combat/CombatControls";
import { CombatArena } from "../components/combat/CombatArena";
import { SquadSlot } from "../components/combat/SquadSlot";
import { EnemySlot } from "../components/combat/EnemySlot";
import { motion, AnimatePresence } from "motion/react";
import {
  initAudio,
  playHitSound,
  playSkillSound,
  playGlassBreakSound,
  startCombatBgm,
  stopCombatBgm,
  playUltimateSound,
  playVictorySound,
  playDefeatSound,
} from "../lib/audio";

interface DamagePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  isCrit: boolean;
  target: string;
  dmgType?: string;
  colorClass?: string;
  isHeal?: boolean;
}

interface Props {
  cards: Card[];
  setSquad: (sq: (Card | null)[]) => void;
  config: AppConfig;
  currency: number;
  level: number;
  modifyCurrency: (amount: number) => void;
  modifyInventory: (
    baseDiff: number,
    eliteDiff: number,
    mats?: Record<string, number>,
  ) => void;
  gainExperience: (amount: number) => void;
  squad: (Card | null)[];
  leaderId: string | null;
  setLeaderId: (id: string | null) => void;
  eliteEnemySquad: (Boss | null)[];
  setEliteEnemySquad: (b: (Boss | null)[]) => void;
  battlefieldEnemySquad: (Boss | null)[];
  setBattlefieldEnemySquad: (b: (Boss | null)[]) => void;
  onOpenSquadSelector: (slot: number) => void;
  onClearSquadSlot: (slot: number) => void;
  onError: (msg: string) => void;
  onAlert: (t: string, m: string) => void;
  onConfirm: (m: string, cb: () => void) => void;
  updateQuestProgress: (type: string, amount?: number) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
  onBattleStatusChange?: (inBattle: boolean) => void;
}

let globalCombatSpeed = 1;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms / globalCombatSpeed));

export const CombatView: React.FC<Props> = ({
  cards,
  setSquad,
  config,
  currency,
  level,
  modifyCurrency,
  modifyInventory,
  gainExperience,
  squad,
  leaderId,
  setLeaderId,
  eliteEnemySquad,
  setEliteEnemySquad,
  battlefieldEnemySquad,
  setBattlefieldEnemySquad,
  onOpenSquadSelector,
  onClearSquadSlot,
  onError,
  onAlert,
  onConfirm,
  updateQuestProgress,
  isGlobalProcessing,
  setGlobalProcessing,
  onBattleStatusChange,
}) => {
  const [opTab, setOpTab] = useState<"battlefield" | "single_boss" | "world_boss">("single_boss");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isLiteMode, setIsLiteMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("liteCombatMode");
      if (saved !== null) return saved === "true";
      return isMobileEnv;
    }
    return false;
  });

  const toggleLiteMode = () => {
    const newVal = !isLiteMode;
    setIsLiteMode(newVal);
    localStorage.setItem("liteCombatMode", String(newVal));
    window.dispatchEvent(new Event("litemode-toggled"));
  };

  const [localWorldBossSquad, setLocalWorldBossSquad] = useState<(Boss | null)[]>([null, null, null, null, null, null]);

  const [activeAttackVector, setActiveAttackVector] = useState<{ x: number, y: number } | null>(null);
  const squadRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null]);
  const enemyRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null]);

  // Derived squad based on active tab
  const enemySquad = opTab === "world_boss" 
    ? localWorldBossSquad 
    : opTab === "battlefield" 
      ? battlefieldEnemySquad 
      : eliteEnemySquad;

  const setEnemySquad = useCallback((newSquad: (Boss | null)[]) => {
    if (opTab === "world_boss") setLocalWorldBossSquad(newSquad);
    else if (opTab === "battlefield") setBattlefieldEnemySquad(newSquad);
    else setEliteEnemySquad(newSquad);
  }, [opTab, setLocalWorldBossSquad, setBattlefieldEnemySquad, setEliteEnemySquad]);

  const boss = enemySquad.find(e => e !== null) || null;
  const hasSSR = cards.some(c => c.cardClass === 'SSR' || c.cardClass === 'UR');
  const hasUR = cards.some(c => c.cardClass === 'UR');

  const [worldBossState, setWorldBossState] = useState<any>(() => {
    const saved = localStorage.getItem("cineWorldBoss");
    if (saved) {
      const parsed = JSON.parse(saved);
      const todayStr = new Date().toISOString().split("T")[0];
      if (parsed.lastAttemptDate !== todayStr) {
        parsed.attemptsToday = 0;
        parsed.lastAttemptDate = todayStr;
      }
      return parsed;
    }
    return { boss: null, lastAttemptDate: new Date().toISOString().split("T")[0], attemptsToday: 0, level: 1 };
  });

  const [timeUntilReset, setTimeUntilReset] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const utcTimestamp = now.getTime();
      const timezoneOffset = 7 * 60 * 60 * 1000; // 7 hours in ms
      
      // Calculate current time in UTC+7 (Vietnam Time)
      // We use the timestamp + offset directly to find the date string
      const vntTime = new Date(utcTimestamp + timezoneOffset);
      const vntTodayStr = vntTime.toISOString().split("T")[0];
      
      // Real-time reset if day changes in UTC+7
      setWorldBossState((prev: any) => {
        if (prev.lastAttemptDate !== vntTodayStr) {
          return { ...prev, attemptsToday: 0, lastAttemptDate: vntTodayStr };
        }
        return prev;
      });

      // Calculate time until next midnight in UTC+7
      const dayMs = 24 * 60 * 60 * 1000;
      const nextVntMidnightTimestamp = Math.ceil((utcTimestamp + timezoneOffset) / dayMs) * dayMs;
      const diff = nextVntMidnightTimestamp - (utcTimestamp + timezoneOffset);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilReset(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("cineWorldBoss", JSON.stringify(worldBossState));
  }, [worldBossState]);

  useEffect(() => {
    if (opTab === "world_boss") {
      if (worldBossState.boss) {
        setEnemySquad([worldBossState.boss, null, null, null, null, null]);
      } else {
        const gen = async () => {
          setGlobalProcessing(true);
          try {
            const hp = Math.floor(50000 * Math.pow(1.5, worldBossState.level - 1));
            const atk = Math.floor(500 * Math.pow(1.2, worldBossState.level - 1));
            const def = Math.floor(250 * Math.pow(1.15, worldBossState.level - 1));
            const res = Math.floor(100 * Math.pow(1.15, worldBossState.level - 1));
            const bossData = await generateBossFromAI(hp, atk, "nightmare", config);
            bossData.hp = hp;
            bossData.attack = atk;
            bossData.defense = def;
            bossData.resist = res;
            bossData.name = "WORLD THREAT: " + bossData.name;
            bossData.reward = 0;
            bossData.threatLevel = "Nightmare";
            try {
              const dummyCard = { 
                gender: "Unknown", 
                universe: bossData.universe, 
                faction: bossData.faction, 
                hp: bossData.hp,
                attack: bossData.attack,
                threatLevel: "Nightmare",
                visualDescription: `Gigantic colossal world boss. ${bossData.visualDescription}` 
              };
              const bossImg = await generateImageFromAi(dummyCard, config);
              bossData.imageUrl = bossImg;
            } catch (e) {}
            setWorldBossState((p: any) => ({ ...p, boss: bossData }));
            setLocalWorldBossSquad([bossData, null, null, null, null, null]);
          } catch {
             // Let user retry
          } finally {
            setGlobalProcessing(false);
          }
        };
        gen();
      }
    }
  }, [opTab, worldBossState.boss, worldBossState.level, config, setGlobalProcessing, setEnemySquad]);

  const [inBattle, _setInBattle] = useState(false);
  const [combatSpeed, setCombatSpeed] = useState<number>(1);
  const [combatResult, setCombatResult] = useState<{
    status: "victory" | "defeat" | "draw";
    title: string;
    rating: string;
    turns: number;
    exp: number;
    rewards: { label: string; value: string | number; colorClass?: string }[];
    message: string;
  } | null>(null);

  useEffect(() => {
    if (combatResult) {
      if (combatResult.status === "victory") {
        playVictorySound();
      } else if (combatResult.status === "defeat" || combatResult.status === "draw") {
        playDefeatSound();
      }
    }
  }, [combatResult]);

  const setInBattle = (v: boolean) => {
    _setInBattle(v);
    if (onBattleStatusChange) onBattleStatusChange(v);
  };
  const [logs, _setLogs] = useState<React.ReactNode[]>([
    <div key="init" className="text-cyan-600/50">
      Hệ thống Tác chiến Tương Sinh Tương Khắc đã sẵn sàng...
    </div>,
  ]);
  const setLogs = (updater: any) => {
    _setLogs((prev) => {
      const res = typeof updater === "function" ? updater(prev) : updater;
      if (Array.isArray(res) && res.length > 50) return res.slice(res.length - 50);
      return res;
    });
  };
      const [displayBossHp, setDisplayBossHp] = useState(0);
  const [displayEnemyHps, setDisplayEnemyHps] = useState<number[]>([0,0,0,0,0,0]);
  const [displayEnemyManas, setDisplayEnemyManas] = useState<number[]>([0,0,0,0,0,0]);
  const [displaySquadHp, setDisplaySquadHp] = useState(0);
  const [displayCardHps, setDisplayCardHps] = useState<number[]>([0,0,0,0,0,0]);
  const [displayShields, setDisplayShields] = useState<number[]>([0,0,0,0,0,0]);
  const [displayCardManas, setDisplayCardManas] = useState<number[]>([0,0,0,0,0,0]);
  const [displayCardMaxManas, setDisplayCardMaxManas] = useState<number[]>([100,100,100,100,100,100]);
  const [displaySquadATB, setDisplaySquadATB] = useState<number[]>([0,0,0,0,0,0]);
  const [displayEnemyATB, setDisplayEnemyATB] = useState<number[]>([0,0,0,0,0,0]);
  const [displayEnemyStatuses, setDisplayEnemyStatuses] = useState<{ type: string; turnsLeft: number }[][]>(
    [[], [], [], [], [], []]
  );
  const [displaySquadStatuses, setDisplaySquadStatuses] = useState<{ type: string; turnsLeft: number }[][]>(
    [[], [], [], [], [], []]
  );
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
      const [activeAttackerIdx, setActiveAttackerIdx] = useState<number | null>(
    null,
  );
  const [isBossAttacking, setIsBossAttacking] = useState(false);
  const [activeCutInCard, setActiveCutInCard] = useState<Card | null>(null);
  const [activeCutInQuote, setActiveCutInQuote] = useState<string | null>(null);
  
  // Pre-fetch ultimate quotes to save time
  const [ultimateQuotes] = useState(() => new Map<string, string>());

  useEffect(() => {
     squad.forEach(card => {
         if (card && card.ultimateMove && !ultimateQuotes.has(card.id)) {
             // mark as pending
             ultimateQuotes.set(card.id, "Đang khởi động tuyệt kỹ...");
             generateDialogueFromAI({
                 name: card.name,
                 faction: card.faction,
                 personality: card.personality,
                 visualDescription: card.visualDescription
             }, `Đang thi triển tuyệt kỹ Tối Hậu: ${card.ultimateMove}. Hô vang khẩu hiệu, dồn toàn lực, cực kì mạnh mẽ và nguy hiểm`, config).then(res => {
                 ultimateQuotes.set(card.id, res);
             }).catch(() => {
                 ultimateQuotes.set(card.id, "Hủy diệt tất cả!");
             });
         }
     });

     enemySquad.forEach((enemy, idx) => {
         if (enemy && !ultimateQuotes.has(`enemy_${idx}`)) {
             ultimateQuotes.set(`enemy_${idx}`, "Cuồng nộ giáng lâm...");
             generateDialogueFromAI({
                 name: enemy.name,
                 faction: enemy.faction,
                 personality: "Tàn bạo, khát máu, quái vật hùng mạnh",
                 visualDescription: enemy.imageUrl
             }, `Đang chuẩn bị dùng đòn sát thủ (Ultimate) lên người chơi. Một câu đe dọa ngắn gọn gọn, nham hiểm hoặc cuồng nộ`, config).then(res => {
                 ultimateQuotes.set(`enemy_${idx}`, res);
             }).catch(() => {
                 ultimateQuotes.set(`enemy_${idx}`, "Chuẩn bị nhận lấy cái chết!");
             });
         }
     });
  }, [squad, enemySquad, config, ultimateQuotes]);

  useEffect(() => {
    globalCombatSpeed = combatSpeed;
  }, [combatSpeed]);


  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1280);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [hitStop, setHitStop] = useState(false);
  const [glassBreak, setGlassBreak] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  const triggerScreenShake = () => {
    setScreenShake(false);
    setTimeout(() => {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 200);
    }, 0);
  };

  const [showFullPassive, setShowFullPassive] = useState(false);

  const {
    squadHp,
    cardMaxHp,
    squadAtk,
    squadDef,
    squadRes,
    activeSynergies,
    synergyBonusAtk,
    dodgeRate,
    hasLeader
  } = useMemo(() => {
    let stats = getComboStats(squad);
    let hp = stats.hp;
    let atk = stats.atk;
    let cMaxHp = stats.cardMaxHp;
    const isLeaderActive = squad.some((c) => c && c.id === leaderId);
    if (isLeaderActive) {
      hp = Math.floor(hp * 1.15);
      atk = Math.floor(atk * 1.15);
      cMaxHp = cMaxHp.map(h => Math.floor(h * 1.15));
    }
    return {
      squadHp: hp,
      cardMaxHp: cMaxHp,
      squadAtk: atk,
      squadDef: stats.def,
      squadRes: stats.res,
      activeSynergies: stats.activeSynergies,
      synergyBonusAtk: stats.synergyBonusAtk,
      dodgeRate: getSquadDodgeRate(squad),
      hasLeader: isLeaderActive
    }
  }, [squad, leaderId]);

  const bossMaxHp = useRef(0);
  const squadMaxHp = useRef(0);
  const tacticalQueue = useRef<string[]>([]);

  const getTacticalLimit = () => {
    if (level >= 30) return 5;
    if (level >= 15) return 4;
    return 3;
  };

  const [strikeUses, setStrikeUses] = useState(0);
  const [healUses, setHealUses] = useState(0);

  const handleTacticalCommand = (cmd: "strike" | "heal") => {
    if (!inBattle) return;

    const limit = getTacticalLimit();
    if (cmd === "strike" && strikeUses >= limit) {
      onAlert(
        "Từ chối!",
        `Đã hết lượt sử dụng Orbital Strike (Giới hạn: ${limit}). Nâng cấp Cấp độ người chơi để tăng giới hạn.`,
      );
      return;
    }
    if (cmd === "heal" && healUses >= limit) {
      onAlert(
        "Từ chối!",
        `Đã hết lượt sử dụng Emergency Repair (Giới hạn: ${limit}). Nâng cấp Cấp độ người chơi để tăng giới hạn.`,
      );
      return;
    }

    const cost = cmd === "strike" ? 100 : 50;
    if (currency < cost) {
      onAlert("Từ chối!", `Không đủ DC để yêu cầu Cứu viện (Cần ${cost} DC).`);
      return;
    }

    if (cmd === "strike") setStrikeUses((prev) => prev + 1);
    if (cmd === "heal") setHealUses((prev) => prev + 1);

    modifyCurrency(-cost);
    tacticalQueue.current.push(cmd);
  };

  useEffect(() => {
    if (!inBattle) {
      if (boss) {
        setDisplayBossHp(boss.hp);
        bossMaxHp.current = boss.hp;
      }
      setDisplayEnemyHps(enemySquad.map(e => e ? e.hp : 0));
    }
  }, [enemySquad, boss, inBattle]);

  useEffect(() => {
    if (!inBattle) {
      setDisplaySquadHp(squadHp);
      squadMaxHp.current = squadHp;
      setDisplayCardHps(cardMaxHp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadHp, inBattle, JSON.stringify(cardMaxHp)]);

  // Removed logContainerRef logic

  const handleScan = async (difficulty: "normal" | "elite" | "nightmare") => {
    const cost =
      difficulty === "normal" ? 50 : difficulty === "elite" ? 100 : 200;
    if (currency < cost)
      return onAlert("Hệ Thống", `Cần ${cost} DC để quét khu vực này.`);
    if (squadHp === 0) {
      onConfirm(
        "Bạn chưa có đội hình nào trên tiền tuyến. Vẫn tiếp tục quét?",
        () => performScan(800, 200, difficulty, cost),
      );
    } else {
      performScan(squadHp, squadAtk, difficulty, cost);
    }
  };

  const performScan = async (
    sHp: number,
    sAtk: number,
    difficulty: "normal" | "elite" | "nightmare",
    cost: number,
  ) => {
    if (currency < cost) {
        return onAlert("Hệ Thống", `Không đủ Data Credits (Cần ${cost} DC).`);
    }
    
    modifyCurrency(-cost);
    setGlobalProcessing(true);
    try {
      const bossData = await generateBossFromAI(sHp, sAtk, difficulty, config);
      if (
        !["CyberCore", "Ethereal", "VoidBringer", "MechaMutant", "AstroNomad", "ArcaneWeaver"].includes(bossData.faction)
      ) {
        // Fallback or random picking logic if AI goes rogue
        const fallbacks = ["CyberCore", "Ethereal", "VoidBringer", "MechaMutant", "AstroNomad", "ArcaneWeaver"];
        bossData.faction =
          fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      const facInfo = getFactionInfo(bossData.faction);
      setLogs((prev) => [...prev, <div
          key={Date.now()}
          className="text-cyan-600/50 mb-2 border-b border-white/10 pb-2"
        >
          Radar phát hiện: <strong>{bossData.name}</strong> (Hệ:{" "}
          <span className={facInfo.color}>
            <Icon name={facInfo.icon} /> {facInfo.name}
          </span>
          ).
        </div>,
      ].slice(-40));

      const isSingleTarget = opTab === "single_boss";
      if (isSingleTarget) {
        bossData.hp = Math.floor(bossData.hp * 1.5);
        bossData.attack = Math.floor(bossData.attack * 1.2);
        bossData.reward = Math.floor((bossData.reward || 0) * 1.5);
      }

      // Generate enemies: guarantee at least some VANGUARD units for non-single targets
      const numEnemies = isSingleTarget ? 1 : Math.max(3, Math.floor(Math.random() * 6) + 1);
      let availableIndices = [0, 1, 2, 3, 4, 5];
      for (let i = availableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
      }
      
      const selectedIndices = availableIndices.slice(0, numEnemies);
      // Ensure at least two vanguard if possible
      if (!isSingleTarget) {
        if (!selectedIndices.includes(0)) selectedIndices[1] = 0;
        if (!selectedIndices.includes(1)) selectedIndices[2] = 1;
      }

      const newSquad: (Boss | null)[] = [null, null, null, null, null, null];
      selectedIndices.forEach((idx, i) => {
         if (i === 0) {
            newSquad[idx] = {
               ...bossData,
               name: idx < 3 ? `[VANGUARD] ${bossData.name}` : bossData.name
            };
         } else {
            const isVanguard = idx < 3;
            newSquad[idx] = {
               ...bossData,
               id: `${bossData.id || Date.now()}-minion-${idx}`,
               name: isVanguard ? `[VANGUARD] ${bossData.name.split(' ')[0]} Minion` : `${bossData.name.split(' ')[0]} Minion`,
               threatLevel: "Minion",
               hp: Math.max(1, Math.floor(bossData.hp * 0.3)),
               attack: Math.max(1, Math.floor(bossData.attack * 0.3)),
               reward: Math.max(1, Math.floor((bossData.reward || 0) * 0.1)),
            };
         }
      });
      setEnemySquad(newSquad);

      try {
        const dummyCard = {
          gender: "Unknown",
          universe: bossData.universe,
          faction: bossData.faction,
          hp: bossData.hp,
          attack: bossData.attack,
          threatLevel: bossData.threatLevel,
          visualDescription: `Epic boss monster. ${bossData.visualDescription}`,
        };
        const bossImg = await generateImageFromAi(dummyCard, config);
        
        const updatedSquad = [...newSquad];
        for (let i = 0; i < 6; i++) {
           if (updatedSquad[i]) {
              updatedSquad[i] = { ...updatedSquad[i]!, imageUrl: bossImg };
           }
        }
        setEnemySquad(updatedSquad);
      } catch (e) {}
    } catch (e: any) {
      modifyCurrency(cost);
      if (e.message === "API_KEY_INVALID")
        onAlert("Lỗi", "Lỗi: API Key cá nhân không hợp lệ.");
      else onError("Lỗi Radar. Đã hoàn tiền.");
    } finally {
      setGlobalProcessing(false);
    }
  };

  const cancelBoss = () => {
    if (inBattle)
      return onError("Không thể rút lui khi đang trong trạng thái giao tranh!");
    onConfirm("Bỏ qua mục tiêu này? Bạn sẽ cần tốn thêm DC để quét lại.", () =>
      setEnemySquad([null, null, null, null, null, null]),
    );
  };

  const triggerShake = (target: "squad" | "boss") => {
    const el = document.getElementById(target === "boss" ? "enemyGridContainer" : "squadGridContainer");
    if (el) {
      el.classList.remove("combat-shake", "bg-red-500/10", "bg-white/5", "brightness-150");
      void el.offsetWidth; // Trigger reflow to restart animation
      el.classList.add("combat-shake");
      if (target === "boss") {
        el.classList.add("bg-red-500/10");
        setTimeout(() => {
          el.classList.remove("bg-red-500/10");
        }, 300);
      } else {
        el.classList.add("bg-white/5", "brightness-150");
        setTimeout(() => {
          el.classList.remove("bg-white/5", "brightness-150");
        }, 300);
      }
    }
  };

  const triggerHitStop = async () => {
    setHitStop(true);
    await delay(120);
    setHitStop(false);
  };

  const addDamagePopup = (
    value: number,
    target: string,
    isCrit: boolean,
    dmgType?: string,
    colorClass?: string,
    yOffset: number = 0,
    isHeal: boolean = false
  ) => {
    if (!isHeal) playHitSound(isCrit);
    const targetKey =
      typeof target === "string" && target.startsWith("squad_")
        ? target
        : target === "squad"
          ? "_squad"
          : "_boss";
    const id = Date.now() + Math.random() + targetKey;
    // Randomized position around target area
    const x =
      target === "boss" ? Math.random() * 60 - 30 : Math.random() * 80 - 40;
    const y = (target === "boss" ? -50 : -40) + yOffset;
    setDamagePopups((prev) => {
      const next = [
        ...prev,
        {
          id: parseFloat(id.toString().split("_")[0]),
          value,
          x,
          y,
          isCrit,
          target,
          dmgType,
          colorClass,
          isHeal,
        },
      ];
      const maxPopups = isMobileEnv ? 10 : 25;
      return next.length > maxPopups ? next.slice(-maxPopups) : next;
    });
    setTimeout(() => {
      setDamagePopups((prev) =>
        prev.filter((p) => p.id !== parseFloat(id.toString().split("_")[0])),
      );
    }, 1200);
  };

  const handleAutoSetup = () => {
    if (!boss) {
      onAlert("Từ chối!", "Vui lòng Scan mục tiêu (Boss) trước khi thiết lập đội hình thông minh.");
      return;
    }
    if (cards.length === 0) {
      onAlert("Cảnh báo!", "Kho thẻ trống.");
      return;
    }

    setGlobalProcessing(true);
    setLogs((prev) => [
      ...prev,
      <span key={Date.now()} className="text-cinematic-cyan font-mono text-[10px]">
        [AI] Đang phân tích chỉ số đa chiều...<br />
        &gt; Tham chiếu mục tiêu: {boss.faction} - {boss.element}<br />
        &gt; Nội suy Vanguard (Tiền Tuyến) & DPS/Support (Hậu Tuyến)...
      </span>
    ]);

    setTimeout(() => {
      const evaluatedCards = cards.map(c => {
         const stats = calculateCombatStats(c);
         let tankMetrics = stats.hp * 2.5 + stats.atk * 0.5;
         let dpsMetrics = stats.atk * 3.0 + stats.hp * 0.2;
         let supportMetrics = stats.atk * 1.5 + stats.hp * 1.5; // Supports usually heal based on generic stats or stay alive
         
         if (boss.element !== "Neutral" && c.element !== "Neutral") {
           const adv = getElementAdvantage(c.element, boss.element);
           if (adv > 1) {
              tankMetrics *= 1.5; dpsMetrics *= 1.5; supportMetrics *= 1.5;
           } else if (adv < 1) {
              tankMetrics *= 0.5; dpsMetrics *= 0.5; supportMetrics *= 0.5;
           }
         }
         
         // Rank multipliers
         const ranks = ['N', 'R', 'SR', 'SSR', 'UR'];
         const rankBonus = (ranks.indexOf(c.cardClass) + 1) * 0.25;
         tankMetrics *= (1 + rankBonus);
         dpsMetrics *= (1 + rankBonus);
         supportMetrics *= (1 + rankBonus);

         // Role specifics
         const role = getCardRole(c);
         if (role === 'Vanguard') {
            tankMetrics *= 2.5; 
            dpsMetrics *= 0.5;
         } else if (role === 'Striker') {
            dpsMetrics *= 2.5;
            tankMetrics *= 0.5;
         } else if (role === 'Weaver' || role === 'Support') {
            supportMetrics *= 3.0;
            tankMetrics *= 1.2; // supports need some survivability
         }

         return { card: c, tankMetrics, dpsMetrics, supportMetrics, role };
      });

      const newSquad: (Card | null)[] = [null, null, null, null, null, null];
      let available = [...evaluatedCards];
      
      // Auto-assign Frontline (Index 0,1,2): Maximize Tank Metrics
      for(let i = 0; i < 3; i++) {
         if (available.length === 0) break;
         available.sort((a, b) => b.tankMetrics - a.tankMetrics);
         newSquad[i] = available[0].card;
         available.splice(0, 1);
      }

      // Auto-assign Backline (Index 3,4,5): Maximize DPS & ensure at least 1 Support if available
      for(let i = 3; i < 6; i++) {
         if (available.length === 0) break;
         
         const currentSupportCount = newSquad.filter(c => c && (getCardRole(c) === 'Weaver' || getCardRole(c) === 'Support')).length;
         
         if (currentSupportCount === 0 && i === 4 && available.some(x => x.role === 'Weaver' || x.role === 'Support')) {
             // Force a support at slot 4 (middle backline) if none selected yet
             available.sort((a,b) => b.supportMetrics - a.supportMetrics);
             const supIdx = available.findIndex(x => x.role === 'Weaver' || x.role === 'Support');
             if (supIdx !== -1) {
                 newSquad[i] = available[supIdx].card;
                 available.splice(supIdx, 1);
                 continue;
             }
         }
         
         // Otherwise, maximize DPS
         available.sort((a, b) => b.dpsMetrics - a.dpsMetrics);
         newSquad[i] = available[0].card;
         available.splice(0, 1);
      }

      setSquad(newSquad);
      if (newSquad[0]) setLeaderId(newSquad[0].id);
      setGlobalProcessing(false);
      setLogs((prev) => [
        ...prev,
        <span key={`success-${Date.now()}`} className="text-green-400 font-mono text-[10px]">
          [AI] Thiết lập hoàn tất! Thuật toán phân lớp vai trò (Tank/DPS/Support) đã áp dụng thành công.
        </span>
      ]);
      onAlert("AI Auto Deploy", "Hệ thống AI đã phân tích chi tiết chỉ số ATK, HP, Vai trò (Role) và Khắc chế nguyên tố để thiết lập đội hình tối ưu nhất!");
    }, 1200);
  };

  const handleExecuteBattlefieldSquad = async (squadIndex: number) => {
    const configData = BATTLEFIELD_SQUADS[squadIndex];
    if (!configData) return;
    
    if (currency < configData.cost) {
      return onAlert("Hệ Thống", `Cần ${configData.cost} DC để thách đấu đội hình này.`);
    }
    if (squadHp === 0) {
      return onAlert("Hệ Thống", "Cần triển khai đội hình trước khi ra trận!");
    }
    
    modifyCurrency(-configData.cost);
    setGlobalProcessing(true);
    
    try {
      // Clone the squad
      const newSquad: (Boss | null)[] = configData.squad.map(e => e ? { ...e } : null);
      setEnemySquad(newSquad);
      
      // Request images concurrently for all enemies in the new squad
      const imagePromises = newSquad.map(async (enemy, i) => {
        if (!enemy) return null;
        try {
          const dummyCard = {
            gender: "Unknown",
            universe: enemy.universe,
            faction: enemy.faction,
            element: enemy.element,
            hp: enemy.hp,
            attack: enemy.attack,
            threatLevel: enemy.threatLevel,
            visualDescription: enemy.visualDescription,
          };
          const imgUrl = await generateImageFromAi(dummyCard, config);
          return { index: i, imgUrl };
        } catch (e) {
          return null;
        }
      });
      
      const results = await Promise.all(imagePromises);
      
      const updatedSquad = [...newSquad];
      results.forEach(res => {
         if (res && updatedSquad[res.index]) {
             updatedSquad[res.index] = { ...updatedSquad[res.index]!, imageUrl: res.imgUrl };
         }
      });
      
      setEnemySquad(updatedSquad);
      
      setLogs((prev) => [...prev, <div key={Date.now()} className="text-purple-400/80 mb-2 border-b border-purple-900/30 pb-2">
          Battlefield: <strong>{configData.name}</strong> xuất hiện!
        </div>,
      ].slice(-40));
    } catch (e) {
       console.error("AI Squad Gen Error:", e);
       onAlert("Lỗi AI", "Có lỗi xảy ra khi gọi đội hình. Vui lòng thử lại.");
    } finally {
       setGlobalProcessing(false);
    }
  };

  const executeBattle = async () => {
    if (inBattle || !boss) return;

    const addLog = (msg: string | React.ReactNode, colorClass: string) => {
      setLogs((prev) => [...prev, <div key={Math.random()} className={`${colorClass} mb-1.5 animate-fade-in`}>{msg}</div>,
      ].slice(-40));
    };

    initAudio();
    startCombatBgm();
    setInBattle(true);
    setGlobalProcessing(true);

    // PRE-INCREMENT WORLD BOSS ATTEMPT
    if (opTab === "world_boss") {
      setWorldBossState((p: any) => ({ ...p, attemptsToday: p.attemptsToday + 1 }));
      addLog(`CẢNH BÁO: Đã tiêu tốn 1 lượt khiêu chiến.`, "text-yellow-500 text-[10px] italic");
    }
    setStrikeUses(0);
    setHealUses(0);
    setDisplayEnemyStatuses([[],[],[],[],[],[]]);
    setDisplaySquadStatuses([[],[],[],[],[],[]]);

        let currentEnemyHps = enemySquad.map(e => e ? e.hp : 0);
    let currentSquadHp = squadHp;
    let currentCardHps = [...cardMaxHp];

    let targetInitialManas = [0,0,0,0,0,0];
    let targetMaxManas = [100,100,100,100,100,100];
    squad.forEach((c, i) => {
       if (c) {
          let maxM = 100;
          let initM = 0;
          
          if (c.cardClass === 'UR') { maxM = 120; initM = 50; }
          else if (c.cardClass === 'SSR') { maxM = 100; initM = 40; }
          else if (c.cardClass === 'SR') { maxM = 80; initM = 30; }
          else if (c.cardClass === 'R') { maxM = 80; initM = 20; }
          else { maxM = 60; initM = 10; }
          
          const role = getCardRole(c);
          if (role === 'Weaver' || role === 'Support') { maxM -= 20; initM += 20; }
          else if (role === 'Striker') { maxM += 20; }
          
          initM += Math.floor((c.level || 1) / 5);
          
          targetMaxManas[i] = maxM;
          targetInitialManas[i] = Math.min(initM, maxM);
       }
    });

    let currentCardManas = [...targetInitialManas];
    setDisplayCardMaxManas(targetMaxManas);
    setDisplayCardManas([...currentCardManas]);

    let currentEnemyManas = [0,0,0,0,0,0];
    setDisplayEnemyManas([...currentEnemyManas]);

    addLog(
      `>>> CHIẾN DỊCH BẮT ĐẦU <<<`,
      "text-red-500 mb-2 border-b border-red-900/50 pb-1 mt-4 text-xs font-bold",
    );

    let actualSquadAtk = 0;
    let activeCardsCount = 0;

    let leaderBuffMod = 1.0;
    let leaderHpBuffMod = 1.0;
    const leaderCard = squad.find((c) => c && c.id === leaderId);
    if (leaderCard) {
      leaderBuffMod = 1.15;
      leaderHpBuffMod = 1.15;
      addLog(
        <span className="flex items-center gap-2">
          <Icon name="fa-crown text-cinematic-gold" className="fa-crown text-cinematic-gold" /> CHỈ HUY [{leaderCard.name}]: Kích hoạt Leader Core! Toàn đội tăng 15% Sinh Lực & Tấn Công.
        </span>,
        "text-cinematic-gold font-bold bg-cinematic-gold/10 border border-cinematic-gold/20 px-2 py-1.5 rounded text-[11px] mb-2",
      );
      setDisplayCardHps([...currentCardHps]);
      setDisplaySquadHp(currentSquadHp);
      squadMaxHp.current = currentSquadHp;
    }

    let cardAtks: number[] = [0, 0, 0, 0, 0, 0];

    squad.forEach((card, i) => {
      if (!card) return;
      activeCardsCount++;
      let { atk } = calculateCombatStats(card);
      let roleAtkMod = i >= 3 ? 1.2 : 1.0;
      atk = Math.floor(atk * roleAtkMod);
      
      let finalCardAtk = Math.floor(atk * leaderBuffMod);
      if (synergyBonusAtk > 0) finalCardAtk = Math.floor(finalCardAtk * (1 + synergyBonusAtk));
      cardAtks[i] = finalCardAtk;
      actualSquadAtk += finalCardAtk;
    });

    if (synergyBonusAtk > 0) {
      addLog(
        <span>Buff Cộng Hưởng: Sát thương tăng thêm <span className="text-cinematic-cyan">+{(synergyBonusAtk * 100).toFixed(0)}%</span></span>,
        "text-cinematic-cyan font-bold mb-1",
      );
    }

    let turn = 1;

    let squadATB = [0,0,0,0,0,0];
    let enemyATB = [0,0,0,0,0,0];
    let sqSpeeds = [0,0,0,0,0,0];
    let enSpeeds = [0,0,0,0,0,0];

    squad.forEach((c, i) => { if (c) sqSpeeds[i] = Math.max(1, calculateCombatStats(c).speed || 100); });
    enemySquad.forEach((e, i) => { if (e) enSpeeds[i] = Math.max(1, e?.speed || getEnemySpeed(e)); });

    let totalActions = 0;
    const MAX_ACTIONS = 60;

    let enemyStatuses: { type: string, turnsLeft: number }[][] = [[],[],[],[],[],[]];
    let squadStatuses: { type: string, turnsLeft: number }[][] = [[],[],[],[],[],[]];
    let squadShields: number[] = [0, 0, 0, 0, 0, 0];
    setDisplayShields([...squadShields]);

    tacticalQueue.current = [];

    const getTotalEnemyHp = () => currentEnemyHps.reduce((a,b) => a+b, 0);

    while (currentSquadHp > 0 && getTotalEnemyHp() > 0 && totalActions < MAX_ACTIONS) {
      await delay(100);

      // Process Tactical Overrides
      while (tacticalQueue.current.length > 0) {
        const action = tacticalQueue.current.shift();
        if (action === "strike") {
          playSkillSound();
          currentEnemyHps = currentEnemyHps.map((hp, i) => {
              if (hp <= 0) return 0;
              const maxHp = enemySquad[i]!.hp;
              const dmg = Math.floor(maxHp * 0.2);
              addDamagePopup(dmg, `enemy-${i}` as any, false, "Tech", "text-yellow-400", 0);
              return Math.max(0, hp - dmg);
          });
          setDisplayEnemyHps([...currentEnemyHps]);
          triggerShake("boss");
          addLog(
            <span>🚀 <strong>CAN THIỆP CHIẾN THUẬT: ORBITAL STRIKE!</strong> Giáng xuống AoE -20% HP mục tiêu!</span>,
            "text-yellow-400 text-xs bg-yellow-900/40 px-2 py-1 rounded border-l-2 border-yellow-500 my-1 font-serif"
          );
          await delay(600);
        } else if (action === "heal") {
          playSkillSound();
          let globalHealAmt = 0;
          currentCardHps = currentCardHps.map((hp, idx) => {
             if (squad[idx] && hp > 0) {
                const add = Math.floor(cardMaxHp[idx] * 0.3);
                globalHealAmt += add;
                addDamagePopup(add, `squad_${idx}`, false, undefined, "text-green-400", 0, true);
                return Math.min(cardMaxHp[idx], hp + add);
             }
             return hp;
          });
          currentSquadHp = currentCardHps.reduce((acc, val) => acc + val, 0);
          setDisplayCardHps([...currentCardHps]);
          setDisplaySquadHp(currentSquadHp);
          addLog(
            <span>💉 <strong>CAN THIỆP CHIẾN THUẬT: EMERGENCY REPAIR!</strong> Hồi phục <span className="text-green-500 font-bold">+${globalHealAmt} HP</span>!</span>,
            "text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded border-l-2 border-green-500 my-1 font-serif"
          );
          await delay(600);
        }
      }
      
      if (getTotalEnemyHp() <= 0) break;

      let highestAtb = -1;
      let isSquadActor = false;
      let activeIdx = -1;

      for (let i = 0; i < 6; i++) {
         if (squad[i] && currentCardHps[i] > 0 && squadATB[i] >= 1000) {
            if (squadATB[i] > highestAtb) { highestAtb = squadATB[i]; isSquadActor = true; activeIdx = i; }
         }
         if (enemySquad[i] && currentEnemyHps[i] > 0 && enemyATB[i] >= 1000) {
            if (enemyATB[i] > highestAtb) { highestAtb = enemyATB[i]; isSquadActor = false; activeIdx = i; }
         }
      }

      if (activeIdx === -1) {
          let minTicks = Infinity;
          for(let i=0; i<6; i++) {
             if (squad[i] && currentCardHps[i] > 0) minTicks = Math.min(minTicks, (1000 - squadATB[i]) / Math.max(1, sqSpeeds[i]));
             if (enemySquad[i] && currentEnemyHps[i] > 0) minTicks = Math.min(minTicks, (1000 - enemyATB[i]) / Math.max(1, enSpeeds[i]));
          }
          if (minTicks === Infinity || minTicks < 0) break;
          
          for(let i=0; i<6; i++) {
             if (squad[i] && currentCardHps[i] > 0) squadATB[i] += sqSpeeds[i] * minTicks;
             if (enemySquad[i] && currentEnemyHps[i] > 0) enemyATB[i] += enSpeeds[i] * minTicks;
          }
          setDisplaySquadATB([...squadATB]);
          setDisplayEnemyATB([...enemyATB]);
          
          // Use a fixed delay and rely on CSS transition-all to smoothly animate the bar, 
          // dramatically reducing React re-render overhead.
          await delay(isMobileEnv ? 80 : 200);
          continue;
      }

      if (isSquadActor) squadATB[activeIdx] -= 1000;
      else enemyATB[activeIdx] -= 1000;
      setDisplaySquadATB([...squadATB]);
      setDisplayEnemyATB([...enemyATB]);
      await delay(200);

      totalActions++;
      turn = Math.floor(totalActions / 6) + 1; // logical turn approximation

      if (isSquadActor) {
        const realIdx = activeIdx;
        const attackerCard = squad[realIdx]!;
        let skipTurn = false;

        let keptSquadStatuses: typeof squadStatuses[0] = [];
        for (const status of squadStatuses[realIdx]) {
          if (status.turnsLeft <= 0) continue;
          
          if (status.type === "burn") {
            const burnDmg = Math.floor(cardMaxHp[realIdx] * 0.05);
            currentCardHps[realIdx] = Math.max(0, currentCardHps[realIdx] - burnDmg);
            setDisplayCardHps([...currentCardHps]);
            currentSquadHp = currentCardHps.reduce((acc, val) => acc + val, 0);
            setDisplaySquadHp(currentSquadHp);
            triggerShake("squad");
            addLog(
              <span>🔥 [THIÊU ĐỐT] {attackerCard.name} mất <span className="text-orange-500 font-bold">-${burnDmg} HP</span></span>,
              "text-zinc-400 text-[10px] pl-4"
            );
          } else if (status.type === "stun" || status.type === "paralyze") {
            if (Math.random() < (status.type === "stun" ? 0.5 : 0.3)) {
               skipTurn = true;
               addLog(
                 <span><Icon name="fa-cloud-bolt text-yellow-500" className="fa-cloud-bolt text-yellow-500" /> {attackerCard.name} bị {status.type === "stun" ? "CHOÁNG" : "TÊ LIỆT"} và không thể tấn công!</span>,
                 "text-yellow-500 text-[10px] pl-4"
               );
            }
          }

          status.turnsLeft--;
          if (status.turnsLeft > 0) keptSquadStatuses.push(status);
        }
        squadStatuses[realIdx] = keptSquadStatuses;
        setDisplaySquadStatuses([...squadStatuses.map(s => [...s])]);

        if (currentCardHps[realIdx] <= 0 || skipTurn) {
          if (currentCardHps[realIdx] <= 0) {
             actualSquadAtk = Math.max(0, actualSquadAtk - cardAtks[realIdx]);
             addLog(
               <span><Icon name="fa-skull text-red-600" className="fa-skull text-red-600" /> {attackerCard.name} đã gục ngã vì hiệu ứng trạng thái!</span>,
               "text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded text-[11px]"
             );
          }
          continue;
        }

        let currentAliveEnemies = enemySquad.map((e, i) => e && currentEnemyHps[i] > 0 ? i : -1).filter(i => i !== -1);
        if (currentAliveEnemies.length === 0) {
            setActiveAttackerIdx(realIdx);
            break;
        }
        let aliveEnemiesFront = currentAliveEnemies.filter(i => i < 3);
        let aliveEnemiesBack = currentAliveEnemies.filter(i => i >= 3);
        
        let targetEnIdxs: number[] = [];
        const isUltimate = currentCardManas[realIdx] + 25 >= targetMaxManas[realIdx];
        if (isUltimate) {
             if (attackerCard.cardClass === "UR" || attackerCard.cardClass === "SSR") {
                 targetEnIdxs = currentAliveEnemies;
             } else {
                 if (aliveEnemiesFront.length > 0) targetEnIdxs = [aliveEnemiesFront[Math.floor(Math.random() * aliveEnemiesFront.length)]];
                 else targetEnIdxs = [aliveEnemiesBack[Math.floor(Math.random() * aliveEnemiesBack.length)]];
             }
        } else {
             if (aliveEnemiesFront.length > 0) {
                 if (Math.random() > 0.2) targetEnIdxs = [aliveEnemiesFront[Math.floor(Math.random() * aliveEnemiesFront.length)]];
                 else if (aliveEnemiesBack.length > 0) targetEnIdxs = [aliveEnemiesBack[Math.floor(Math.random() * aliveEnemiesBack.length)]];
                 else targetEnIdxs = [aliveEnemiesFront[Math.floor(Math.random() * aliveEnemiesFront.length)]];
             } else {
                 targetEnIdxs = [aliveEnemiesBack[Math.floor(Math.random() * aliveEnemiesBack.length)]];
             }
        }

        if (targetEnIdxs.length > 0) {
           const attackerNode = squadRefs.current[realIdx];
           const targetNode = enemyRefs.current[targetEnIdxs[0]]; 
           if (attackerNode && targetNode) {
               const aRect = attackerNode.getBoundingClientRect();
               const tRect = targetNode.getBoundingClientRect();
               const aCx = aRect.left + aRect.width / 2;
               const aCy = aRect.top + aRect.height / 2;
               const tCx = tRect.left + tRect.width / 2;
               const tCy = tRect.top + tRect.height / 2;
               let dx = tCx - aCx;
               let dy = tCy - aCy;
               if (window.innerWidth >= 1024) dx -= 120;
               else dy += 120;
               setActiveAttackVector({ x: dx, y: dy });
           } else setActiveAttackVector(null);
        } else {
           setActiveAttackVector(null);
        }

        setActiveAttackerIdx(realIdx);
        await delay(200);

        let baseAtk = cardAtks[realIdx];
        let isCrit = false;
        let critRate = 0;
        let critLog: React.ReactNode = "";
        let isAoe = false;

        try {
           const stored = localStorage.getItem('cineUnlockedSkills');
           if (stored) {
               critRate = getSkillEffects(JSON.parse(stored)).crit_flat;
           }
        } catch(e) {}
        
        if (Math.random() * 100 < critRate) {
           isCrit = true;
           baseAtk = Math.floor(baseAtk * 1.5);
           critLog = (
             <>
               <div className="text-cinematic-cyan font-bold bg-cinematic-cyan/10 border border-cinematic-cyan/30 px-2 py-1 rounded inline-block mb-1 shadow-[0_0_10px_rgba(0,243,255,0.3)]">
                 <Icon name="fa-bolt" className="fa-bolt" /> {attackerCard.name} tung Đòn Tấn Công Chí Mạng (Chí mạng do thuộc tính)!
               </div>
               <br />
             </>
           );
        }

        currentCardManas[realIdx] = Math.min(targetMaxManas[realIdx], currentCardManas[realIdx] + 25);
        setDisplayCardManas([...currentCardManas]);

        if (isUltimate) {
          currentCardManas[realIdx] = 0; 
          setDisplayCardManas([...currentCardManas]);
          isCrit = true;
          const ultStats = calculateUltimateStats(attackerCard);
          const baseMul = ultStats.power ? ultStats.power / 100 : 1.5;
          const ultMul = attackerCard.ultimateLevel ? baseMul + attackerCard.ultimateLevel * 0.15 : (baseMul === 1.5 ? 2.0 : baseMul);
          baseAtk = Math.floor(baseAtk * ultMul);
          const ultiName = attackerCard.ultimateMove || "Đòn Đánh Chí Mạng";

          playUltimateSound();
          setActiveCutInCard(attackerCard);
          setActiveCutInQuote(ultimateQuotes.get(attackerCard.id) || "Khoan nhượng nghĩa là tự sát!");
          await delay(1800);
          setActiveCutInCard(null);
          setActiveCutInQuote(null);
          await delay(200);

          if (attackerCard.cardClass === "UR" || attackerCard.cardClass === "SSR") {
            isAoe = true;
            critLog = (
              <>
                <div className="text-cinematic-cyan font-bold bg-cinematic-cyan/10 border border-cinematic-cyan/30 px-2 py-1 rounded inline-block mb-1 shadow-[0_0_10px_rgba(0,243,255,0.3)]">
                  <Icon name="fa-atom" className="fa-atom" /> {attackerCard.name} thi triển AOE ULTIMATE [{ultiName}] <span className="opacity-50 text-[10px]">Lv.${attackerCard.ultimateLevel || 1}</span> <span className="text-[9px] text-white/40">(${ultMul.toFixed(1)}x Dmg to All)</span>
                </div>
                <br />
              </>
            );
          } else {
            critLog = (
              <>
                <div className="text-cinematic-cyan font-bold bg-cinematic-cyan/10 border border-cinematic-cyan/30 px-2 py-1 rounded inline-block mb-1 shadow-[0_0_10px_rgba(0,243,255,0.3)]">
                  <Icon name="fa-bolt" className="fa-bolt" /> {attackerCard.name} thi triển [{ultiName}] <span className="opacity-50 text-[10px]">Lv.${attackerCard.ultimateLevel || 1}</span> <span className="text-[9px] text-white/40">(${ultMul.toFixed(1)}x Dmg)</span>
                </div>
                <br />
              </>
            );
          }
        }

        let triggerStatusLog: React.ReactNode = "";
        let roleStatusLog: React.ReactNode = "";
        const role = getCardRole(attackerCard);
        if (role === "Vanguard") {
           const shieldAmt = Math.floor(cardMaxHp[realIdx] * 0.15);
           squadShields[realIdx] += shieldAmt;
           setDisplayShields([...squadShields]);
           roleStatusLog = <span className="ml-1 text-[9px] text-zinc-300 font-mono bg-zinc-800 px-1 rounded border border-zinc-600">🛡️ +${shieldAmt} Khiên</span>;
        } else if (role === "Support" || role === "Weaver" || role === "Phantom") {
           const healAmt = Math.floor(cardMaxHp[realIdx] * 0.05);
           currentCardHps = currentCardHps.map((hp, i) => {
              if (squad[i] && hp > 0) {
                 addDamagePopup(healAmt, `squad_${i}`, false, undefined, "text-green-400", 0, true);
                 return Math.min(cardMaxHp[i], hp + healAmt);
              }
              return hp;
           });
           setDisplayCardHps([...currentCardHps]);
           roleStatusLog = <span className="ml-1 text-[9px] text-green-400 font-mono bg-green-900/30 px-1 rounded border border-green-500/50">💚 +${healAmt} HP Đoàn</span>;
        }

        const attackerIsPhysical = ["Tech", "Mutant"].includes(attackerCard.faction);
        const dmgType = attackerIsPhysical ? "Physical" : "Magic";
        const colorClass = attackerIsPhysical ? "text-orange-400" : "text-purple-400";
        triggerShake("boss");

        let logEntryDetails: React.ReactNode[] = [];

        for (const targetIdx of targetEnIdxs) {
           const targetEnemy = enemySquad[targetIdx]!;
           let currentAtk = baseAtk;
           let atkMod = 1;
           const cardFac = getFactionInfo(attackerCard.faction);

           if (cardFac.strongAgainst === targetEnemy.faction) {
             atkMod *= 1.3;
           } else if (cardFac.weakAgainst === targetEnemy.faction) {
             atkMod *= 0.7;
           }

           const elemAdv = getElementAdvantage(attackerCard.element, targetEnemy.element);
           atkMod *= elemAdv;
           currentAtk = Math.floor(currentAtk * atkMod);

           if (enemyStatuses[targetIdx].some(s => s.type === "pierce" || s.type === "armor_break")) {
             currentAtk = Math.floor(currentAtk * 1.3);
           }

           if (attackerCard.element && attackerCard.element !== "Neutral") {
              const triggerChance = 20 + (attackerCard.ultimateLevel || 1) * 3;
              if (Math.random() * 100 < triggerChance) {
                let typeName = "";
                let statusType = "";
                if (attackerCard.element === "Fire") { statusType = "burn"; typeName = "Thiêu Đốt / Độc"; }
                else if (attackerCard.element === "Water") { statusType = "chill"; typeName = "Tê Buốt"; }
                else if (attackerCard.element === "Earth") { statusType = "stun"; typeName = "Hóa Đá / Choáng"; }
                else if (attackerCard.element === "Wind") { statusType = "armor_break"; typeName = "Phá Giáp"; }
                else if (attackerCard.element === "Lightning") { statusType = "paralyze"; typeName = "Tê Liệt"; }

                if (statusType) {
                  const existing = enemyStatuses[targetIdx].find(s => s.type === statusType);
                  if (existing) {
                     existing.turnsLeft = 2;
                  } else {
                     enemyStatuses[targetIdx].push({ type: statusType, turnsLeft: 2 });
                  }
                  setDisplayEnemyStatuses([...enemyStatuses.map(s => [...s])]);
                  triggerStatusLog = <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded font-mono border bg-black/60 shadow-lg" style={{ borderColor: "currentColor", color: "white" }}>Gây ${typeName.toUpperCase()}!</span>;
                }
              }
           }

           const enemyImplicitDef = targetEnemy.attack * 0.4;
           const reductionRate = enemyImplicitDef / (enemyImplicitDef + 1000);
           currentAtk = Math.floor(currentAtk * (0.9 + Math.random() * 0.2));
           
           let elementalDmgValue = 0;
           let elementName = attackerCard.element || "Neutral";
           if (elementName !== "Neutral") {
             elementalDmgValue = Math.floor(currentAtk * 0.2);
           }

           currentAtk = Math.max(1, Math.floor(currentAtk * (1 - reductionRate)));

           if (isAoe) currentAtk = Math.floor(currentAtk * 0.6);

           addDamagePopup(currentAtk, `enemy-${targetIdx}` as any, isCrit, dmgType, colorClass, 0);

           if (elementalDmgValue > 0) {
             setTimeout(() => {
               addDamagePopup(elementalDmgValue, `enemy-${targetIdx}` as any, false, elementName, "text-cyan-400", 35);
             }, 150);
           }

           currentEnemyHps[targetIdx] = Math.max(0, currentEnemyHps[targetIdx] - (currentAtk + elementalDmgValue));
           currentEnemyManas[targetIdx] = Math.min(100, currentEnemyManas[targetIdx] + 10);
           setDisplayEnemyManas([...currentEnemyManas]);
           
           let dmgColor = isCrit ? "text-cinematic-cyan text-lg " : "text-orange-400 font-bold";
           logEntryDetails.push(
               <div key={`hit-${targetIdx}`} className="ml-4 tabular-nums">
                 ↳ {targetEnemy.name}: <span className={dmgColor}>-${currentAtk + elementalDmgValue} HP</span>
                 <span className="text-[10px] text-zinc-500 ml-1">(${dmgType})</span>
                 {elementalDmgValue > 0 && <span className="text-[10px] text-cyan-400 ml-1">+${elementalDmgValue} ${elementName} DMG</span>}
               </div>
           );
        }
        
        setDisplayEnemyHps([...currentEnemyHps]);
        if (isCrit) { triggerScreenShake(); await triggerHitStop(); }

        addLog(
          <div className="flex flex-col">
            <div>
              {critLog}[Lượt ${turn}] {attackerCard.name} tấn công ${isAoe ? "AOE TOÀN MẶT TRẬN" : ""}: 
              {triggerStatusLog} {roleStatusLog}
            </div>
            {logEntryDetails}
          </div>,
          isCrit ? "text-white" : "text-zinc-400"
        );

        await delay(500); 
        setActiveAttackVector(null);
        setActiveAttackerIdx(null);
      } else {
        const attackerEnIdx = activeIdx;
        const activeEn = enemySquad[attackerEnIdx]!;
        let skipEnTurn = false;
        let enAtkObj = activeEn.attack;

        let keptStatuses: typeof enemyStatuses[0] = [];
        for (const status of enemyStatuses[attackerEnIdx]) {
          if (status.turnsLeft <= 0) continue;
          
          if (status.type === "burn") {
            const burnDmg = Math.floor(actualSquadAtk * 0.05); 
            currentEnemyHps[attackerEnIdx] = Math.max(0, currentEnemyHps[attackerEnIdx] - burnDmg);
            setDisplayEnemyHps([...currentEnemyHps]);
            triggerShake("boss");
            addLog(
              <span>🔥 [THIÊU ĐỐT / ĐỘC] {activeEn.name} mất <span className="text-orange-500 font-bold">-${burnDmg} HP</span></span>,
              "text-zinc-400 text-[10px] pl-4"
            );
          } else if (status.type === "chill") {
            enAtkObj = Math.floor(enAtkObj * 0.7);
          } else if (status.type === "stun") {
            if (Math.random() < 0.5) skipEnTurn = true;
          } else if (status.type === "paralyze") {
            if (Math.random() < 0.3) skipEnTurn = true;
          }

          status.turnsLeft--;
          if (status.turnsLeft > 0) keptStatuses.push(status);
        }
        enemyStatuses[attackerEnIdx] = keptStatuses;
        setDisplayEnemyStatuses([...enemyStatuses.map(s => [...s])]);

        if (currentEnemyHps[attackerEnIdx] <= 0) {
            actualSquadAtk = Math.max(0, actualSquadAtk - cardAtks[attackerEnIdx] || 0); // Note: enemies don't impact actualSquadAtk but safe hook
            continue;
        }

        if (skipEnTurn) {
          addLog(
            <span><Icon name="fa-ban text-red-500" className="fa-ban text-red-500" /> {activeEn.name} bị vô hiệu hóa! Bỏ qua lượt đánh.</span>,
            "text-yellow-500 text-xs italic bg-red-900/10 px-2 py-1 rounded"
          );
          await delay(200);
        } else {
          setIsBossAttacking(true);

          const bossAttackIsPhysical = ["Tech", "Mutant"].includes(activeEn.faction);
          const squadDefenseValue = bossAttackIsPhysical ? squadDef : squadRes;
          const reductionRate = Math.min(0.8, squadDefenseValue / (squadDefenseValue + 1000));

          let targetIdx = -1;
          let actionType: "attack" | "heal" | "buff" = "attack";
          let healAmount = 0;

          const aliveFrontline = [0, 1, 2].filter((i) => squad[i] !== null && currentCardHps[i] > 0);
          const aliveBackline = [3, 4, 5].filter((i) => squad[i] !== null && currentCardHps[i] > 0);
          const allAlive = [...aliveFrontline, ...aliveBackline];

          const enemyBehavior = (() => {
             if (["CyberCore", "Tech"].includes(activeEn.faction)) return "tactical";
             if (["Ethereal", "Starborn"].includes(activeEn.faction)) return "healer";
             if (["VoidBringer", "Demon"].includes(activeEn.faction)) return "sneaky";
             if (["Mutant", "Beast"].includes(activeEn.faction)) return "aggressive";
             return "standard";
          })();

          let isBossSpecial = false;
          let bossSkillLog: React.ReactNode = "";

          // Special ability probability increases if they are low HP (desperation)
          let specialProb = 0.25;
          if (currentEnemyHps[attackerEnIdx] < activeEn.hp * 0.3) specialProb = 0.5;
          if (Math.random() < specialProb) {
             isBossSpecial = true;
          }

          if (enemyBehavior === "tactical") {
             // Target backline (Supports/Mages) or lowest HP
             if (isBossSpecial && allAlive.length > 0) {
                 targetIdx = allAlive.reduce((minIdx, idx) => currentCardHps[idx] < currentCardHps[minIdx] ? idx : minIdx, allAlive[0]);
                 bossSkillLog = <span className="block text-[#fe2341] font-bold text-[10px] uppercase mb-1">&gt; Lệnh Khóa Mục Tiêu: Khẩu Lệnh Tử Vong &lt;</span>;
             } else {
                 if (aliveBackline.length > 0) targetIdx = aliveBackline[Math.floor(Math.random() * aliveBackline.length)];
                 else if (aliveFrontline.length > 0) targetIdx = aliveFrontline[Math.floor(Math.random() * aliveFrontline.length)];
             }
          } else if (enemyBehavior === "healer") {
             // Healer might heal themselves or allies if HP is low
             const lowHpEnemies = [0,1,2,3,4,5].filter(i => enemySquad[i] && currentEnemyHps[i] > 0 && currentEnemyHps[i] < enemySquad[i]!.hp * 0.7);
             if (isBossSpecial && lowHpEnemies.length > 0) {
                 actionType = "heal";
                 targetIdx = lowHpEnemies[Math.floor(Math.random() * lowHpEnemies.length)];
                 healAmount = Math.floor(activeEn.hp * 0.15); // Heal 15% Max HP
                 bossSkillLog = <span className="block text-green-400 font-bold text-[10px] uppercase mb-1">&gt; Phép Thuật Phục Hồi &lt;</span>;
             } else {
                 if (allAlive.length > 0) targetIdx = allAlive[Math.floor(Math.random() * allAlive.length)];
             }
          } else if (enemyBehavior === "sneaky") {
             // Random targeting, pierces shields
             if (allAlive.length > 0) {
                 targetIdx = allAlive[Math.floor(Math.random() * allAlive.length)];
                 if (isBossSpecial && targetIdx !== -1 && squadShields[targetIdx] > 0) {
                     squadShields[targetIdx] = 0; // Break shield
                     bossSkillLog = <span className="block text-cinematic-cyan font-bold text-[10px] uppercase mb-1">&gt; Đột Kích Xuyên Thủng Khiên &lt;</span>;
                 } else if (isBossSpecial && targetIdx !== -1) {
                     // Applies paralyze randomly
                     bossSkillLog = <span className="block text-purple-400 font-bold text-[10px] uppercase mb-1">&gt; Giáng Đòn Tê Liệt &lt;</span>;
                 }
             }
          } else if (enemyBehavior === "aggressive") {
             if (aliveFrontline.length > 0) targetIdx = aliveFrontline[Math.floor(Math.random() * aliveFrontline.length)];
             else if (aliveBackline.length > 0) targetIdx = aliveBackline[Math.floor(Math.random() * aliveBackline.length)];
             
             if (isBossSpecial && targetIdx !== -1) {
                 enAtkObj = Math.floor(enAtkObj * 1.5);
                 bossSkillLog = <span className="block text-orange-500 font-bold text-[10px] uppercase mb-1">&gt; Cuồng Bạo Kích Oanh Tạc &lt;</span>;
             }
          } else {
             if (bossAttackIsPhysical) {
                if (aliveFrontline.length > 0) targetIdx = aliveFrontline[Math.floor(Math.random() * aliveFrontline.length)];
                else if (aliveBackline.length > 0) targetIdx = aliveBackline[Math.floor(Math.random() * aliveBackline.length)];
             } else {
                if (allAlive.length > 0) targetIdx = allAlive[Math.floor(Math.random() * allAlive.length)];
             }
          }

          if (targetIdx !== -1) {
             const enemyNode = enemyRefs.current[attackerEnIdx];
             const squadNode = squadRefs.current[targetIdx];
             if (enemyNode && squadNode) {
                 const eRect = enemyNode.getBoundingClientRect();
                 const sRect = squadNode.getBoundingClientRect();
                 const eCx = eRect.left + eRect.width / 2;
                 const eCy = eRect.top + eRect.height / 2;
                 const sCx = sRect.left + sRect.width / 2;
                 const sCy = sRect.top + sRect.height / 2;
                 let dx = sCx - eCx;
                 let dy = sCy - eCy;
                 if (window.innerWidth >= 1024) dx += 120;
                 else dy -= 120;
                 setActiveAttackVector({ x: dx, y: dy });
             } else setActiveAttackVector(null);
          } else setActiveAttackVector(null);

          setActiveAttackerIdx(`enemy-${attackerEnIdx}`);
          await delay(300);

          if (Math.random() * 100 < dodgeRate) {
            addLog(
              <span>[Lượt ${turn}] ⚡ <strong className="tracking-widest bg-white/10 px-2 rounded">[NÉ TRÁNH]</strong> Đội hình né được đòn của {activeEn.name}.</span>,
              "text-cinematic-gold"
            );
          } else {
            currentEnemyManas[attackerEnIdx] = Math.min(100, currentEnemyManas[attackerEnIdx] + 25);
            setDisplayEnemyManas([...currentEnemyManas]);

            let isBossCrit = false;
            let ultMul = 1.0;
            if (currentEnemyManas[attackerEnIdx] >= 100) {
                currentEnemyManas[attackerEnIdx] = 0;
                setDisplayEnemyManas([...currentEnemyManas]);
                isBossCrit = true;
                ultMul = 2.0;

                playUltimateSound();
                bossSkillLog = (
                   <>
                      {bossSkillLog}
                      <div className="text-red-500 font-bold bg-red-900/30 border border-red-500/50 px-2 py-1 rounded inline-block mb-1 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                         <Icon name="fa-burst" className="fa-burst" /> {activeEn.name} thi triển ULTIMATE! <span className="opacity-80 text-[10px]">(x2 DMG)</span>
                      </div>
                      <div className="text-red-500/80 font-serif italic text-sm mb-1 mt-1">
                         &quot;{ultimateQuotes.get(`enemy_${attackerEnIdx}`) || 'Chết đi!'}&quot;
                      </div>
                      <br />
                   </>
                );
                await delay(500);
            }

            if (actionType === "heal" && targetIdx !== -1) {
                const targetAlly = enemySquad[targetIdx];
                if (targetAlly) {
                    currentEnemyHps[targetIdx] = Math.min(targetAlly.hp, currentEnemyHps[targetIdx] + healAmount);
                    setDisplayEnemyHps([...currentEnemyHps]);
                    addDamagePopup(healAmount, `enemy-${targetIdx}` as any, false, undefined, "text-green-400", 0, true);
                    
                    addLog(
                        <span>
                            {bossSkillLog}
                            [Lượt ${turn}] {activeEn.name} hồi phục cho {targetAlly.name}: <span className="text-green-400 font-bold">+{healAmount} HP</span>
                        </span>,
                        "text-green-300/80 bg-green-900/10 p-1 border-l-2 border-green-500"
                    );
                }
            } else {
                const rawBossDmg = Math.floor(enAtkObj * ultMul * (0.9 + Math.random() * 0.2));
                let bossDmg = Math.max(1, Math.floor(rawBossDmg * (1 - reductionRate)));

                let shieldAbsorbed = 0;
                if (targetIdx !== -1) {
                    if (squadShields[targetIdx] > 0) {
                       if (squadShields[targetIdx] >= bossDmg) {
                          shieldAbsorbed = bossDmg;
                          squadShields[targetIdx] -= bossDmg;
                          bossDmg = 0;
                       } else {
                          shieldAbsorbed = squadShields[targetIdx];
                          bossDmg -= shieldAbsorbed;
                          squadShields[targetIdx] = 0;
                       }
                       setDisplayShields([...squadShields]);
                    }
                    if (bossDmg > currentCardHps[targetIdx]) bossDmg = currentCardHps[targetIdx];
                    currentCardHps[targetIdx] -= bossDmg;
                    
                    currentCardManas[targetIdx] = Math.min(targetMaxManas[targetIdx], currentCardManas[targetIdx] + 10);
                    setDisplayCardManas([...currentCardManas]);

                    if (activeEn.element && activeEn.element !== "Neutral") {
                       const triggerChance = 15;
                       if (Math.random() * 100 < triggerChance) {
                          let statusType = "";
                          if (activeEn.element === "Fire") statusType = "burn";
                          else if (activeEn.element === "Water") statusType = "chill";
                          else if (activeEn.element === "Earth") statusType = "stun";
                          else if (activeEn.element === "Wind") statusType = "armor_break";
                          else if (activeEn.element === "Lightning") statusType = "paralyze";

                          if (statusType) {
                             const existing = squadStatuses[targetIdx].find(s => s.type === statusType);
                             if (existing) {
                                existing.turnsLeft = 2;
                             } else {
                                squadStatuses[targetIdx].push({ type: statusType, turnsLeft: 2 });
                             }
                             setDisplaySquadStatuses([...squadStatuses.map(s => [...s])]);
                          }
                       }
                    }
                }

                currentSquadHp = currentCardHps.reduce((acc, val) => acc + val, 0);
                setDisplayCardHps([...currentCardHps]);
                setDisplaySquadHp(Math.max(0, currentSquadHp));
                triggerShake("squad");
                
                const bossDmgType = bossAttackIsPhysical ? "Physical" : "Magic";
                const bossColorClass = bossAttackIsPhysical ? "text-red-400" : "text-purple-400";
                const targetStr = targetIdx !== -1 ? (`squad_${targetIdx}` as any) : "squad";
                
                addDamagePopup(bossDmg, targetStr, isBossCrit, bossDmgType, bossColorClass, 0);
                if (isBossCrit) { triggerScreenShake(); await triggerHitStop(); }

                let targetCardName = "Đội hình";
                if (targetIdx !== -1 && squad[targetIdx]) targetCardName = squad[targetIdx]!.name;

                let finalDmgColor = isBossCrit ? "text-red-500 font-bold  text-lg" : "text-red-500 font-bold ";

                addLog(
                  <span>
                    {bossSkillLog}
                    [Lượt ${turn}] {activeEn.name} đánh {targetCardName}: <span className={finalDmgColor}>-${bossDmg} HP</span>
                    {shieldAbsorbed > 0 && <span className="text-zinc-300 text-[10px] ml-1">(Khiên đỡ: ${shieldAbsorbed})</span>}
                    <span className="text-[10px] text-zinc-500 ml-2">(${bossDmgType}) (Bị giảm ${(reductionRate * 100).toFixed(0)}%)</span>
                  </span>,
                  isBossCrit ? "text-white/80 bg-red-900/30 p-1 border-l-2 border-red-500" : "text-white/80 bg-red-900/10 p-1 border-l-2 border-red-500"
                );
                
                if (targetIdx !== -1 && currentCardHps[targetIdx] <= 0) {
                   actualSquadAtk = Math.max(0, actualSquadAtk - cardAtks[targetIdx]);
                   addLog(
                      <span><Icon name="fa-skull text-red-600" className="fa-skull text-red-600" /> Báo Động: {targetCardName} đã ngã xuống!</span>,
                      "text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded text-[11px]"
                   );
                }
            }
          }
          setIsBossAttacking(false);
          setActiveAttackVector(null);
          setActiveAttackerIdx(null);
          await delay(300);
        }
      }
    }
    await delay(800);
    if (getTotalEnemyHp() <= 0 || currentSquadHp <= 0) {
      playGlassBreakSound();
      setGlassBreak(true);
      await delay(1500);
      setGlassBreak(false);
    }

    if (opTab === "world_boss") {
      if (getTotalEnemyHp() <= 0) {
        setWorldBossState((p: any) => ({ ...p, boss: null, level: p.level + 1 }));
        const dcReward = 1000 * worldBossState.level;
        const matReward = 10 * worldBossState.level;
        modifyCurrency(dcReward);
        const randMat = ["CyberCore Component", "Ethereal Essence", "Void Fragment", "Mecha Joint", "Astro Thruster", "Arcane Rune"][Math.floor(Math.random()*5)];
        modifyInventory(0, 0, { [randMat]: matReward });
        addLog(`>>> CHIẾN THẮNG WORLD BOSS LEVEL ${worldBossState.level}! Nhận lượng lớn phần thưởng! <<<`, "font-bold text-lg text-green-400 my-4 uppercase text-center");
        
        let finalRating = turn <= 5 ? "S" : turn <= 10 ? "A" : turn <= 15 ? "B" : "C";
        setCombatResult({
          status: "victory",
          title: "World Boss Tiêu Diệt!",
          rating: finalRating,
          turns: turn,
          exp: 0,
          rewards: [
            { label: "Tiền Thưởng", value: `+${dcReward} DC`, colorClass: "text-cinematic-gold" },
            { label: "Tài Nguyên", value: `+${matReward} ${randMat}`, colorClass: "text-purple-400" }
          ],
          message: `Mối đe dọa vũ trụ cấp ${worldBossState.level} đã bị trừ khử! Chiến dịch thành công.`
        });
      } else {
        const newBoss = { ...boss, hp: currentEnemyHps[0] };
        setWorldBossState((p: any) => ({ ...p, boss: newBoss }));
        modifyCurrency(50 * worldBossState.level);
        if (turn > 15) {
            addLog(`>>> HẾT THỜI GIAN TÁC CHIẾN (15 ROUNDS) <<<`, "font-bold text-yellow-500 my-2 uppercase text-center");
            addLog(`Hệ thống rút lui khẩn cấp. Boss còn lại ${currentEnemyHps[0]} HP.`, "text-cinematic-cyan");
            setCombatResult({
              status: "draw",
              title: "Hết Thời Gian",
              rating: "D",
              turns: turn,
              exp: 0,
              rewards: [{ label: "Tiền An Ủi", value: `+${50 * worldBossState.level} DC` }],
              message: "Trận đấu đã kéo dài quá 15 vòng. Hệ thống tự động kích hoạt giao thức rút lui. Sát thương lên Boss đã được ghi nhận."
            });
        } else {
            addLog(`>>> ĐỘI HÌNH BỊ HẠ GỤC <<<`, "font-bold text-red-500 my-2 uppercase text-center");
            addLog(`World boss còn lại ${currentEnemyHps[0]} HP. Đã lưu trạng thái!`, "text-cinematic-cyan");
            setCombatResult({
              status: "defeat",
              title: "Đội Hình Hạ Gục",
              rating: "F",
              turns: turn,
              exp: 0,
              rewards: [{ label: "Tiền An Ủi", value: `+${50 * worldBossState.level} DC` }],
              message: "Toàn bộ đội hình đã bị tiêu diệt. Hãy nâng cấp và quay lại."
            });
        }
      }
    } else if (getTotalEnemyHp() <= 0) {
      let finalRating = turn <= 3 ? "S" : turn <= 5 ? "A" : turn <= 10 ? "B" : "C";
      
      if (opTab === "battlefield") {
        const totalDc = enemySquad.reduce((sum, b) => sum + (b ? b.reward : 0), 0) || 500;
        const expGained = Math.floor(totalDc / 5);
        
        const parsedRewards: any[] = [];
        
        modifyCurrency(totalDc);
        gainExperience(expGained);
        
        addLog(
          `>>> CHIẾN THẮNG BATTLEFIELD! <<<`,
          "text-green-400 font-bold mt-2 border-t border-green-900/50 pt-2",
        );
        parsedRewards.unshift({ label: "Kinh Nghiệm", value: `+${expGained} EXP`, colorClass: "text-blue-400" });
        parsedRewards.unshift({ label: "Tiền Thưởng", value: `+${totalDc} DC`, colorClass: "text-cinematic-gold" });
        
        setCombatResult({
          status: "victory",
          title: `Trận chiến thành công`,
          rating: finalRating,
          turns: turn,
          exp: expGained,
          rewards: parsedRewards,
          message: "Toàn bộ kẻ địch đã bị triệt tiêu!"
        });
        setEnemySquad([null, null, null, null, null, null]);
      } else {
        let baseDrop = 0;
        let eliteDrop = 0;
        let expGained = 0;
        if (boss.threatLevel.includes("Elite") || opTab === "single_boss") {
          baseDrop = opTab === "single_boss" ? 2 : 1;
          if (Math.random() < 0.15 || opTab === "single_boss") eliteDrop = 1;
          expGained = opTab === "single_boss" ? 25 : 15;
        } else if (boss.threatLevel.includes("Nightmare")) {
          baseDrop = 1;
          eliteDrop = 1;
          if (Math.random() < 0.2) eliteDrop = 2;
          expGained = 30;
        } else {
          if (Math.random() < 0.3) baseDrop = 1;
          expGained = 5;
        }

        const parsedRewards: any[] = [
          { label: "Tiền Thưởng", value: `+${boss.reward} DC`, colorClass: "text-green-400" },
          { label: "Kinh Nghiệm", value: `+${expGained} EXP`, colorClass: "text-blue-400" },
        ];
        if (baseDrop > 0) parsedRewards.push({ label: "Vé Tiêu Chuẩn", value: `+${baseDrop}`, colorClass: "text-cinematic-cyan" });
        if (eliteDrop > 0) parsedRewards.push({ label: "Vé Đặc Quyền", value: `+${eliteDrop}`, colorClass: "text-purple-400" });

        addLog(
          ">>> CHIẾN THẮNG! <<<",
          "text-green-400 font-bold mt-2 border-t border-green-900/50 pt-2",
        );
        modifyCurrency(boss.reward);
        gainExperience(expGained);
        updateQuestProgress("boss", 1);

        const matDrops: Record<string, number> = {};
        if (boss.drops && boss.drops.length > 0) {
          boss.drops.forEach((d: { item: string, amount: number }) => {
            matDrops[d.item] = d.amount;
            parsedRewards.push({ label: "Vật Phẩm", value: `+${d.amount} ${d.item}`, colorClass: "text-cinematic-gold" });
          });
        }

        modifyInventory(baseDrop, eliteDrop, matDrops);

        setCombatResult({
          status: "victory",
          title: "Chiến Dịch Xuất Sắc!",
          rating: finalRating,
          turns: turn,
          exp: expGained,
          rewards: parsedRewards,
          message: "Kẻ địch đã bị tiêu diệt hoàn toàn."
        });
        setEnemySquad([null, null, null, null, null, null]);
      }
    } else {
      if (turn > 15) {
          addLog(">>> HÒA - VƯỢT QUÁ GIỚI HẠN 15 VÒNG <<<", "font-bold text-yellow-500 my-2 uppercase text-center");
          setCombatResult({
            status: "draw",
            title: "Thất Bại (Hòa)",
            rating: "D",
            turns: turn,
            exp: 0,
            rewards: [],
            message: "Quá 15 vòng chưa tiêu diệt được đối phương, bạn bị xử thua!"
          });
      } else {
          addLog(
            ">>> THẤT BẠI. Rút lui an toàn... <<<",
            "text-red-500 font-bold mt-2 border-t border-red-900/50 pt-2",
          );
          setCombatResult({
            status: "defeat",
            title: "Chiến Báo Thất Bại",
            rating: "F",
            turns: turn,
            exp: 0,
            rewards: [],
            message: "Thất bại (Thẻ không bị mất). Lịch sử đã được lưu vào Chiến báo. Hãy thay đổi Tộc Hệ để khắc chế Boss và thử lại!"
          });
      }
    }

    stopCombatBgm();
    setInBattle(false);
    setGlobalProcessing(false);
    setActiveAttackVector(null);
    setActiveAttackerIdx(null);
    setIsBossAttacking(false);
  };

  const renderEnemySlot = (bossData: Boss | null, index: number) => {
    return (
      <EnemySlot
        ref={(el) => (enemyRefs.current[index] = el)}
        bossData={bossData}
        index={index}
        inBattle={inBattle}
        isAttacking={activeAttackerIdx === `enemy-${index}`}
        hp={typeof displayEnemyHps[index] === 'number' ? displayEnemyHps[index] : bossData?.hp || 0}
        maxHp={bossData?.hp || 1}
        mana={typeof displayEnemyManas[index] === 'number' ? displayEnemyManas[index] : 0}
        maxMana={100}
        atb={typeof displayEnemyATB[index] === 'number' ? displayEnemyATB[index] : 0}
        statuses={displayEnemyStatuses[index] || []}
        isMobileEnv={isMobileEnv}
        isDesktop={isDesktop}
        isLiteMode={isLiteMode}
        deviceIOS={device.isIOS}
        activeAttackVector={activeAttackVector}
        damagePopups={damagePopups}
      />
    );
  };

  const renderSquadSlot = (card: Card | null, index: number) => {
    return (
      <SquadSlot
        ref={(el) => (squadRefs.current[index] = el)}
        card={card}
        index={index}
        inBattle={inBattle}
        isAttacking={activeAttackerIdx === index}
        hp={typeof displayCardHps[index] === 'number' ? displayCardHps[index] : card ? cardMaxHp[index] : 0}
        maxHp={cardMaxHp[index] || 1}
        mana={typeof displayCardManas[index] === 'number' ? displayCardManas[index] : 0}
        maxMana={typeof displayCardMaxManas[index] === 'number' ? displayCardMaxManas[index] : 100}
        atb={typeof displaySquadATB[index] === 'number' ? displaySquadATB[index] : 0}
        shield={typeof displayShields[index] === 'number' ? displayShields[index] : 0}
        statuses={displaySquadStatuses[index] || []}
        leaderId={leaderId}
        isMobileEnv={isMobileEnv}
        isDesktop={isDesktop}
        isLiteMode={isLiteMode}
        deviceIOS={device.isIOS}
        activeAttackVector={activeAttackVector}
        damagePopups={damagePopups}
        onClick={onOpenSquadSelector}
        onConfirm={onConfirm}
        setLeaderId={setLeaderId}
        onClearSquadSlot={onClearSquadSlot}
      />
    );
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in pb-12">
      <AnimatePresence>
        {inBattle && (
          <CombatArena
            boss={boss}
            screenShake={screenShake}
            isLiteMode={isLiteMode}
            hitStop={hitStop}
            glassBreak={glassBreak}
            activeCutInCard={activeCutInCard}
            activeCutInQuote={activeCutInQuote}
            displaySquadHp={displaySquadHp}
            squadHp={squadHp}
            activeSynergies={activeSynergies}
            squad={squad}
            renderSquadSlot={renderSquadSlot}
            mounted={mounted}
            handleTacticalCommand={handleTacticalCommand}
            strikeUses={strikeUses}
            getTacticalLimit={getTacticalLimit}
            healUses={healUses}
            isBossAttacking={isBossAttacking}
            displayEnemyHps={displayEnemyHps}
            enemySquad={enemySquad}
            renderEnemySlot={renderEnemySlot}
            dodgeRate={dodgeRate}
          />
        )}
      </AnimatePresence>

      <div className="w-full max-w-6xl bg-zinc-950/80 border border-cinematic-cyan/20 ring-1 ring-cinematic-cyan/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 mb-8 relative overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_0_40px_rgba(0,243,255,0.05)]">
        <CombatHeader
          isLiteMode={isLiteMode}
          toggleLiteMode={toggleLiteMode}
          displaySquadHp={displaySquadHp}
          squadAtk={squadAtk}
          squadDef={squadDef}
          squadRes={squadRes}
          dodgeRate={dodgeRate}
        />

        {/* Tab Selection */}
        <div className="flex justify-center mb-8 relative z-10 w-full max-w-3xl mx-auto">
            <div className={`flex bg-black/60 border border-white/5 rounded-full p-1.5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-xl ring-1 ring-white/5 w-full ${inBattle ? 'opacity-50 pointer-events-none' : ''}`}>
                <button
                    onClick={() => setOpTab("single_boss")}
                    className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 ${
                        opTab === "single_boss" ? 'text-black' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <Icon name="fa-crosshairs mr-2" className="fa-crosshairs mr-2" /> Elite Target
                </button>
                <button
                    onClick={() => {
                        if (inBattle) return;
                        if (!hasSSR) {
                            onAlert("Yêu cầu Thẻ", "Bạn cần sở hữu ít nhất 1 thẻ SSR để mở khóa BATTLEFIELD SWEEP!");
                            return;
                        }
                        setOpTab("battlefield");
                    }}
                    className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                        opTab === "battlefield" ? 'text-black' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    {!hasSSR && <Icon name="fa-lock text-[10px] opacity-50" className="fa-lock text-[10px] opacity-50" />}
                    <Icon name="fa-fort-awesome mr-1" className="fa-fort-awesome mr-1" /> Battlefield
                </button>
                 <button
                    onClick={() => {
                        if (inBattle) return;
                        if (!hasUR) {
                            onAlert("Yêu cầu Thẻ", "Bạn cần sở hữu ít nhất 1 thẻ UR để mở khóa WORLD THREAT!");
                            return;
                        }
                        setOpTab("world_boss");
                    }}
                    className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                        opTab === "world_boss" ? 'text-black' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    {!hasUR && <Icon name="fa-lock text-[10px] opacity-50" className="fa-lock text-[10px] opacity-50" />}
                    <Icon name="fa-globe mr-1" className="fa-globe mr-1" /> World Boss
                </button>
                
                {/* Active Indicator Slide */}
                <div 
                    className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] rounded-full transition-transform duration-300 ease-out z-0 ${
                        opTab === 'single_boss' ? 'bg-cinematic-cyan shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 
                        opTab === 'battlefield' ? 'bg-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.4)]' : 
                        'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    }`}
                    style={{ transform: opTab === 'single_boss' ? 'translateX(0)' : opTab === 'battlefield' ? 'translateX(calc(100% + 4px))' : 'translateX(calc(200% + 8px))' }}
                ></div>
            </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-2 text-[9px] text-zinc-500 mb-8 relative z-10 font-mono bg-zinc-950/80 py-2 px-6 rounded-xl border border-white/5 w-fit mx-auto cursor-help shadow-inner"
          title="Khắc hệ: CyberCore > Ethereal > VoidBringer > MechaMutant > AstroNomad > ArcaneWeaver > CyberCore"
        >
          <span className="text-blue-400 font-bold"><Icon name="Cpu" className="mr-1" /> CORE</span>
          <Icon name="ArrowRight" className="text-zinc-700 opacity-50" />
          <span className="text-yellow-200 font-bold"><Icon name="Sparkles" className="mr-1" /> ETHEREAL</span>
          <Icon name="ArrowRight" className="text-zinc-700 opacity-50" />
          <span className="text-purple-500 font-bold"><Icon name="MoonStar" className="mr-1" /> VOID</span>
          <Icon name="ArrowRight" className="text-zinc-700 opacity-50" />
          <span className="text-emerald-400 font-bold"><Icon name="Dna" className="mr-1" /> MUTANT</span>
          <Icon name="ArrowRight" className="text-zinc-700 opacity-50" />
          <span className="text-amber-500 font-bold"><Icon name="Rocket" className="mr-1" /> NOMAD</span>
          <Icon name="ArrowRight" className="text-zinc-700 opacity-50" />
          <span className="text-rose-400 font-bold"><Icon name="Hexagon" className="mr-1" /> ARCANE</span>
          <Icon name="ArrowRight" className="text-zinc-700 opacity-50" />
          <span className="text-blue-400 font-bold"><Icon name="Cpu" className="mr-1" /> CORE</span>
        </div>

        <div className="w-full flex justify-center mb-6 min-h-[160px] relative z-10">
          {!boss ? (
            <div className="w-full max-w-4xl bg-black border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden ring-1 ring-white/5">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cinematic-cyan/5 via-transparent to-transparent pointer-events-none"></div>
              
              {/* Radar Grid overlay */}
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: "radial-gradient(circle, #00f3ff 1px, transparent 1px)",
                     backgroundSize: "40px 40px"
                   }}>
              </div>
              
              <div className="relative z-10 mb-8 flex flex-col items-center">
                  {opTab === "battlefield" ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-purple-900/30 border border-purple-500/50 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                        <Icon name="fa-fort-awesome text-2xl text-purple-400" className="fa-fort-awesome text-2xl text-purple-400" />
                      </div>
                      <p className="text-sm sm:text-base text-purple-300 font-black tracking-[0.3em] font-mono">
                        BATTLEFIELD
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-2 font-mono max-w-md uppercase tracking-widest leading-relaxed text-center">
                        Engage predetermined enemy configurations. Earn DC and test your squad's synergy against Vanguard, Striker, and Support combinations.
                      </p>
                    </>
                  ) : opTab === "world_boss" ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-cinematic-gold/20 border border-cinematic-gold/50 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,184,0,0.3)]">
                        <Icon name="fa-globe text-2xl text-cinematic-gold" className="fa-globe text-2xl text-cinematic-gold" />
                      </div>
                      <p className="text-sm sm:text-base text-white/90 font-black tracking-[0.3em] font-mono uppercase">
                        World Threat Radar
                      </p>
                      <div className="flex flex-col items-center gap-2 mt-3">
                        <p className="text-[10px] text-zinc-500 font-mono max-w-md uppercase tracking-widest leading-relaxed">
                          Locate Global Extinction Events. Limited daily attempts.
                        </p>
                        <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/20 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                          <span className="text-[9px] text-red-400 font-bold font-mono tracking-widest uppercase">Reset In:</span>
                          <span className="text-sm font-mono font-bold text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)] tabular-nums">{timeUntilReset}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-cinematic-cyan/10 border border-cinematic-cyan/30 flex items-center justify-center mb-4 relative">
                        <div className="absolute inset-0 rounded-full border-t border-cinematic-cyan/50 animate-spin" style={{ animationDuration: '3s' }}></div>
                        <Icon name="fa-radar text-2xl text-cinematic-cyan" className="fa-radar text-2xl text-cinematic-cyan" />
                      </div>
                      <p className="text-sm sm:text-base text-white/90 font-black tracking-[0.3em] font-mono uppercase">
                        Sector Scan
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-2 font-mono max-w-md uppercase tracking-widest leading-relaxed">
                        Initialize Sonar Ping. Detect hostiles within combat radius.
                      </p>
                    </>
                  )}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-3xl relative z-10">
                {opTab === "world_boss" ? (
                  <div className="col-span-1 md:col-span-3 text-center text-cinematic-gold font-mono text-xs animate-pulse py-8 uppercase tracking-[0.2em]">
                    <div className="w-8 h-8 rounded-full border-2 border-cinematic-gold/50 border-t-cinematic-gold animate-spin mx-auto mb-4"></div>
                    Establishing Satellite Uplink...
                  </div>
                ) : opTab === "battlefield" ? (
                  BATTLEFIELD_SQUADS.map((squad, index) => (
                    <button 
                       key={index}
                       onClick={() => handleExecuteBattlefieldSquad(index)}
                       disabled={isGlobalProcessing}
                       className="bg-zinc-950/80 border border-purple-500/30 hover:border-purple-400 p-4 sm:p-6 rounded-xl sm:rounded-2xl transition-all group flex flex-col items-center disabled:opacity-50 relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] ring-1 ring-white/5"
                     >
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-purple-400 mb-2 sm:mb-4 text-2xl sm:text-3xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500 relative z-10 w-12 h-12 flex items-center justify-center rounded-full bg-purple-900/30">
                          <Icon name={index === 0 ? "fa-fire" : index === 1 ? "fa-bolt" : "fa-wind"} />
                        </div>
                        <div className="text-[10px] sm:text-xs font-bold text-white tracking-widest font-mono uppercase mb-1 relative z-10 text-center">
                           {squad.name}
                        </div>
                        <div className="text-[8px] sm:text-[10px] text-zinc-400 mb-3 relative z-10 text-center uppercase font-mono tracking-widest leading-relaxed line-clamp-2 min-h-6">
                           Mix of Vanguard, Striker & Support Roles
                        </div>
                        <div className="mt-auto text-[8px] sm:text-[10px] font-mono text-cinematic-gold bg-black/80 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-cinematic-gold/30 relative z-10 tracking-[0.2em] flex items-center gap-2">
                           <Icon name="fa-coins" className="fa-coins" />
                           <span className="font-bold">{squad.cost} DC</span>
                        </div>
                    </button>
                  ))
                ) : (
                  <>
                    {/* Normal Scanner */}
                    <button
                      onClick={() => handleScan("normal")}
                      disabled={isGlobalProcessing}
                      className="bg-zinc-950/80 border border-white/5 hover:border-cinematic-cyan/50 p-3 sm:p-6 rounded-xl sm:rounded-2xl transition-all group flex flex-col items-center disabled:opacity-50 relative ring-1 ring-white/5 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-cinematic-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-cinematic-cyan/10 flex items-center justify-center text-cinematic-cyan mb-2 sm:mb-4 group-hover:scale-110 group-hover:bg-cinematic-cyan/20 transition-all duration-300">
                        <Icon name="fa-wave-square text-sm sm:text-xl" className="fa-wave-square text-sm sm:text-xl" />
                      </div>
                      <div className="text-[8px] sm:text-xs font-bold font-mono text-white tracking-[0.1em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 text-center">
                        Standard
                      </div>
                      <div className="text-[7px] sm:text-[9px] text-zinc-500 mb-2 sm:mb-4 font-mono uppercase tracking-widest text-center">
                        BASELINE
                      </div>
                      <div className="mt-auto text-[8px] sm:text-[10px] font-mono text-cinematic-gold bg-black/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/10 flex items-center gap-1 sm:gap-1.5">
                        <Icon name="fa-coins" className="fa-coins" /> 50 DC
                      </div>
                    </button>

                    {/* Elite Scanner */}
                    <button
                      onClick={() => handleScan("elite")}
                      disabled={isGlobalProcessing}
                      className="bg-zinc-950/80 border border-white/5 hover:border-purple-500/50 p-3 sm:p-6 rounded-xl sm:rounded-2xl transition-all group flex flex-col items-center disabled:opacity-50 relative ring-1 ring-white/5 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2 sm:mb-4 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <Icon name="fa-satellite text-sm sm:text-xl" className="fa-satellite text-sm sm:text-xl" />
                      </div>
                      <div className="text-[8px] sm:text-xs font-bold font-mono text-white tracking-[0.1em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 text-center">
                        Elite
                      </div>
                      <div className="text-[7px] sm:text-[9px] text-purple-400/70 mb-2 sm:mb-4 font-mono uppercase tracking-widest text-center">
                        HIGH YIELD
                      </div>
                      <div className="mt-auto text-[8px] sm:text-[10px] font-mono text-cinematic-gold bg-black/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/10 flex items-center gap-1 sm:gap-1.5">
                        <Icon name="fa-coins" className="fa-coins" /> 100 DC
                      </div>
                    </button>

                    {/* Nightmare Scanner */}
                    <button
                      onClick={() => handleScan("nightmare")}
                      disabled={isGlobalProcessing}
                      className="bg-zinc-950/80 border border-red-900/30 hover:border-red-500/80 p-3 sm:p-6 rounded-xl sm:rounded-2xl transition-all group flex flex-col items-center disabled:opacity-50 relative ring-1 ring-red-900/50 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.05)_10px,rgba(220,38,38,0.05)_20px)] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2 sm:mb-4 group-hover:scale-110 group-hover:bg-red-500/20 transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                        <Icon name="fa-biohazard text-sm sm:text-xl animate-pulse" className="fa-biohazard text-sm sm:text-xl animate-pulse" />
                      </div>
                      <div className="text-[8px] sm:text-xs font-bold font-mono text-red-400 tracking-[0.1em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 relative z-10 text-center">
                        Nightmare
                      </div>
                      <div className="text-[7px] sm:text-[9px] text-red-400/50 mb-2 sm:mb-4 font-mono uppercase tracking-widest text-center relative z-10">
                        MAX HAZARD
                      </div>
                      <div className="mt-auto text-[8px] sm:text-[10px] font-mono text-red-300 bg-red-950/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-900/50 flex items-center gap-1 sm:gap-1.5 relative z-10">
                        <Icon name="fa-coins" className="fa-coins" /> 200 DC
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div
              id="enemyGridContainer"
              className="w-full max-w-4xl bg-zinc-950/40 border border-red-900/20 rounded-3xl p-6 flex flex-col items-center gap-6 shadow-[0_0_40px_rgba(220,38,38,0.05)] relative  transition-all"
            >
              {!inBattle && opTab !== "world_boss" && (
                <button
                  onClick={cancelBoss}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white/50 hover:text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors z-20 shadow-lg border border-white/10"
                  title="Rút lui / Đổi mục tiêu"
                >
                  <Icon name="fa-xmark" className="fa-xmark" />
                </button>
              )}

              {/* Enemy Grid Layout */}
               <div className="grid grid-cols-3 gap-3 sm:gap-6 relative w-full pt-4 max-w-2xl">
                {enemySquad.map((e, idx) => e !== null ? (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="text-[7px] font-mono text-center uppercase mb-1 opacity-50">
                      {idx < 3 ? "VANGUARD" : "REARGUARD"}
                    </div>
                    {renderEnemySlot(e, idx)}
                  </div>
                ) : (
                  <div key={idx} className="flex flex-col items-center opacity-20">
                     <div className="text-[7px] font-mono text-center mb-1">EMPTY</div>
                     <div className="w-16 h-24 border border-dashed border-red-500/20 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Combat Dashboard Layout */}
        <div className="w-full flex flex-col lg:flex-row gap-6 relative z-20">
          {/* Left/Main Area: Combat Focus */}
          <div className="flex-1 flex flex-col gap-8">
            {/* Squad Area */}
            <div className="w-full relative py-8 px-6 bg-zinc-950/60 rounded-3xl border border-cinematic-cyan/20 ring-1 ring-cinematic-cyan/5 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
               {/* Decorative background lines */}
              <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-cinematic-cyan/10 to-transparent"></div>
              <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-cinematic-cyan/10 to-transparent"></div>
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cinematic-cyan/10 to-transparent"></div>

              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-8 relative z-10 gap-4">
                <div className="flex flex-col items-center sm:items-start gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-sm ${inBattle ? "bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" : "bg-cinematic-cyan shadow-[0_0_10px_#00f3ff]"}`}
                    ></div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-[0.2em] font-bold">
                      SQUAD ROSTER
                    </span>
                  </div>
                  {activeSynergies && activeSynergies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                      {activeSynergies.map((syn, idx) => (
                        <div
                          key={idx}
                          className="bg-cinematic-cyan/20 border border-cinematic-cyan/50 text-white text-[9px] px-2.5 py-1 rounded-sm flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,243,255,0.3)] font-mono uppercase tracking-widest"
                        >
                          <Icon name="fa-link text-cinematic-cyan" className="fa-link text-cinematic-cyan" /> {syn}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center sm:items-end bg-black/50 px-4 py-2 rounded-lg border border-white/5">
                   <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Combat Readiness</div>
                  <div className="text-sm font-mono font-bold text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] flex items-baseline gap-1">
                     <span className="text-xl">{displaySquadHp}</span> 
                     <span className="text-[10px] text-zinc-500">/ {squadHp}</span>
                  </div>
                </div>
              </div>

              <div
                id="squadGridContainer"
                className="grid grid-cols-3 gap-6 sm:gap-12 relative transition-all z-10 w-full max-w-3xl mx-auto"
              >
                <AnimatePresence>
                  {!isLiteMode && damagePopups
                    .filter((p) => p.target === "squad")
                    .map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: p.y || 0, scale: 0.5 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          y: [
                            p.y || 0,
                            -30 + (p.y || 0),
                            -60 + (p.y || 0),
                            -90 + (p.y || 0),
                          ],
                          scale: [0.5, 2.5, 2, 2],
                        }}
                        transition={{
                          duration: 2.0,
                          times: [0, 0.2, 0.7, 1],
                          ease: "easeOut",
                        }}
                        className={`absolute left-1/2 top-1/4 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-[200] font-black ${p.colorClass || "text-red-500"} text-6xl sm:text-7xl whitespace-nowrap ${isMobileEnv ? "drop-shadow-md" : "drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]"}`}
                        style={{ willChange: 'transform, opacity, scale', WebkitTextStroke: "2px black" }}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="fa-burst text-[0.5em] opacity-80" className="fa-burst text-[0.5em] opacity-80" />
                          <span>{p.isHeal ? '+' : '-'}{p.value}</span>
                        </div>
                        {p.isCrit && (
                          <div className="absolute -top-6 text-sm uppercase font-serif tracking-[0.3em] text-white">
                            Critical AoE
                          </div>
                        )}
                      </motion.div>
                    ))}
                </AnimatePresence>
                {/* Unified 2x3 Roster Grid */}
                {squad.map((card, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-3">
                    <div className={`text-[8px] font-mono uppercase tracking-widest ${idx < 3 ? 'text-cinematic-cyan' : 'text-purple-400'}`}>
                      {idx < 3 ? "VANGUARD" : "REARGUARD"}
                    </div>
                    {renderSquadSlot(card, idx)}
                  </div>
                ))}
              </div>
            </div>

            {/* Control Area */}
             <CombatControls
                inBattle={inBattle}
                boss={boss}
                isGlobalProcessing={isGlobalProcessing}
                squad={squad}
                opTab={opTab}
                worldBossState={worldBossState}
                combatSpeed={combatSpeed}
                timeUntilReset={timeUntilReset}
                handleAutoSetup={handleAutoSetup}
                setCombatSpeed={setCombatSpeed}
                executeBattle={executeBattle}
                onAlert={onAlert}
                updateQuestProgress={updateQuestProgress}
             />
          </div>

          {/* Right Area: Ops Log */}
          <CombatLogPanel logs={logs} onClear={() => setLogs([])} inBattle={inBattle} />
        </div>
      </div>

      <AnimatePresence>
        {combatResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              className="w-full max-w-2xl bg-zinc-950/90 border border-white/10 rounded-2xl p-5 sm:p-10 shadow-2xl flex flex-col items-center text-center relative max-h-[90vh] overflow-y-auto"
            >
              {combatResult.status === "victory" && (
                 <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
              )}
              {combatResult.status === "defeat" && (
                 <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
              )}
              {combatResult.status === "draw" && (
                 <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
              )}
              
              <h2 className={`text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-widest sm:tracking-[0.2em] mb-3 sm:mb-4 ${combatResult.status === "victory" ? "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" : combatResult.status === "defeat" ? "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]"}`}>{combatResult.title}</h2>
              <p className="text-zinc-400 font-serif text-sm sm:text-base max-w-lg mx-auto mb-6 sm:mb-8">{combatResult.message}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 w-full mb-6 sm:mb-8">
                 <div className="bg-black/50 border border-white/5 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1">
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Performance</span>
                    <span className={`text-2xl sm:text-3xl font-black font-mono ${combatResult.rating === "S" ? "text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]" : combatResult.rating === "A" ? "text-purple-400" : combatResult.rating === "B" ? "text-blue-400" : combatResult.rating === "C" ? "text-green-400" : "text-zinc-500"}`}>{combatResult.rating}</span>
                 </div>
                 <div className="bg-black/50 border border-white/5 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1">
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Turns</span>
                    <span className="text-xl sm:text-2xl font-bold text-white font-mono">{combatResult.turns}</span>
                 </div>
                 <div className="bg-black/50 border border-white/5 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-1 col-span-2 md:col-span-2">
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Status</span>
                    <span className={`text-base sm:text-lg font-bold font-mono tracking-widest uppercase ${combatResult.status === "victory" ? "text-green-400" : combatResult.status === "defeat" ? "text-red-500" : "text-yellow-500"}`}>{combatResult.status}</span>
                 </div>
              </div>
              
              {combatResult.rewards.length > 0 && (
                <div className="w-full bg-black/50 border border-white/5 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-left">
                  <h3 className="text-xs text-zinc-400 uppercase tracking-widest font-mono mb-4 text-center">Tài nguyên thu được</h3>
                  <div className="space-y-3">
                    {combatResult.rewards.map((r, i) => (
                       <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                          <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">{r.label}</span>
                          <span className={`text-sm font-bold font-mono ${r.colorClass || "text-white"}`}>{r.value}</span>
                       </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => setCombatResult(null)}
                className="px-12 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold tracking-[0.2em] uppercase rounded-xl border border-white/10 transition-colors shadow-lg active:scale-95"
              >
                Tiếp Tục
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
