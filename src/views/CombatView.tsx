import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Card, Boss, AppConfig } from "../types";
import {
  getFactionInfo,
  getComboStats,
  getSquadDodgeRate,
  calculateCombatStats,
  calculateUltimateStats,
  getElementAdvantage,
  getCardRole,
} from "../lib/gameLogic";
import { generateBossFromAI, generateImageFromAi } from "../services/ai";
import { ELEMENTS } from "../lib/constants";
import { motion, AnimatePresence } from "motion/react";
import {
  initAudio,
  playHitSound,
  playSkillSound,
  playGlassBreakSound,
  startCombatBgm,
  stopCombatBgm,
} from "../lib/audio";

interface DamagePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  isCrit: boolean;
  target:
    | "boss"
    | "squad"
    | "squad_0"
    | "squad_1"
    | "squad_2"
    | "squad_3"
    | "squad_4"
    | "squad_5";
  dmgType?: string;
  colorClass?: string;
}

const STATUS_ICONS: Record<string, { icon: string, color: string, label: string }> = {
  burn: { icon: "fa-fire", color: "text-orange-500", label: "Burn" },
  chill: { icon: "fa-snowflake", color: "text-blue-400", label: "Chill" },
  stun: { icon: "fa-cloud-bolt", color: "text-yellow-500", label: "Stun" },
  paralyze: { icon: "fa-bolt", color: "text-yellow-300", label: "Paralyze" },
  armor_break: { icon: "fa-shield-halved", color: "text-zinc-400", label: "Armor Break" },
  pierce: { icon: "fa-arrow-right-to-bracket", color: "text-red-400", label: "Pierce" }
};

interface Props {
  cards: Card[];
  setSquad: (sq: (Card | null)[]) => void;
  config: AppConfig;
  currency: number;
  level: number;
  modifyCurrency: (amount: number) => boolean;
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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const [localWorldBossSquad, setLocalWorldBossSquad] = useState<(Boss | null)[]>([null, null, null, null, null, null]);

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

  const [towerState, setTowerState] = useState<{floor: number}>(() => {
    const saved = localStorage.getItem("cineTower");
    return saved ? JSON.parse(saved) : { floor: 1 };
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
    localStorage.setItem("cineTower", JSON.stringify(towerState));
  }, [towerState]);

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
  const logContainerRef = useRef<HTMLDivElement>(null);
      const [displayBossHp, setDisplayBossHp] = useState(0);
  const [displayEnemyHps, setDisplayEnemyHps] = useState<number[]>([0,0,0,0,0,0]);
  const [displayEnemyManas, setDisplayEnemyManas] = useState<number[]>([0,0,0,0,0,0]);
  const [displaySquadHp, setDisplaySquadHp] = useState(0);
  const [displayCardHps, setDisplayCardHps] = useState<number[]>([0,0,0,0,0,0]);
  const [displayShields, setDisplayShields] = useState<number[]>([0,0,0,0,0,0]);
  const [displayCardManas, setDisplayCardManas] = useState<number[]>([0,0,0,0,0,0]);
  const [displayCardMaxManas, setDisplayCardMaxManas] = useState<number[]>([100,100,100,100,100,100]);
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

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1280);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1280);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [hitStop, setHitStop] = useState(false);
  const [glassBreak, setGlassBreak] = useState(false);

  const [showFullPassive, setShowFullPassive] = useState(false);

  let {
    hp: squadHp,
    cardMaxHp,
    atk: squadAtk,
    def: squadDef,
    res: squadRes,
    activeSynergies,
    synergyBonusAtk,
  } = getComboStats(squad);
  const dodgeRate = getSquadDodgeRate(squad);

  // Apply initial Leader Buff for display
  const hasLeader = squad.some((c) => c && c.id === leaderId);
  if (hasLeader) {
    squadHp = Math.floor(squadHp * 1.15);
    squadAtk = Math.floor(squadAtk * 1.15);
    cardMaxHp = cardMaxHp.map(hp => Math.floor(hp * 1.15));
  }

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

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

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
    if (!modifyCurrency(-cost)) return;
    setGlobalProcessing(true);
    try {
      const bossData = await generateBossFromAI(sHp, sAtk, difficulty, config);
      if (
        !["Tech", "Magic", "Mutant", "Light", "Dark"].includes(bossData.faction)
      ) {
        // Fallback or random picking logic if AI goes rogue
        const fallbacks = ["Tech", "Magic", "Mutant", "Light", "Dark"];
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
            <i className={`fa-solid ${facInfo.icon}`}></i> {facInfo.name}
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
    target:
      | "boss"
      | "squad"
      | "squad_0"
      | "squad_1"
      | "squad_2"
      | "squad_3"
      | "squad_4"
      | "squad_5",
    isCrit: boolean,
    dmgType?: string,
    colorClass?: string,
    yOffset: number = 0,
  ) => {
    playHitSound(isCrit);
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
    setDamagePopups((prev) => [
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
      },
    ]);
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
        [AI] Đang nội suy đội hình tối ưu...<br />
        &gt; Tham chiếu mục tiêu: {boss.faction} - {boss.element}<br />
        &gt; Cân bằng sinh tồn & hỏa lực...
      </span>
    ]);

    setTimeout(() => {
      const scoredCards = cards.map(card => {
         const stats = calculateCombatStats(card);
         let score = stats.atk * 1.5 + stats.hp; // Baseline score
         
         if (boss.element !== "Neutral" && card.element !== "Neutral") {
           const advantage = getElementAdvantage(card.element, boss.element);
           if (advantage > 1) score *= 1.5; // Big advantage
           if (advantage < 1) score *= 0.5;   // Disadvantage
         }
         
         // Priority for higher rank
         const ranks = ['N', 'R', 'SR', 'SSR', 'UR'];
         const rankBonus = (ranks.indexOf(card.cardClass) + 1) * 0.2;
         score *= (1 + rankBonus);

         const role = getCardRole(card);
         return { card, score, role };
      });

      scoredCards.sort((a,b) => b.score - a.score);

      const available = [...scoredCards];
      const newSquad: (Card | null)[] = [null, null, null, null, null, null];
      
      // Auto-assign Frontline (Index 0,1,2): Prefer Tankers
      for(let i=0; i<3; i++) {
         const tankerIdx = available.findIndex(c => c.role === 'Tanker');
         if (tankerIdx !== -1) {
            newSquad[i] = available[tankerIdx].card;
            available.splice(tankerIdx, 1);
         } else {
            // fallback to highest generic score
            if (available.length > 0) {
               newSquad[i] = available[0].card;
               available.splice(0, 1);
            }
         }
      }

      // Auto-assign Backline (Index 3,4,5): Prefer non-tankers
      for(let i=3; i<6; i++) {
         if (available.length > 0) {
            newSquad[i] = available[0].card;
            available.splice(0, 1);
         }
      }

      setSquad(newSquad);
      if (newSquad[0]) setLeaderId(newSquad[0].id);
      setGlobalProcessing(false);
      setLogs((prev) => [
        ...prev,
        <span key={`success-${Date.now()}`} className="text-green-400 font-mono text-[10px]">
          [AI] Thiết lập hoàn tất! Đội hình có tỷ lệ thắng cao nhất đã được triển khai.
        </span>
      ]);
      onAlert("AI Auto Deploy", "Hệ thống AI đã tự động đề xuất và sắp xếp đội hình có chỉ số sinh tồn và tương khắc nguyên tố tốt nhất để đối đầu với mục tiêu hiện tại!");
    }, 1500);
  };

  const handleEnterTowerFloor = async () => {
    const f = towerState.floor;
    const cost = 100 + Math.floor((f - 1) / 5) * 50; // Cost increases over time
    if (currency < cost) {
      return onAlert("Hệ Thống", `Cần ${cost} DC để mở khóa Tầng ${f}.`);
    }
    if (squadHp === 0) {
      return onAlert("Hệ Thống", "Cần triển khai đội hình trước khi leo tháp!");
    }
    
    modifyCurrency(-cost);
    setGlobalProcessing(true);
    
    try {
      const multiplier = Math.pow(1.1, f - 1);
      
      const isMajorMilestone = f % 10 === 0;
      const isMinorMilestone = f % 5 === 0;
      
      const bHp = Math.floor(12000 * multiplier);
      const bAtk = Math.floor(600 * multiplier);
      const bDef = Math.floor(150 * multiplier);
      const bRes = Math.floor(150 * multiplier);
      
      const baseEnemy = await generateBossFromAI(bHp, bAtk, isMajorMilestone ? "nightmare" : "elite", config);
      if (!["Tech", "Magic", "Mutant", "Light", "Dark"].includes(baseEnemy.faction)) {
        baseEnemy.faction = ["Tech", "Magic", "Mutant", "Light", "Dark"][Math.floor(Math.random() * 5)];
      }

      baseEnemy.defense = bDef;
      baseEnemy.resist = bRes;
      
      const numEnemies = isMajorMilestone ? 5 : isMinorMilestone ? 5 : Math.floor(Math.random() * 3) + 3; // 3 to 5 normal
      let availableIndices = [0, 1, 2, 3, 4, 5];
      for (let i = availableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
      }
      const selectedIndices = availableIndices.slice(0, numEnemies);
      
      const newSquad: (Boss | null)[] = [null, null, null, null, null, null];
      selectedIndices.forEach((idx, i) => {
        const isVanguard = idx < 3;
        const vTag = isVanguard ? "[VANGUARD] " : "";

        if (isMajorMilestone && i === 0) {
          // The true boss
          newSquad[idx] = {
            ...baseEnemy,
            name: `${vTag}ABYSS LORD: ${baseEnemy.name}`,
            hp: Math.floor(baseEnemy.hp * 2.5),
            attack: Math.floor(baseEnemy.attack * 1.5),
            threatLevel: "Nightmare"
          };
        } else {
           // Minions or Elites
           const isElite = isMinorMilestone || (isMajorMilestone && i > 0);
           newSquad[idx] = {
             ...baseEnemy,
             id: `${baseEnemy.id || Date.now()}-minion-${idx}`,
             name: `${vTag}${baseEnemy.name.split(' ')[0]} ${isElite ? 'Elite' : 'Minion'}`,
             hp: Math.floor(baseEnemy.hp * (isElite ? 1.0 : 0.6)),
             attack: Math.floor(baseEnemy.attack * (isElite ? 1.0 : 0.7)),
             threatLevel: isElite ? "Elite" : "Normal",
             description: `Thuộc hạ tầng ${f} của tháp Abyssal.`
           };
        }
      });
      
      setEnemySquad(newSquad);
      
      try {
        const dummyCard = {
          gender: "Unknown",
          universe: baseEnemy.universe,
          faction: baseEnemy.faction,
          hp: baseEnemy.hp,
          attack: baseEnemy.attack,
          threatLevel: isMajorMilestone ? "Nightmare" : "Elite",
          visualDescription: `Epic abyssal tower enemy. ${baseEnemy.visualDescription}`,
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

      const facInfo = getFactionInfo(baseEnemy.faction);
      setLogs((prev) => [...prev, <div key={Date.now()} className="text-purple-400/80 mb-2 border-b border-purple-900/30 pb-2">
          Abyssal Tower Tầng {f}: <strong>{numEnemies} Kẻ địch</strong> (Hệ:{" "}
          <span className={facInfo.color}>
            <i className={`fa-solid ${facInfo.icon}`}></i> {facInfo.name}
          </span>
          ).
        </div>,
      ].slice(-40));
    } catch (e) {
       console.error("AI Tower Gen Error:", e);
       onAlert("Lỗi AI", "Có lỗi xảy ra khi tạo kẻ địch tầng tháp. Vui lòng thử lại.");
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
          if (role === 'Support') { maxM -= 20; initM += 20; }
          else if (role === 'DPS') { maxM += 20; }
          
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
          <i className="fa-solid fa-crown text-cinematic-gold"></i> CHỈ HUY [{leaderCard.name}]: Kích hoạt Leader Core! Toàn đội tăng 15% Sinh Lực & Tấn Công.
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
    let enemyStatuses: { type: string, turnsLeft: number }[][] = [[],[],[],[],[],[]];
    let squadStatuses: { type: string, turnsLeft: number }[][] = [[],[],[],[],[],[]];
    let squadShields: number[] = [0, 0, 0, 0, 0, 0];
    setDisplayShields([...squadShields]);

    tacticalQueue.current = [];

    const getTotalEnemyHp = () => currentEnemyHps.reduce((a,b) => a+b, 0);

    while (currentSquadHp > 0 && getTotalEnemyHp() > 0 && turn <= 15) {
      await delay(400);

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

      let aliveSquad = squad.map((c, i) => c && currentCardHps[i] > 0 ? i : -1).filter(i => i !== -1);
      let aliveEnemies = enemySquad.map((e, i) => e && currentEnemyHps[i] > 0 ? i : -1).filter(i => i !== -1);
      
      if (aliveSquad.length === 0 || aliveEnemies.length === 0) break;

      // ---------------- SQUAD TURN PHASE (All alive members attack) ----------------
      for (const realIdx of aliveSquad) {
        if (currentCardHps[realIdx] <= 0 || getTotalEnemyHp() <= 0) continue; // Check if died before attacking
        
        const attackerCard = squad[realIdx]!;
        let skipTurn = false;

        // Status Processing for this Squad member
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
                 <span><i className="fa-solid fa-cloud-bolt text-yellow-500"></i> {attackerCard.name} bị {status.type === "stun" ? "CHOÁNG" : "TÊ LIỆT"} và không thể tấn công!</span>,
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
               <span><i className="fa-solid fa-skull text-red-600"></i> {attackerCard.name} đã gục ngã vì hiệu ứng trạng thái!</span>,
               "text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded text-[11px]"
             );
          }
          continue;
        }

        setActiveAttackerIdx(realIdx);
        await delay(200);

        // Target selection (Frontline Priority)
        let currentAliveEnemies = enemySquad.map((e, i) => e && currentEnemyHps[i] > 0 ? i : -1).filter(i => i !== -1);
        if (currentAliveEnemies.length === 0) break;
        let aliveEnemiesFront = currentAliveEnemies.filter(i => i < 3);
        let aliveEnemiesBack = currentAliveEnemies.filter(i => i >= 3);
        
        // Is SSR/UR AOE Skill? Wait, let's only do AOE on Ultimates for SSR/UR, or basic attacks?
        // Let's do it on Ultimates.
        
        let targetEnIdxs: number[] = [];
        
        // Calc multiplier versus target
        let baseAtk = cardAtks[realIdx];
        
        let isCrit = false;
        let critLog: React.ReactNode = "";
        let isAoe = false;

        // Mana calculation
        currentCardManas[realIdx] = Math.min(targetMaxManas[realIdx], currentCardManas[realIdx] + 25);
        setDisplayCardManas([...currentCardManas]);

        if (currentCardManas[realIdx] >= targetMaxManas[realIdx]) {
          currentCardManas[realIdx] = 0; 
          setDisplayCardManas([...currentCardManas]);
          isCrit = true;
          const ultStats = calculateUltimateStats(attackerCard);
          const baseMul = ultStats.power ? ultStats.power / 100 : 1.5;
          const ultMul = attackerCard.ultimateLevel ? baseMul + attackerCard.ultimateLevel * 0.15 : (baseMul === 1.5 ? 2.0 : baseMul);
          baseAtk = Math.floor(baseAtk * ultMul);
          const ultiName = attackerCard.ultimateMove || "Đòn Đánh Chí Mạng";

          playSkillSound();
          setActiveCutInCard(attackerCard);
          await delay(1800);
          setActiveCutInCard(null);
          await delay(200);

          if (attackerCard.cardClass === "UR" || attackerCard.cardClass === "SSR") {
            isAoe = true;
            critLog = (
              <>
                <div className="text-cinematic-cyan font-bold bg-cinematic-cyan/10 border border-cinematic-cyan/30 px-2 py-1 rounded inline-block mb-1 shadow-[0_0_10px_rgba(0,243,255,0.3)]">
                  <i className="fa-solid fa-atom"></i> {attackerCard.name} thi triển AOE ULTIMATE [{ultiName}] <span className="opacity-50 text-[10px]">Lv.${attackerCard.ultimateLevel || 1}</span> <span className="text-[9px] text-white/40">(${ultMul.toFixed(1)}x Dmg to All)</span>
                </div>
                <br />
              </>
            );
            targetEnIdxs = currentAliveEnemies; // Hit all alive enemies
          } else {
            critLog = (
              <>
                <div className="text-cinematic-cyan font-bold bg-cinematic-cyan/10 border border-cinematic-cyan/30 px-2 py-1 rounded inline-block mb-1 shadow-[0_0_10px_rgba(0,243,255,0.3)]">
                  <i className="fa-solid fa-bolt"></i> {attackerCard.name} thi triển [{ultiName}] <span className="opacity-50 text-[10px]">Lv.${attackerCard.ultimateLevel || 1}</span> <span className="text-[9px] text-white/40">(${ultMul.toFixed(1)}x Dmg)</span>
                </div>
                <br />
              </>
            );
             if (aliveEnemiesFront.length > 0) {
               targetEnIdxs = [aliveEnemiesFront[Math.floor(Math.random() * aliveEnemiesFront.length)]];
             } else {
               targetEnIdxs = [aliveEnemiesBack[Math.floor(Math.random() * aliveEnemiesBack.length)]];
             }
          }
        } else {
           if (aliveEnemiesFront.length > 0) {
               // 80% hit front
               if (Math.random() > 0.2) {
                   targetEnIdxs = [aliveEnemiesFront[Math.floor(Math.random() * aliveEnemiesFront.length)]];
               } else if (aliveEnemiesBack.length > 0) {
                   targetEnIdxs = [aliveEnemiesBack[Math.floor(Math.random() * aliveEnemiesBack.length)]];
               } else {
                   targetEnIdxs = [aliveEnemiesFront[Math.floor(Math.random() * aliveEnemiesFront.length)]];
               }
           } else {
               targetEnIdxs = [aliveEnemiesBack[Math.floor(Math.random() * aliveEnemiesBack.length)]];
           }
        }

        let triggerStatusLog: React.ReactNode = "";
        let roleStatusLog: React.ReactNode = "";
        // Process role actions
        const role = getCardRole(attackerCard);
        if (role === "Tanker") {
           const shieldAmt = Math.floor(cardMaxHp[realIdx] * 0.15); // 15% SHIELD
           squadShields[realIdx] += shieldAmt;
           setDisplayShields([...squadShields]);
           roleStatusLog = <span className="ml-1 text-[9px] text-zinc-300 font-mono bg-zinc-800 px-1 rounded border border-zinc-600">🛡️ +${shieldAmt} Khiên</span>;
        } else if (role === "Support") {
           const healAmt = Math.floor(cardMaxHp[realIdx] * 0.05);
           currentCardHps = currentCardHps.map((hp, i) => squad[i] && hp > 0 ? Math.min(cardMaxHp[i], hp + healAmt) : hp);
           setDisplayCardHps([...currentCardHps]);
           roleStatusLog = <span className="ml-1 text-[9px] text-green-400 font-mono bg-green-900/30 px-1 rounded border border-green-500/50">💚 +${healAmt} HP Đoàn</span>;
        }

        const attackerIsPhysical = ["Tech", "Mutant"].includes(attackerCard.faction);
        const dmgType = attackerIsPhysical ? "Physical" : "Magic";
        const colorClass = attackerIsPhysical ? "text-orange-400" : "text-purple-400";
        triggerShake("boss");

        let logEntryDetails: React.ReactNode[] = [];

        // Apply hits
        for (const targetIdx of targetEnIdxs) {
           const targetEnemy = enemySquad[targetIdx]!;
           let currentAtk = baseAtk;
           let atkMod = 1;
           const cardFac = getFactionInfo(attackerCard.faction);

           if ((cardFac.id === "Light" && targetEnemy.faction === "Dark") || (cardFac.id === "Dark" && targetEnemy.faction === "Light")) {
             atkMod *= 1.3;
           } else if (cardFac.strongAgainst === targetEnemy.faction) {
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

           if (isAoe) currentAtk = Math.floor(currentAtk * 0.6); // AOE scaling 

           addDamagePopup(currentAtk, `enemy-${targetIdx}` as any, isCrit, dmgType, colorClass, 0);

           if (elementalDmgValue > 0) {
             setTimeout(() => {
               addDamagePopup(elementalDmgValue, `enemy-${targetIdx}` as any, false, elementName, "text-cyan-400", 35);
             }, 150);
           }

           currentEnemyHps[targetIdx] = Math.max(0, currentEnemyHps[targetIdx] - (currentAtk + elementalDmgValue));
           
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
        if (isCrit) { await triggerHitStop(); }

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

        await delay(500); // delay per attack to show animation clearly
        setActiveAttackerIdx(null);
      }
      
      if (getTotalEnemyHp() <= 0) break;

      // ---------------- ENEMY TURN PHASE (All alive enemies attack) ----------------
      let aliveEnemiesForEnemyTurn = enemySquad.map((e, i) => e && currentEnemyHps[i] > 0 ? i : -1).filter(i => i !== -1);
      
      for (const attackerEnIdx of aliveEnemiesForEnemyTurn) {
        if (currentEnemyHps[attackerEnIdx] <= 0 || currentSquadHp <= 0) continue;

        const activeEn = enemySquad[attackerEnIdx]!;
        let skipEnTurn = false;
        let enAtkObj = activeEn.attack;

        // Status Processing for this Enemy
        let keptStatuses: typeof enemyStatuses[0] = [];
        for (const status of enemyStatuses[attackerEnIdx]) {
          if (status.turnsLeft <= 0) continue;
          
          if (status.type === "burn") {
            const burnDmg = Math.floor(actualSquadAtk * 0.05); // Reduced because there may be many enemies
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

        if (currentEnemyHps[attackerEnIdx] <= 0) continue;

        if (!skipEnTurn) {
          setIsBossAttacking(true);
          setActiveAttackerIdx(`enemy-${attackerEnIdx}`);
          await delay(300);

          if (Math.random() * 100 < dodgeRate) {
            addLog(
              <span>[Lượt ${turn}] ⚡ <strong className="tracking-widest bg-white/10 px-2 rounded">[NÉ TRÁNH]</strong> Đội hình né được đòn của {activeEn.name}.</span>,
              "text-cinematic-gold"
            );
          } else {
            // Boss ultimate mana processing
            currentEnemyManas[attackerEnIdx] = Math.min(100, currentEnemyManas[attackerEnIdx] + 25);
            setDisplayEnemyManas([...currentEnemyManas]);

            let bossSkillLog: React.ReactNode = "";
            let isBossCrit = false;
            let ultMul = 1.0;
            if (currentEnemyManas[attackerEnIdx] >= 100) {
                currentEnemyManas[attackerEnIdx] = 0;
                setDisplayEnemyManas([...currentEnemyManas]);
                isBossCrit = true;
                ultMul = 2.0;

                playSkillSound();
                bossSkillLog = (
                   <>
                      <div className="text-red-500 font-bold bg-red-900/30 border border-red-500/50 px-2 py-1 rounded inline-block mb-1 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                         <i className="fa-solid fa-burst"></i> {activeEn.name} thi triển ULTIMATE! <span className="opacity-80 text-[10px]">(x2 DMG)</span>
                      </div>
                      <br />
                   </>
                );
                await delay(500);
            }

            const bossAttackIsPhysical = ["Tech", "Mutant"].includes(activeEn.faction);
            const squadDefenseValue = bossAttackIsPhysical ? squadDef : squadRes;
            const reductionRate = squadDefenseValue / (squadDefenseValue + 1000);

            // Calculate Target inside the squad (Random instead of the whole team, prioritize frontline if physical, random if magic)
            let targetIdx = -1;
            const aliveFrontline = [0, 1, 2].filter((i) => squad[i] !== null && currentCardHps[i] > 0);
            const aliveBackline = [3, 4, 5].filter((i) => squad[i] !== null && currentCardHps[i] > 0);
            
            if (bossAttackIsPhysical) {
               if (aliveFrontline.length > 0) targetIdx = aliveFrontline[Math.floor(Math.random() * aliveFrontline.length)];
               else if (aliveBackline.length > 0) targetIdx = aliveBackline[Math.floor(Math.random() * aliveBackline.length)];
            } else {
               // Magic hits randomly across everyone
               const allAlive = [...aliveFrontline, ...aliveBackline];
               if (allAlive.length > 0) targetIdx = allAlive[Math.floor(Math.random() * allAlive.length)];
            }

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

                // Enemy triggers status on squad member
                if (activeEn.element && activeEn.element !== "Neutral") {
                   const triggerChance = 15; // Lower for balance
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
                  <span><i className="fa-solid fa-skull text-red-600"></i> Báo Động: {targetCardName} đã ngã xuống!</span>,
                  "text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded text-[11px]"
               );
            }
          }
          setIsBossAttacking(false);
          setActiveAttackerIdx(null);
          await delay(300); // Shorter delay between enemy attacks
        }
      }

      turn++;
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
        const randMat = ["TechNode", "ManaCrystal", "MutantCell", "LightCore", "DarkEssence"][Math.floor(Math.random()*5)];
        modifyInventory(0, 0, { [randMat]: matReward });
        addLog(`>>> CHIẾN THẮNG WORLD BOSS LEVEL ${worldBossState.level}! Nhận lượng lớn phần thưởng! <<<`, "font-bold text-lg text-green-400 my-4 uppercase text-center");
        onAlert(
            "World Boss Tiêu Diệt!",
            `<div class="space-y-4">
                <div class="text-white text-sm font-serif">Mối đe dọa vũ trụ cấp ${worldBossState.level} đã bị trừ khử! Chiến dịch thành công.</div>
                <div class="text-xs bg-black/60 p-4 rounded-xl border border-cinematic-gold/30 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-zinc-400 uppercase tracking-widest font-mono text-[10px]">Tiền Thưởng</span>
                        <span class="text-cinematic-gold font-bold text-sm">+${dcReward} DC</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-zinc-400 uppercase tracking-widest font-mono text-[10px]">Tài Nguyên</span>
                        <span class="text-purple-400 font-bold text-sm">+${matReward} ${randMat}</span>
                    </div>
                </div>
            </div>`
        );
      } else {
        const newBoss = { ...boss, hp: currentEnemyHps[0] };
        setWorldBossState((p: any) => ({ ...p, boss: newBoss }));
        modifyCurrency(50 * worldBossState.level);
        if (turn > 15) {
            addLog(`>>> HẾT THỜI GIAN TÁC CHIẾN (15 ROUNDS) <<<`, "font-bold text-yellow-500 my-2 uppercase text-center");
            addLog(`Hệ thống rút lui khẩn cấp. Boss còn lại ${currentEnemyHps[0]} HP.`, "text-cinematic-cyan");
            onAlert("Hết Thời Gian", "Trận đấu đã kéo dài quá 15 vòng. Hệ thống tự động kích hoạt giao thức rút lui. Sát thương lên Boss đã được ghi nhận.");
        } else {
            addLog(`>>> ĐỘI HÌNH BỊ HẠ GỤC <<<`, "font-bold text-red-500 my-2 uppercase text-center");
            addLog(`World boss còn lại ${currentEnemyHps[0]} HP. Đã lưu trạng thái!`, "text-cinematic-cyan");
        }
      }
    } else if (getTotalEnemyHp() <= 0) {
      if (opTab === "battlefield") {
        const f = towerState.floor;
        const expGained = Math.floor(10 * Math.pow(1.1, f - 1));
        const dcReward = Math.floor(50 * Math.pow(1.1, f - 1));
        
        let dcBonus = 0;
        let extraMatHTML = "";
        const matDrops: Record<string, number> = {};
        
        if (f % 10 === 0) {
          dcBonus = dcReward * 5;
          const randMat = ["TechNode", "ManaCrystal", "MutantCell", "LightCore", "DarkEssence"][Math.floor(Math.random() * 5)];
          const matAmt = f * 2;
          matDrops[randMat] = matAmt;
          extraMatHTML = `<div class="flex items-center justify-between"><span class="text-zinc-400 uppercase tracking-widest font-mono text-[10px]">Tài Nguyên</span><span class="text-purple-400 font-bold text-sm">+${matAmt} ${randMat}</span></div>`;
        } else if (f % 5 === 0) {
          dcBonus = dcReward * 2;
        }
        
        const totalDc = dcReward + dcBonus;
        modifyCurrency(totalDc);
        gainExperience(expGained);
        modifyInventory(0, 0, matDrops);
        
        setTowerState(p => ({ ...p, floor: p.floor + 1 }));
        
        addLog(
          `>>> VƯỢT THÁP TẦNG ${f} THÀNH CÔNG! <<<`,
          "text-green-400 font-bold mt-2 border-t border-green-900/50 pt-2",
        );
        onAlert(
          `Ghi Nhận Chinh Phục Tầng ${f}`,
          `<div class="space-y-4">
              <div class="text-white text-sm font-serif">Mục tiêu Abyssal bị triệt tiêu. Quân đội đang tiến lên tầng tiếp theo!</div>
              <div class="text-xs bg-black/60 p-4 rounded-xl border border-cinematic-gold/30 flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                      <span class="text-zinc-400 uppercase tracking-widest font-mono text-[10px]">Tiền Thưởng</span>
                      <span class="text-cinematic-gold font-bold text-sm">+${totalDc} DC</span>
                  </div>
                  <div class="flex items-center justify-between">
                      <span class="text-zinc-400 uppercase tracking-widest font-mono text-[10px]">Kinh Nghiệm</span>
                      <span class="text-blue-400 font-bold text-sm">+${expGained} EXP</span>
                  </div>
                  ${extraMatHTML}
              </div>
          </div>`
        );
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

        const rewardLogMsgs = [
          `<span class="text-green-400 font-bold">Nhận +${boss.reward} DC</span>`,
          `<span class="text-blue-400 font-bold">Nhận +${expGained} EXP</span>`,
        ];
        if (baseDrop > 0)
          rewardLogMsgs.push(
            `<span class="text-cinematic-cyan font-bold">+${baseDrop} Vé Tiêu Chuẩn</span>`,
          );
        if (eliteDrop > 0)
          rewardLogMsgs.push(
            `<span class="text-purple-400 font-bold">+${eliteDrop} Vé Đặc Quyền</span>`,
          );

        addLog(
          ">>> CHIẾN THẮNG! <<<",
          "text-green-400 font-bold mt-2 border-t border-green-900/50 pt-2",
        );
        modifyCurrency(boss.reward);
        gainExperience(expGained);
        updateQuestProgress("boss", 1);

        const matDrops: Record<string, number> = {};
        if (boss.drops && boss.drops.length > 0) {
          boss.drops.forEach((d) => {
            matDrops[d.item] = d.amount;
            rewardLogMsgs.push(
              `<span class="text-cinematic-gold font-bold">+${d.amount} ${d.item}</span>`,
            );
          });
        }

        modifyInventory(baseDrop, eliteDrop, matDrops);

        onAlert("Chiến dịch xuất sắc!", rewardLogMsgs.join("<br>"));
        setEnemySquad([null, null, null, null, null, null]);
      }
    } else {
      if (turn > 15) {
          addLog(">>> HÒA - VƯỢT QUÁ GIỚI HẠN 15 VÒNG <<<", "font-bold text-yellow-500 my-2 uppercase text-center");
          onAlert("Thất Bại (Hòa)", "Quá 15 vòng chưa tiêu diệt được đối phương, bạn bị xử thua!");
      } else {
          addLog(
            ">>> THẤT BẠI. Rút lui an toàn... <<<",
            "text-red-500 font-bold mt-2 border-t border-red-900/50 pt-2",
          );
          onAlert(
            "Chiến báo",
            "Thất bại (Thẻ không bị mất). Lịch sử đã được lưu vào Chiến báo.<br>Hãy thay đổi Tộc Hệ để khắc chế Boss và thử lại!",
          );
      }
    }

    stopCombatBgm();
    setInBattle(false);
    setGlobalProcessing(false);
    setActiveAttackerIdx(null);
    setIsBossAttacking(false);
  };

  const renderEnemySlot = (bossData: Boss | null, index: number) => {
    if (!bossData) {
      return (
        <div
          key={`empty-enemy-${index}`}
          className="w-24 h-36 lg:w-44 lg:h-60 rounded-xl flex flex-col items-center justify-center relative group bg-black/40 border border-white/5 overflow-hidden opacity-50 transition-all duration-300"
        >
        </div>
      );
    }
    const facInfo = getFactionInfo(bossData.faction);
    const isAttacking = activeAttackerIdx === `enemy-${index}`;
    const hp = typeof displayEnemyHps[index] === 'number' ? displayEnemyHps[index] : bossData.hp;
    const mana = typeof displayEnemyManas[index] === 'number' ? displayEnemyManas[index] : 0;
    const maxHp = bossData.hp;
    const maxMana = 100;
    const isDead = inBattle && hp <= 0;

    return (
      <motion.div
        key={`enemy-${bossData.id}-${index}`}
        animate={
          isDead ? { filter: 'grayscale(100%) brightness(0.4)', y:0, scale:0.95 } :
          isAttacking
            ? {
                x: isDesktop ? -150 : 0,
                y: isDesktop ? 0 : 150,
                scale: [1, 1.1, 1],
                boxShadow: "0 0 50px rgba(220, 38, 38, 0.6)",
                borderColor: "rgba(220, 38, 38, 0.8)",
                zIndex: 100,
              }
            : {
                  y: 0,
                  scale: 1,
                  x: 0,
                  rotate: 0,
                  boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                  borderColor: "rgba(239, 68, 68, 0.2)",
                  zIndex: 10,
                }
        }
        transition={
          isAttacking
            ? { duration: 0.5, times: [0, 0.15, 1], ease: ["backOut", "backIn"] }
            : { type: "spring", stiffness: 400, damping: 25 }
        }
        className={`w-24 h-36 lg:w-44 lg:h-60 rounded-xl flex flex-col relative group bg-black/40 border transition-all duration-300 overflow-hidden shadow-lg ${isAttacking ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "border-white/10"}`}
      >
        <AnimatePresence>
          {damagePopups
            .filter((p) => p.target === `enemy-${index}`)
            .map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: p.y || 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [
                    p.y || 0,
                    -50 + (p.y || 0),
                    -100 + (p.y || 0),
                    -150 + (p.y || 0),
                  ],
                  scale: p.isCrit ? [0.5, 1.8, 1.5, 1.5] : [0.5, 1.4, 1.2, 1.2],
                }}
                transition={{
                  duration: 1.5,
                  times: [0, 0.2, 0.7, 1],
                  ease: "easeOut",
                }}
                className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-[110] font-black ${p.isCrit ? "text-cinematic-cyan  text-4xl sm:text-5xl" : `${p.colorClass || "text-orange-500"} text-3xl sm:text-4xl `} whitespace-nowrap`}
                style={{ willChange: 'transform, opacity, scale', WebkitTextStroke: "1.5px black",
                  textShadow: "0 4px 10px rgba(0,0,0,0.8)",
                }}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  {p.dmgType === "Physical" && (
                    <i className="fa-solid fa-burst text-[0.5em] opacity-80"></i>
                  )}
                  {p.dmgType === "Magic" && (
                    <i className="fa-solid fa-wand-magic-sparkles text-[0.5em] opacity-80"></i>
                  )}
                  {p.dmgType === "Fire" && (
                    <i className="fa-solid fa-fire text-[0.5em] opacity-80"></i>
                  )}
                  {p.dmgType === "Water" && (
                    <i className="fa-solid fa-droplet text-[0.5em] opacity-80"></i>
                  )}
                  {p.dmgType === "Lightning" && (
                    <i className="fa-solid fa-bolt text-[0.5em] opacity-80"></i>
                  )}
                  {p.dmgType === "Earth" && (
                    <i className="fa-solid fa-leaf text-[0.5em] opacity-80"></i>
                  )}
                  {p.dmgType === "Wind" && (
                    <i className="fa-solid fa-wind text-[0.5em] opacity-80"></i>
                  )}
                  {p.dmgType === "Tech" && (
                    <i className="fa-solid fa-crosshairs text-[0.5em] opacity-80"></i>
                  )}
                  <span>-{p.value}</span>
                </div>
                {p.isCrit && (
                  <div className="absolute -top-4 text-[10px] uppercase font-serif tracking-[0.2em] text-white">
                    Critical
                  </div>
                )}
              </motion.div>
            ))}
        </AnimatePresence>
        <img
          src={bossData.imageUrl}
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
          crossOrigin="anonymous"
          alt={bossData.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=300&auto=format&fit=crop";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-black/40 to-transparent"></div>

        {/* Status Effects Icons */}
        <div className="absolute top-1 left-1 z-30 flex flex-wrap gap-1 max-w-[60%]">
          {displayEnemyStatuses[index].map((status, sIdx) => {
            const sconfig = STATUS_ICONS[status.type];
            if (!sconfig) return null;
            return (
              <motion.div
                key={`${status.type}-${sIdx}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 bg-black/80 rounded px-1 py-0.5 border border-white/10 shadow-lg backdrop-blur-sm"
                title={`${sconfig.label}: ${status.turnsLeft} turns`}
              >
                <i className={`fa-solid ${sconfig.icon} ${sconfig.color} text-[8px]`}></i>
                <span className="text-[7px] font-bold text-white font-mono leading-none">{status.turnsLeft}</span>
              </motion.div>
            );
          })}
        </div>

        {isAttacking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.4 }}
            className="absolute inset-0 bg-red-500/20 blur-xl pointer-events-none"
          ></motion.div>
        )}
        
        {isDead && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none">
             <i className="fa-solid fa-skull text-3xl text-red-500  opacity-80"></i>
             <span className="text-red-500 font-bold text-[10px] font-mono bg-black/60 px-1 rounded uppercase tracking-wider mt-1 border border-red-500/30">Destroyed</span>
          </div>
        )}
        {/* Elemental Magic Ring */}
        {bossData.element && (
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className={`absolute -inset-4 rounded-full border border-dashed opacity-30 pointer-events-none z-[-1] ${(ELEMENTS as any)[bossData.element]?.color?.replace("text-", "border-") || "border-white/20"}`}
            style={{
              borderWidth: "2px",
              boxShadow: `0 0 10px ${(ELEMENTS as any)[bossData.element]?.color ? "currentColor" : "rgba(255,255,255,0)"}`,
            }}
          />
        )}
        <div className="absolute top-1 right-1 z-20 flex flex-row gap-1 items-center">
          {bossData.element && (
            <div
              className={`text-[8px] color-[${ELEMENTS[bossData.element as keyof typeof ELEMENTS]?.color}] bg-black/60 w-4 h-4 rounded-full flex items-center justify-center border border-white/10`}
              title={bossData.element}
            >
              <i
                className={`fa-solid ${ELEMENTS[bossData.element as keyof typeof ELEMENTS]?.icon}`}
              ></i>
            </div>
          )}
          <div
            className={`text-[9px] ${facInfo.color} bg-black/60 w-5 h-5 rounded-full flex items-center justify-center border border-white/10`}
            title={facInfo.name}
          >
            <i className={`fa-solid ${facInfo.icon}`}></i>
          </div>
        </div>
        <div className="absolute top-1 left-1 z-20">
            <div className="text-[8px] font-black text-white bg-red-600/80 px-1 py-0.5 rounded flex items-center font-mono">
              LV{bossData.threatLevel}
            </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full p-1.5 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-red-200 truncate drop-shadow-md flex items-center justify-between">
            <span>{bossData.name}</span>
          </div>
          <div className="flex flex-col w-full gap-1">
            <div className="text-[8px] text-red-400 font-mono w-full">
              <div className="flex justify-between w-full mb-[1px]">
                  <span><i className="fa-solid fa-heart"></i> {hp}</span>
              </div>
              <div className="h-[3px] bg-red-900/50 w-full rounded-full overflow-hidden relative">
                  <div className="h-full bg-red-50 transition-all duration-300 absolute left-0 top-0 bottom-0 shadow-[0_0_5px_#fca5a5]" style={{ width: `${(hp / maxHp) * 100}%` }}></div>
              </div>
              <div className="flex justify-between w-full mt-1 mb-[1px]">
                  <span className="text-[7px] text-blue-300"><i className="fa-solid fa-bolt"></i> {mana}</span>
              </div>
              <div className="h-[2px] bg-white/10 w-full rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${Math.min(100, (mana / maxMana) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSquadSlot = (card: Card | null, index: number) => {
    if (!card) {
      return (
        <div
          key={`empty-${index}`}
          onClick={() => !inBattle && onOpenSquadSelector(index)}
          className="w-24 h-36 lg:w-44 lg:h-60 rounded-xl flex flex-col items-center justify-center cursor-pointer relative group bg-black/40 border border-white/10 hover:border-cinematic-cyan/50 transition-all duration-300 overflow-hidden shadow-lg"
        >
          <i className="fa-solid fa-plus text-xl text-white/20 mb-1"></i>
          <p className="text-[6px] lg:text-[8px] text-cinematic-muted tracking-widest uppercase font-mono">
            Deploy Unit
          </p>
        </div>
      );
    }
    const stats = calculateCombatStats(card);
    const facInfo = getFactionInfo(card.faction);
    const isAttacking = activeAttackerIdx === index;
    const isDead = inBattle && displayCardHps[index] <= 0;
    return (
      <motion.div
        key={card.id || index}
        animate={
          isDead ? { filter: 'grayscale(100%) brightness(0.4)', y:0, scale:0.95 } :
          isAttacking
            ? {
                x: isDesktop ? 150 : 0,
                y: isDesktop ? 0 : -350,
                scale: [1, 1.15, 1],
                boxShadow: "0 0 50px rgba(0, 243, 255, 0.6)",
                borderColor: "rgba(0, 243, 255, 0.8)",
                zIndex: 100,
              }
            : {
                  y: 0,
                  scale: 1,
                  x: 0,
                  rotate: 0,
                  boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  zIndex: 10,
                }
        }
        transition={
          isAttacking
            ? { duration: 0.5, times: [0, 0.15, 1], ease: ["backOut", "backIn"] }
            : { type: "spring", stiffness: 400, damping: 25 }
        }
        onClick={() => !inBattle && onOpenSquadSelector(index)}
        className={`w-24 h-36 lg:w-44 lg:h-60 rounded-xl flex flex-col relative group bg-black/40 border transition-all duration-300 overflow-hidden shadow-lg ${isAttacking ? "border-cinematic-cyan shadow-[0_0_20px_rgba(0,243,255,0.4)]" : "border-white/10"}`}
      >
        <AnimatePresence>
          {damagePopups
            .filter((p) => p.target === `squad_${index}`)
            .map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: p.y || 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [
                    p.y || 0,
                    -50 + (p.y || 0),
                    -100 + (p.y || 0),
                    -150 + (p.y || 0),
                  ],
                  scale: [0.5, 1.4, 1.2, 1.2],
                }}
                transition={{
                  duration: 1.5,
                  times: [0, 0.2, 0.7, 1],
                  ease: "easeOut",
                }}
                className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-[110] font-black ${p.colorClass || "text-red-500"} text-3xl sm:text-4xl  whitespace-nowrap`}
                style={{ willChange: 'transform, opacity, scale', WebkitTextStroke: "1.5px black",
                  textShadow: "0 4px 10px rgba(0,0,0,0.8)",
                }}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  {p.dmgType === "Physical" && (
                    <i className="fa-solid fa-burst text-[0.5em] opacity-80"></i>
                  )}
                  {p.dmgType === "Magic" && (
                    <i className="fa-solid fa-wand-magic-sparkles text-[0.5em] opacity-80"></i>
                  )}
                  <span>-{p.value}</span>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
        <img
          src={card.imageUrl}
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
          crossOrigin="anonymous"
          alt={card.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

        {/* Status Effects Icons */}
        <div className="absolute top-1 left-1 z-30 flex flex-wrap gap-1 max-w-[60%]">
          {displaySquadStatuses[index].map((status, sIdx) => {
            const sconfig = STATUS_ICONS[status.type];
            if (!sconfig) return null;
            return (
              <motion.div
                key={`${status.type}-${sIdx}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 bg-black/80 rounded px-1 py-0.5 border border-white/10 shadow-lg backdrop-blur-sm"
                title={`${sconfig.label}: ${status.turnsLeft} turns`}
              >
                <i className={`fa-solid ${sconfig.icon} ${sconfig.color} text-[8px]`}></i>
                <span className="text-[7px] font-bold text-white font-mono leading-none">{status.turnsLeft}</span>
              </motion.div>
            );
          })}
        </div>

        {isAttacking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.4 }}
            className="absolute inset-0 bg-cinematic-cyan/20 blur-xl pointer-events-none"
          ></motion.div>
        )}
        
        {isDead && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none">
             <i className="fa-solid fa-skull text-3xl text-red-500  opacity-80"></i>
             <span className="text-red-500 font-bold text-[10px] font-mono bg-black/60 px-1 rounded uppercase tracking-wider mt-1 border border-red-500/30">Destroyed</span>
          </div>
        )}
        {/* Elemental Magic Ring */}
        {card.element && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className={`absolute -inset-4 rounded-full border border-dashed opacity-30 pointer-events-none z-[-1] ${(ELEMENTS as any)[card.element]?.color?.replace("text-", "border-") || "border-white/20"}`}
            style={{
              borderWidth: "2px",
              boxShadow: `0 0 10px ${(ELEMENTS as any)[card.element]?.color ? "currentColor" : "rgba(255,255,255,0)"}`,
            }}
          />
        )}
        <div className="absolute top-1 right-1 z-20 flex flex-row gap-1 items-center">
          {card.element && (
            <div
              className={`text-[8px] color-[${ELEMENTS[card.element as keyof typeof ELEMENTS]?.color}] bg-black/60 w-4 h-4 rounded-full flex items-center justify-center border border-white/10`}
              title={card.element}
            >
              <i
                className={`fa-solid ${ELEMENTS[card.element as keyof typeof ELEMENTS]?.icon}`}
              ></i>
            </div>
          )}
          <div
            className={`text-[9px] ${facInfo.color} bg-black/60 w-5 h-5 rounded-full flex items-center justify-center border border-white/10`}
            title={facInfo.name}
          >
            <i className={`fa-solid ${facInfo.icon}`}></i>
          </div>
        </div>
        <div className="absolute top-1 left-1 z-20 flex gap-1">
            <div className="bg-cinematic-gold text-black text-[8px] font-black px-1 py-0.5 rounded shadow shadow-cinematic-gold/20">
              {card.cardClass}
            </div>
            {leaderId === card.id && (
              <div className="bg-cinematic-cyan text-black text-[8px] font-black px-1 py-0.5 rounded shadow shadow-cinematic-cyan/20 flex items-center gap-1">
                <i className="fa-solid fa-crown text-[7px]"></i> HQ
              </div>
            )}
        </div>
        <div className="absolute bottom-0 left-0 w-full p-1.5 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-white truncate drop-shadow-md">
            <span>{card.name}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-[8px] text-green-400 font-mono w-full">
                <div className="flex justify-between w-full mb-[0.5px]">
                    <span><i className="fa-solid fa-heart"></i> {displayCardHps[index]}</span>
                </div>
                <div className="h-[3px] bg-white/10 w-full rounded-full overflow-hidden relative">
                    <div className="h-full bg-cinematic-cyan transition-all duration-300 absolute left-0 top-0 bottom-0 shadow-[0_0_5px_#00f3ff]" style={{ width: `${(displayCardHps[index] / (cardMaxHp[index] || 1)) * 100}%` }}></div>
                    {displayShields[index] > 0 && (
                       <div className="h-full bg-blue-400 opacity-60 transition-all duration-300 absolute right-0 top-0 bottom-0 border-l border-white/30" style={{ width: `${Math.min(100, (displayShields[index] / (cardMaxHp[index] || 1)) * 100)}%` }}></div>
                    )}
                </div>
                <div className="flex justify-between w-full mt-1 mb-[0.5px]">
                    <span className="text-[7px] text-blue-300 font-bold"><i className="fa-solid fa-bolt"></i> {displayCardManas[index]}</span>
                </div>
                <div className="h-[2px] bg-white/10 w-full rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (displayCardManas[index] / (displayCardMaxManas[index] || 1)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
            <div className="w-10 flex flex-col justify-end items-end gap-1">
              <div className="text-[9px] text-orange-400 font-black italic drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                <i className="fa-solid fa-burst text-[7px]"></i> {leaderId === card.id ? Math.floor(stats.atk * 1.15) : stats.atk}
              </div>
              <div className="text-[7px] text-zinc-400 font-mono text-right bg-black/40 px-1 rounded border border-white/5 whitespace-nowrap">
                  {index < 3 ? "MELEE" : "RANGE"}
              </div>
            </div>
          </div>
        </div>
        {!inBattle && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
            {leaderId !== card.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm("Bạn có chắc chắn muốn bổ nhiệm nhân vật này làm Chỉ Huy? Các chỉ số toàn đội sẽ được gia tăng.", () => {
                    setLeaderId(card.id);
                  });
                }}
                className="bg-cinematic-gold text-black text-[9px] font-bold px-2 py-1 rounded shadow-lg hover:bg-yellow-400 flex items-center gap-1"
              >
                <i className="fa-solid fa-crown"></i> CHỈ HUY
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirm("Xác nhận đưa nhân vật này rời khỏi Đội hình tác chiến?", () => {
                  onClearSquadSlot(index);
                });
              }}
              className="bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg hover:bg-red-400 flex items-center gap-1"
            >
              <i className="fa-solid fa-square-minus"></i> RÚT LUI
            </button>
          </div>
        )}
        <div className="absolute top-1 left-1 bg-cinematic-gold text-black text-[8px] font-bold px-1 rounded shadow">
          {card.cardClass}
        </div>
      </motion.div>
    );
  };

  const renderCombatArena = () => {
    if (!boss) return null;
    const bf = getFactionInfo(boss.faction);
    const be = boss.element ? (ELEMENTS as any)[boss.element] || null : null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-zinc-950 overflow-y-auto overflow-x-hidden no-scrollbar"
        style={{
          filter: hitStop
            ? "invert(0.1) contrast(200%) brightness(150%) blur(1px)"
            : "none",
          transform: hitStop ? "scale(1.03)" : "scale(1)",
          transition: "transform 0.05s, filter 0.05s",
        }}
      >
        <AnimatePresence>
          {glassBreak && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center overflow-hidden"
            >
              {/* Red/Black flash instead of pure white to fit dark theme */}
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 bg-red-950 mix-blend-color-dodge"
              />

              {/* Shattered Image Pieces */}
              <div className="relative w-64 h-64 md:w-96 md:h-96">
                {/* Central broken crack effect */}
                <motion.div
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-white/20 blur-sm"
                  style={{
                    clipPath:
                      "polygon(50% 0%, 55% 45%, 100% 50%, 55% 55%, 50% 100%, 45% 55%, 0% 50%, 45% 45%)",
                  }}
                />

                {[...Array(20)].map((_, i) => {
                  const tx = (Math.random() - 0.5) * 1000;
                  const ty = (Math.random() - 0.5) * 1000;
                  const rot = (Math.random() - 0.5) * 720;

                  // Base random vertices for a broken shard shape
                  const v1x = Math.random() * 50;
                  const v1y = Math.random() * 50;
                  const v2x = 50 + Math.random() * 50;
                  const v2y = Math.random() * 50;
                  const v3x = 25 + Math.random() * 50;
                  const v3y = 50 + Math.random() * 50;

                  return (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                      animate={{
                        x: tx,
                        y: ty,
                        scale: 0.5,
                        rotate: rot,
                        opacity: 0,
                      }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="absolute inset-0 border border-white/40 "
                      style={{
                        backgroundImage: `url(${boss.imageUrl})`,
                        backgroundSize: "100% 100%",
                        backgroundPosition: "center",
                        clipPath: `polygon(${v1x}% ${v1y}%, ${v2x}% ${v2y}%, ${v3x}% ${v3y}%)`,
                        filter: "saturate(0) brightness(1.5) contrast(1.5)",
                      }}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
          {activeCutInCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none overflow-hidden"
            >
              {/* Dark background */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black"
              />

              {/* Speed lines background */}
              <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)] animate-[pan_2s_linear_infinite]" />

              <div className="relative w-full h-full flex items-center justify-center">
                {/* Slanted color strip */}
                <motion.div
                  initial={{
                    scaleY: 0,
                    opacity: 0,
                    rotate: -15,
                    width: "150%",
                  }}
                  animate={{ scaleY: 1, opacity: 1, rotate: -15 }}
                  exit={{ scaleY: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute h-64 bg-cinematic-cyan/30 blur-md transform -translate-y-12"
                />

                {/* Character Image */}
                <motion.img
                  src={activeCutInCard.imageUrl}
                  alt="cut-in"
                  crossOrigin="anonymous"
                  className="h-[75vh] object-contain relative z-10  filter contrast-125"
                  initial={{ x: "-100vw", scale: 1.2, skewX: -10 }}
                  animate={{ x: 0, scale: 1, skewX: 0 }}
                  exit={{
                    x: "100vw",
                    scale: 1.2,
                    skewX: 10,
                    transition: { duration: 0.2 },
                  }}
                  transition={{ type: "spring", damping: 15, stiffness: 100 }}
                />

                {/* Ultimate Name */}
                <motion.div
                  className="absolute bottom-1/4 right-8 md:right-[15%] z-20 flex flex-col items-end"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <span className="text-white/80 text-xl md:text-3xl font-mono tracking-widest uppercase mb-1 drop-shadow-md">
                    ULTIMATE SKILL
                  </span>
                  <span
                    className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white to-cinematic-cyan drop-shadow-2xl"
                    style={{ willChange: 'transform, opacity, scale', WebkitTextStroke: "2px rgba(0,243,255,0.5)" }}
                  >
                    {activeCutInCard.ultimateMove || "CRITICAL STRIKE"}
                  </span>
                  {calculateUltimateStats(activeCutInCard) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-4 mt-2 bg-black/60 px-4 py-2 rounded border border-cinematic-cyan/30 "
                    >
                      <span className="text-red-400 font-mono text-sm tracking-wider">
                        <i className="fa-solid fa-fire mr-1"></i>PWR:{" "}
                        {calculateUltimateStats(activeCutInCard).power}
                      </span>
                      <span className="text-yellow-400 font-mono text-sm tracking-wider">
                        <i className="fa-solid fa-crosshairs mr-1"></i>SCALE:{" "}
                        {calculateUltimateStats(activeCutInCard).scaling}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full min-h-screen flex flex-col items-center justify-between py-12 sm:py-8 px-2 sm:px-4 relative">
          {/* Cinema Background Layers */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-black pointer-events-none"></div>

          {/* Glowing Grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                transform: "perspective(500px) rotateX(60deg) translateY(-20%)",
              }}
            ></div>
          </div>

          {/* Energy Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * 100 + "%",
                  y: "100%",
                  opacity: 0,
                }}
                animate={{ y: "-10%", opacity: [0, 0.5, 0] }}
                transition={{
                  duration: 3 + Math.random() * 5,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                }}
                className="absolute w-px h-20 bg-gradient-to-t from-transparent via-red-500/30 to-transparent"
              />
            ))}
          </div>

          {/* Top Overlay UI (Fixed inside the scrolling container) */}
          <div className="fixed top-2 sm:top-4 left-4 sm:left-6 right-4 sm:right-6 flex justify-between items-start z-50 pointer-events-none">
            <div className="flex flex-col">
              <div className="text-[9px] font-black text-red-500 tracking-[0.3em] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                LIVE_ENGAGEMENT_FEED
              </div>
              <div className="text-[7px] text-zinc-600 font-mono mt-1">
                SIG: ACTIVE_ENCOUNTER_0x{boss.id % 99}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono font-bold text-white/40 tracking-widest uppercase">
                {boss.universe} Sector
              </div>
              <div className="text-[8px] text-zinc-600 font-mono">
                FRAME_STABILITY: 99.8%
              </div>
            </div>
          </div>

          {/* Main Layout container for Combat: row on lg, col-reverse on smaller so Player is on bottom */}
          <div className="flex flex-col-reverse lg:flex-row w-full max-w-7xl justify-center items-center lg:items-start gap-2 sm:gap-8 lg:gap-16 z-20 mt-4 sm:mt-8 mb-8">

            {/* Left/Bottom: Squad Section */}
            <motion.div className="w-full lg:w-1/2 flex flex-col items-center relative gap-4 sm:gap-6">
              <div className="w-full max-w-sm bg-black/60 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/5 shadow-[0_0_20px_rgba(34,197,94,0.05)] flex flex-col-reverse">
                <div className="flex justify-between items-start mt-1.5 sm:mt-2 px-1 sm:px-2">
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <div className="flex items-center gap-2 h-4 sm:h-5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                      <span className="text-[8px] font-mono text-green-500 uppercase tracking-widest font-black">
                        SQUAD_INTEGRITY
                      </span>
                    </div>
                    {activeSynergies && activeSynergies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeSynergies.map((syn, idx) => (
                          <div
                            key={idx}
                            className="bg-cinematic-cyan/10 border border-cinematic-cyan/30 text-cinematic-cyan text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[0_0_5px_rgba(0,243,255,0.2)] whitespace-nowrap"
                          >
                            <i className="fa-solid fa-link"></i> {syn}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="h-5 flex items-center">
                    <div className="text-[10px] font-mono font-bold text-green-400 flex items-baseline gap-1">
                      <span className="text-sm">{displaySquadHp}</span>
                      <span className="opacity-30">/ {squadHp}</span>
                    </div>
                  </div>
                </div>
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 shadow-inner ring-2 ring-green-900/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-green-400 box-shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(displaySquadHp / squadHp) * 100}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-shimmer"></div>
                  </motion.div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-6">
                {/* Position Labels (Desktop) */}
                <div className="hidden lg:flex flex-col justify-around py-8 h-full min-h-[300px] w-8 border-r border-white/5 mr-2">
                  <div className="flex flex-col items-center gap-2">
                    <span className="[writing-mode:vertical-lr] rotate-180 text-[8px] font-mono tracking-[0.3em] text-green-500 font-black">VANGUARD</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 opacity-70">
                    <span className="[writing-mode:vertical-lr] rotate-180 text-[8px] font-mono tracking-[0.3em] text-purple-400 font-black">REARGUARD</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-5 w-full lg:w-auto px-2 lg:px-0 relative">
                  {/* Grid Labels (Mobile) */}
                  <div className="lg:hidden absolute -top-4 left-0 right-0 flex justify-around text-[6px] font-mono font-bold tracking-widest text-green-500/50 uppercase">
                    <span>VANGUARD</span>
                    <span>VANGUARD</span>
                    <span>VANGUARD</span>
                  </div>

                  {/* Unified 2x3 Grid: Row 1 (Vanguard), Row 2 (Rearguard) */}
                  {renderSquadSlot(squad[0], 0)}
                  {renderSquadSlot(squad[1], 1)}
                  {renderSquadSlot(squad[2], 2)}
                  {renderSquadSlot(squad[3], 3)}
                  {renderSquadSlot(squad[4], 4)}
                  {renderSquadSlot(squad[5], 5)}
                </div>
              </div>
            </motion.div>

          {/* Tactical Override Commands (Stay fixed to the VIEWPORT, not the scrolling container) */}
          {document.getElementById("tactical-command-portal") && createPortal(
            <div className="fixed right-1 sm:right-4 top-[50%] -translate-y-1/2 flex flex-col justify-center items-center gap-3 sm:gap-4 z-[200] w-auto pointer-events-auto">
              <button
                onClick={() => handleTacticalCommand("strike")}
                className={`group relative w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-red-500/50 hover:border-red-500 bg-black/80 backdrop-blur-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] active:scale-90 lg:hover:scale-110 ${strikeUses >= getTacticalLimit() ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                disabled={strikeUses >= getTacticalLimit()}
              >
                <i className="fa-solid fa-satellite text-red-500 text-base sm:text-lg"></i>
                <div className="absolute -bottom-1 -right-1 bg-red-900 border border-red-500 text-white text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">
                  {getTacticalLimit() - strikeUses}
                </div>
                <div className="absolute bottom-full mb-4 lg:bottom-auto lg:mb-0 lg:right-full lg:mr-4 top-auto lg:top-1/2 right-0 lg:right-auto lg:left-auto lg:translate-x-0 lg:-translate-y-1/2 bg-black/90 border border-red-500/30 px-3 py-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 whitespace-normal sm:whitespace-nowrap transition-opacity flex flex-col items-center lg:items-end w-[140px] sm:w-auto shadow-2xl">
                  <div className="text-[10px] sm:text-xs font-bold text-red-500 mb-1 flex items-center gap-1 font-serif tracking-widest uppercase text-center lg:text-right">
                    Orbital Strike <i className="fa-solid fa-satellite"></i>
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest text-center lg:text-right">
                    -20% HP Boss
                  </div>
                  <div className="text-[9px] text-red-400 font-mono mt-0.5 text-center lg:text-right">
                    (Còn {getTacticalLimit() - strikeUses}/{getTacticalLimit()}{" "}
                    lượt)
                  </div>
                  <div className="text-[10px] text-cinematic-gold font-bold mt-1 bg-cinematic-gold/10 border border-cinematic-gold/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                    <i className="fa-solid fa-coins"></i> 100 DC
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleTacticalCommand("heal")}
                className={`group relative w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-green-500/50 hover:border-green-500 bg-black/80 backdrop-blur-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] active:scale-90 lg:hover:scale-110 ${healUses >= getTacticalLimit() ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                disabled={healUses >= getTacticalLimit()}
              >
                <i className="fa-solid fa-kit-medical text-green-500 text-base sm:text-lg"></i>
                <div className="absolute -bottom-1 -right-1 bg-green-900 border border-green-500 text-white text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">
                  {getTacticalLimit() - healUses}
                </div>
                <div className="absolute bottom-full mb-4 lg:bottom-auto lg:mb-0 lg:right-full lg:mr-4 top-auto lg:top-1/2 right-0 lg:right-auto lg:left-auto lg:translate-x-0 lg:-translate-y-1/2 bg-black/90 border border-green-500/30 px-3 py-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 whitespace-normal sm:whitespace-nowrap transition-opacity flex flex-col items-center lg:items-end w-[140px] sm:w-auto shadow-2xl">
                  <div className="text-[10px] sm:text-xs font-bold text-green-500 mb-1 flex items-center gap-1 font-serif tracking-widest uppercase text-center lg:text-right">
                    Emergency Repair <i className="fa-solid fa-kit-medical"></i>
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest text-center lg:text-right">
                    Phục hồi 30% Sinh Lực Đoàn
                  </div>
                  <div className="text-[9px] text-green-400 font-mono mt-0.5 text-center lg:text-right">
                    (Còn {getTacticalLimit() - healUses}/{getTacticalLimit()}{" "}
                    lượt)
                  </div>
                  <div className="text-[10px] text-cinematic-gold font-bold mt-1 bg-cinematic-gold/10 border border-cinematic-gold/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                    <i className="fa-solid fa-coins"></i> 50 DC
                  </div>
                </div>
              </button>
            </div>,
            document.getElementById("tactical-command-portal")!
          )}

            {/* Center slash (only shown on PC) */}
            <div className="hidden lg:flex flex-col items-center justify-center self-stretch py-24 mx-2">
               <div className="w-px h-full bg-gradient-to-b from-transparent via-red-500/50 to-transparent"></div>
               <div className="absolute py-2 text-[9px] font-mono text-zinc-700 tracking-[0.5em] uppercase opacity-40 font-bold -translate-x-1/2 rotate-90" style={{ transformOrigin: 'center' }}>
                  VS_ENGAGE
               </div>
            </div>

            {/* Right/Top: Enemy Squad Section  */}
            <motion.div
              animate={
                isBossAttacking
                  ? {
                      scale: [1, 1.05, 1],
                      zIndex: 100,
                    }
                  : {
                      y: [0, -5, 0],
                    }
              }
              transition={
                isBossAttacking
                  ? { duration: 0.5, times: [0, 0.4, 1] }
                  : { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }
              className={`w-full lg:w-1/2 flex flex-col-reverse lg:flex-col items-center relative gap-6`}
            >
              {/* Enemy Health Bar: Positioned at bottom on mobile to be near Tactical Buttons */}
              <div className="w-full max-w-sm bg-black/40 p-4 rounded-2xl border border-white/5 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
                <div className="flex justify-between items-start mb-2 px-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 h-5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]"></div>
                      <span className="text-[8px] font-mono text-red-500 uppercase tracking-widest font-black">
                        ENEMY_INTEGRITY
                      </span>
                    </div>
                  </div>
                  <div className="h-5 flex items-center">
                    <div className="text-[10px] font-mono font-bold text-red-400 flex items-baseline gap-1">
                      <span className="text-sm">{displayEnemyHps.reduce((a, b) => a + b, 0)}</span>
                      <span className="opacity-30">/ {enemySquad.reduce((a, b) => a + (b ? b.hp : 0), 0)}</span>
                    </div>
                  </div>
                </div>
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 shadow-inner ring-2 ring-red-900/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-800 via-red-500 to-orange-400 box-shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(displayEnemyHps.reduce((a, b) => a + b, 0) / Math.max(1, enemySquad.reduce((a, b) => a + (b ? b.hp : 0), 0))) * 100}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-shimmer"></div>
                  </motion.div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-5 w-full lg:w-auto px-2 lg:px-0 relative">
                  {/* Grid Labels (Mobile) */}
                  <div className="lg:hidden absolute -top-4 left-0 right-0 flex justify-around text-[6px] font-mono font-bold tracking-widest text-orange-400/50 uppercase">
                    <span>REARGUARD</span>
                    <span>REARGUARD</span>
                    <span>REARGUARD</span>
                  </div>

                  {/* Unified 2x3 Enemy Grid: Row 1 (Rearguard), Row 2 (Vanguard) */}
                  {renderEnemySlot(enemySquad[3], 3)}
                  {renderEnemySlot(enemySquad[4], 4)}
                  {renderEnemySlot(enemySquad[5], 5)}
                  {renderEnemySlot(enemySquad[0], 0)}
                  {renderEnemySlot(enemySquad[1], 1)}
                  {renderEnemySlot(enemySquad[2], 2)}
                </div>

                {/* Position Labels (Desktop) */}
                <div className="hidden lg:flex flex-col justify-around py-8 h-full min-h-[300px] w-8 border-l border-white/5 ml-2">
                  <div className="flex flex-col items-center gap-2 opacity-70">
                    <span className="[writing-mode:vertical-rl] text-[8px] font-mono tracking-[0.3em] text-orange-400 font-black">REARGUARD</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="[writing-mode:vertical-rl] text-[8px] font-mono tracking-[0.3em] text-red-500 font-black">VANGUARD</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tactical HUD Footer */}
          <div className="w-full max-w-5xl flex justify-between items-center text-[7px] font-mono text-zinc-600 border-t border-white/5 pt-4 pb-2 z-50">
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-zinc-900/50 border border-white/5">
                <span className="opacity-40">EVAS_RATE:</span>
                <span className="text-cinematic-cyan font-bold">
                  {dodgeRate}%
                </span>
              </div>
              <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-zinc-900/50 border border-white/5">
                <span className="opacity-40">ENG_MODE:</span>
                <span className="text-orange-500 font-bold uppercase">
                  Tactical_Sim
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="tracking-[0.2em] font-black uppercase text-zinc-700">
                Protocol_XN-99
              </div>
              <div className="w-2 h-2 rounded-sm bg-red-900/40 border border-red-500/20"></div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in pb-12">
      <AnimatePresence>{inBattle && renderCombatArena()}</AnimatePresence>

      <div className="w-full max-w-6xl bg-zinc-950/80 border border-cinematic-cyan/20 ring-1 ring-cinematic-cyan/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 mb-8 relative overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_0_40px_rgba(0,243,255,0.05)]">
        {/* Tech Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 19px, #00f3ff 19px, #00f3ff 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, #00f3ff 19px, #00f3ff 20px)",
            backgroundSize: "20px 20px",
          }}
        ></div>
        {/* Holographic scanner line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-cinematic-cyan/50 shadow-[0_0_10px_#00f3ff] opacity-50 animate-[scan_6s_ease-in-out_infinite]"></div>

        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 mb-6 relative z-10 border-b border-cinematic-cyan/10 pb-6">
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-cinematic-cyan/10 border border-cinematic-cyan/30 flex items-center justify-center text-cinematic-cyan shadow-[0_0_20px_rgba(0,243,255,0.2)]">
              <i className="fa-solid fa-satellite-dish text-2xl animate-pulse"></i>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-white to-cinematic-cyan tracking-[0.3em] uppercase leading-none">
                COMMAND CENTER
              </h2>
              <p className="text-[10px] sm:text-xs text-cinematic-cyan/60 font-mono tracking-widest mt-1.5 uppercase drop-shadow-[0_0_5px_rgba(0,243,255,0.3)]">
                Tactical Operations & Radar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4 bg-zinc-950/60 rounded-2xl p-4 border border-white/5 ring-1 ring-white/5 shadow-inner w-full sm:w-auto">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><i className="fa-solid fa-heart text-green-500/50"></i> HP</span>
              <span className="text-sm font-mono font-bold text-green-400 tabular-nums drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                {displaySquadHp}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><i className="fa-solid fa-burst text-orange-500/50"></i> ATK</span>
              <span className="text-sm font-mono font-bold text-orange-400 tabular-nums drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]">
                {squadAtk}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><i className="fa-solid fa-shield-halved text-slate-400/50"></i> DEF</span>
              <span className="text-sm font-mono font-bold text-slate-400 tabular-nums drop-shadow-[0_0_5px_rgba(148,163,184,0.5)]">
                {squadDef}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><i className="fa-solid fa-bolt text-purple-400/50"></i> RES</span>
              <span className="text-sm font-mono font-bold text-purple-400 tabular-nums drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">
                {squadRes}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1 flex items-center gap-1"><i className="fa-solid fa-wind text-cinematic-cyan/50"></i> EVA</span>
              <span className="text-sm font-mono font-bold text-cinematic-cyan tabular-nums drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
                {dodgeRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex justify-center mb-8 relative z-10 w-full max-w-3xl mx-auto">
            <div className={`flex bg-black/60 border border-white/5 rounded-full p-1.5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-xl ring-1 ring-white/5 w-full ${inBattle ? 'opacity-50 pointer-events-none' : ''}`}>
                <button
                    onClick={() => setOpTab("single_boss")}
                    className={`flex-1 relative z-10 py-3 rounded-full font-bold tracking-[0.2em] font-mono text-[10px] sm:text-xs uppercase transition-all duration-300 ${
                        opTab === "single_boss" ? 'text-black' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <i className="fa-solid fa-crosshairs mr-2"></i> Elite Target
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
                    {!hasSSR && <i className="fa-solid fa-lock text-[10px] opacity-50"></i>}
                    <i className="fa-brands fa-fort-awesome mr-1"></i> Battlefield
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
                    {!hasUR && <i className="fa-solid fa-lock text-[10px] opacity-50"></i>}
                    <i className="fa-solid fa-globe mr-1"></i> World Boss
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
          title="Khắc hệ: Tech > Magic > Mutant > Tech | Light <> Dark. Sát thương nhận thêm +30%"
        >
          <span className="text-blue-400 font-bold">
            <i className="fa-solid fa-microchip"></i> TECH
          </span>
          <i className="fa-solid fa-right-long text-zinc-700 opacity-50"></i>
          <span className="text-purple-400 font-bold">
            <i className="fa-solid fa-wand-magic-sparkles"></i> MAGIC
          </span>
          <i className="fa-solid fa-right-long text-zinc-700 opacity-50"></i>
          <span className="text-red-400 font-bold">
            <i className="fa-solid fa-dna"></i> MUTANT
          </span>
          <i className="fa-solid fa-right-long text-zinc-700 opacity-50"></i>
          <span className="text-blue-400 font-bold">
            <i className="fa-solid fa-microchip"></i> TECH
          </span>
          <div className="w-[1px] h-3 bg-white/20 mx-1"></div>
          <span className="text-yellow-300 font-bold">
            <i className="fa-solid fa-sun"></i> LIGHT
          </span>
          <i className="fa-solid fa-arrows-left-right text-zinc-600 opacity-50 mx-1"></i>
          <span className="text-zinc-400 font-bold">
            <i className="fa-solid fa-moon"></i> DARK
          </span>
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
                        <i className="fa-brands fa-fort-awesome text-2xl text-purple-400"></i>
                      </div>
                      <p className="text-sm sm:text-base text-purple-300 font-black tracking-[0.3em] font-mono">
                        ABYSSAL TOWER
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-2 font-mono max-w-md uppercase tracking-widest leading-relaxed">
                        Endless Spire. Elite encounters every 5 floors. Nightmare encounters every 10 floors.
                      </p>
                    </>
                  ) : opTab === "world_boss" ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-cinematic-gold/20 border border-cinematic-gold/50 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,184,0,0.3)]">
                        <i className="fa-solid fa-globe text-2xl text-cinematic-gold"></i>
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
                        <i className="fa-solid fa-radar text-2xl text-cinematic-cyan"></i>
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
                  <div className="col-span-1 md:col-span-3 flex justify-center">
                    <button 
                       onClick={handleEnterTowerFloor}
                       disabled={isGlobalProcessing}
                       className="w-full max-w-md bg-zinc-950/80 border border-purple-500/30 hover:border-purple-400 p-6 rounded-2xl transition-all group flex flex-col items-center disabled:opacity-50 relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] ring-1 ring-white/5"
                     >
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-purple-400 mb-4 text-3xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500 relative z-10">
                          <i className="fa-brands fa-fort-awesome"></i>
                        </div>
                        <div className="text-sm font-bold text-white tracking-[0.3em] font-mono uppercase mb-2 relative z-10 text-center">
                           Initiate Floor {towerState.floor}
                        </div>
                        <div className="text-[10px] text-zinc-400 mb-4 relative z-10 text-center uppercase font-mono tracking-widest h-4">
                           {towerState.floor % 10 === 0 ? <span className="text-red-400 font-bold bg-red-950/50 px-2 py-0.5 rounded border border-red-900"><i className="fa-solid fa-skull mr-1"></i> BOSS ENCOUNTER</span> : towerState.floor % 5 === 0 ? <span className="text-purple-400 font-bold bg-purple-950/50 px-2 py-0.5 rounded border border-purple-900"><i className="fa-solid fa-ghost mr-1"></i> ELITE ENCOUNTER</span> : "Standard Engagement"}
                        </div>
                        <div className="text-[10px] font-mono text-cinematic-gold bg-black/80 px-4 py-2 rounded-lg border border-cinematic-gold/30 relative z-10 tracking-[0.2em] flex items-center gap-2">
                           <i className="fa-solid fa-coins"></i>
                           <span className="font-bold">{100 + Math.floor((towerState.floor - 1) / 5) * 50} DC</span>
                        </div>
                    </button>
                  </div>
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
                        <i className="fa-solid fa-wave-square text-sm sm:text-xl"></i>
                      </div>
                      <div className="text-[8px] sm:text-xs font-bold font-mono text-white tracking-[0.1em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 text-center">
                        Standard
                      </div>
                      <div className="text-[7px] sm:text-[9px] text-zinc-500 mb-2 sm:mb-4 font-mono uppercase tracking-widest text-center">
                        BASELINE
                      </div>
                      <div className="mt-auto text-[8px] sm:text-[10px] font-mono text-cinematic-gold bg-black/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/10 flex items-center gap-1 sm:gap-1.5">
                        <i className="fa-solid fa-coins"></i> 50 DC
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
                        <i className="fa-solid fa-satellite text-sm sm:text-xl"></i>
                      </div>
                      <div className="text-[8px] sm:text-xs font-bold font-mono text-white tracking-[0.1em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 text-center">
                        Elite
                      </div>
                      <div className="text-[7px] sm:text-[9px] text-purple-400/70 mb-2 sm:mb-4 font-mono uppercase tracking-widest text-center">
                        HIGH YIELD
                      </div>
                      <div className="mt-auto text-[8px] sm:text-[10px] font-mono text-cinematic-gold bg-black/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/10 flex items-center gap-1 sm:gap-1.5">
                        <i className="fa-solid fa-coins"></i> 100 DC
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
                        <i className="fa-solid fa-biohazard text-sm sm:text-xl animate-pulse"></i>
                      </div>
                      <div className="text-[8px] sm:text-xs font-bold font-mono text-red-400 tracking-[0.1em] sm:tracking-[0.2em] uppercase mb-1 sm:mb-2 relative z-10 text-center">
                        Nightmare
                      </div>
                      <div className="text-[7px] sm:text-[9px] text-red-400/50 mb-2 sm:mb-4 font-mono uppercase tracking-widest text-center relative z-10">
                        MAX HAZARD
                      </div>
                      <div className="mt-auto text-[8px] sm:text-[10px] font-mono text-red-300 bg-red-950/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-900/50 flex items-center gap-1 sm:gap-1.5 relative z-10">
                        <i className="fa-solid fa-coins"></i> 200 DC
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
              <AnimatePresence>
                {damagePopups
                  .filter((p) => p.target === "boss")
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
                        scale: p.isCrit
                          ? [0.5, 1.5, 1.2, 1.2]
                          : [0.5, 1.2, 1, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        times: [0, 0.2, 0.7, 1],
                        ease: "easeOut",
                      }}
                      className={`absolute flex flex-col items-center pointer-events-none z-[100] font-black italic ${p.isCrit ? "text-cinematic-cyan text-3xl " : `${p.colorClass || "text-orange-500"} text-2xl `}`}
                      style={{
                        left: `calc(50% + ${p.x}px)`,
                        top: `calc(40% + ${p.y}px)`,
                        WebkitTextStroke: "1px black",
                        textShadow: "0 4px 8px rgba(0,0,0,0.8)",
                      }}
                    >
                      {p.isCrit && (
                        <div className="text-[10px] uppercase tracking-[0.3em] font-mono mb-2 text-center text-white">
                          Critical
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {p.dmgType === "Physical" && (
                          <i className="fa-solid fa-burst text-[0.5em] opacity-80"></i>
                        )}
                        {p.dmgType === "Magic" && (
                          <i className="fa-solid fa-wand-magic-sparkles text-[0.5em] opacity-80"></i>
                        )}
                        {p.dmgType === "Fire" && (
                          <i className="fa-solid fa-fire text-[0.5em] opacity-80"></i>
                        )}
                        {p.dmgType === "Water" && (
                          <i className="fa-solid fa-droplet text-[0.5em] opacity-80"></i>
                        )}
                        {p.dmgType === "Lightning" && (
                          <i className="fa-solid fa-bolt text-[0.5em] opacity-80"></i>
                        )}
                        {p.dmgType === "Earth" && (
                          <i className="fa-solid fa-leaf text-[0.5em] opacity-80"></i>
                        )}
                        {p.dmgType === "Wind" && (
                          <i className="fa-solid fa-wind text-[0.5em] opacity-80"></i>
                        )}
                        {p.dmgType === "Tech" && (
                          <i className="fa-solid fa-crosshairs text-[0.5em] opacity-80"></i>
                        )}
                        <span>-{p.value}</span>
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>

              {!inBattle && opTab !== "world_boss" && (
                <button
                  onClick={cancelBoss}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white/50 hover:text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors z-20 shadow-lg border border-white/10"
                  title="Rút lui / Đổi mục tiêu"
                >
                  <i className="fa-solid fa-xmark"></i>
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
                          <i className="fa-solid fa-link text-cinematic-cyan"></i> {syn}
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
             <div className="flex flex-col sm:flex-row justify-center items-center py-6 gap-6 relative">
              <button
                onClick={handleAutoSetup}
                disabled={!boss || inBattle || isGlobalProcessing}
                className="group relative px-6 py-4 rounded-xl font-bold tracking-[0.2em] uppercase transition-all bg-zinc-950/80 border border-cinematic-cyan/50 text-white hover:bg-cinematic-cyan/20 ring-1 ring-cinematic-cyan/20 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] disabled:opacity-50 flex items-center gap-3 text-[10px] overflow-hidden"
              >
                 <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(0,243,255,0.2),transparent)] -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
                <i className="fa-solid fa-microchip text-xl text-cinematic-cyan group-hover:animate-pulse"></i>
                <div className="flex flex-col items-start gap-1">
                   <span>AI DEPLOY</span>
                   <span className="text-[7px] text-zinc-400 font-mono tracking-widest">Auto Formation</span>
                </div>
              </button>
              
              <button
                onClick={() => {
                  if (opTab === "world_boss" && worldBossState.attemptsToday >= 3) {
                     onAlert("Giới hạn", "Đã hết lượt đánh cường địch hôm nay. Hãy trở lại vào ngày mai.");
                     return;
                  }
                  executeBattle();
                }}
                disabled={
                  !boss ||
                  squad.filter((c) => c !== null).length === 0 ||
                  inBattle ||
                  isGlobalProcessing ||
                  (opTab === "world_boss" && worldBossState.attemptsToday >= 3)
                }
                className={`group relative overflow-hidden px-10 sm:px-16 py-4 sm:py-5 rounded-2xl font-bold tracking-[0.3em] uppercase transition-all duration-500 shadow-2xl flex items-center justify-center gap-4 ${
                  inBattle 
                     ? "bg-zinc-950 border border-red-500/50 text-red-500 ring-1 ring-red-500/30 scale-95" 
                     : (opTab === "world_boss" && worldBossState.attemptsToday >= 3) 
                        ? "bg-zinc-900 text-zinc-600 border border-zinc-700 cursor-not-allowed" 
                        : "bg-red-600/90 border border-red-400 text-white hover:bg-red-500 hover:text-white hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_60px_rgba(220,38,38,0.6)]"
                }`}
              >
                {!inBattle && opTab !== "world_boss" && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>}
                
                <i
                  className={`fa-solid ${inBattle ? "fa-spinner fa-spin text-xl sm:text-2xl" : "fa-bolt text-2xl sm:text-3xl drop-shadow-[0_0_10px_currentColor] group-hover:animate-pulse"}`}
                ></i>
                
                <div className="flex flex-col items-start text-left relative z-10">
                   <span className="text-sm sm:text-lg drop-shadow-md">
                     {inBattle ? "ENGAGED" : (opTab === "world_boss" && worldBossState.attemptsToday >= 3 ? "SYSTEM LOCKED" : "INITIATE OPs")}
                   </span>
                   {opTab === "world_boss" && !inBattle && (
                       <div className="flex flex-col gap-1 mt-1">
                         <span className="text-[9px] font-mono text-red-200 uppercase tracking-widest font-normal">
                           Remaining: {Math.max(0, 3 - worldBossState.attemptsToday)}/3
                         </span>
                         <span className="text-[9px] font-mono text-cyan-400/80 uppercase tracking-widest font-bold flex items-center gap-1.5">
                           <i className="fa-solid fa-clock-rotate-left text-[8px]"></i>
                           Reset In: {timeUntilReset}
                         </span>
                       </div>
                   )}
                   {(!inBattle && opTab !== "world_boss") && (
                       <span className="text-[8px] sm:text-[9px] font-mono mt-0.5 text-zinc-100/70 uppercase tracking-widest font-normal">
                         Authorize Combat Protocol
                       </span>
                   )}
                </div>
              </button>
            </div>
          </div>

          {/* Right Area: Ops Log */}
          <div
            className={`w-full lg:w-80 shrink-0 flex flex-col gap-4 ${inBattle ? "opacity-100 translate-y-0" : "opacity-60 lg:opacity-100"}`}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                <i className="fa-solid fa-file-invoice mr-2"></i>Mission_Log (Max 15 Rounds)
              </div>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-[8px] text-zinc-600 hover:text-red-400"
                >
                  CLEAR
                </button>
              )}
            </div>
            <div
              id="battleLog"
              ref={logContainerRef}
              className="bg-zinc-950/80 border border-white/5 rounded-xl p-4 font-mono text-[10px] leading-relaxed text-zinc-500 shadow-inner h-[200px] lg:h-[450px] overflow-y-auto no-scrollbar scroll-smooth "
            >
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-20 italic">
                  Waiting for connection...
                </div>
              ) : (
                logs
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
