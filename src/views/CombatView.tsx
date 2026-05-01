import React, { useState, useEffect, useRef } from "react";
import { Card, Boss, AppConfig } from "../types";
import {
  getFactionInfo,
  getComboStats,
  getSquadDodgeRate,
  calculateCombatStats,
  getElementAdvantage,
} from "../lib/gameLogic";
import { generateBossFromAI, generateImageFromAi } from "../services/ai";
import { ELEMENTS } from "../lib/constants";
import { motion, AnimatePresence } from "motion/react";

interface DamagePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  isCrit: boolean;
}

interface Props {
  config: AppConfig;
  currency: number;
  level: number;
  modifyCurrency: (amount: number) => boolean;
  modifyInventory: (baseDiff: number, eliteDiff: number) => void;
  gainExperience: (amount: number) => void;
  squad: (Card | null)[];
  leaderId: string | null;
  setLeaderId: (id: string | null) => void;
  boss: Boss | null;
  setBoss: (b: Boss | null) => void;
  onOpenSquadSelector: (slot: number) => void;
  onClearSquadSlot: (slot: number) => void;
  onError: (msg: string) => void;
  onAlert: (t: string, m: string) => void;
  onConfirm: (m: string, cb: () => void) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
}

export const CombatView: React.FC<Props> = ({
  config,
  currency,
  level,
  modifyCurrency,
  modifyInventory,
  gainExperience,
  squad,
  leaderId,
  setLeaderId,
  boss,
  setBoss,
  onOpenSquadSelector,
  onClearSquadSlot,
  onError,
  onAlert,
  onConfirm,
  isGlobalProcessing,
  setGlobalProcessing,
}) => {
  const [inBattle, setInBattle] = useState(false);
  const [logs, setLogs] = useState<React.ReactNode[]>([
    <div key="init" className="text-cyan-600/50">
      Hệ thống Tác chiến Tương Sinh Tương Khắc đã sẵn sàng...
    </div>,
  ]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [shakeSquad, setShakeSquad] = useState(false);
  const [shakeBoss, setShakeBoss] = useState(false);
  const [displayBossHp, setDisplayBossHp] = useState(0);
  const [displaySquadHp, setDisplaySquadHp] = useState(0);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [flashBoss, setFlashBoss] = useState(false);
  const [flashSquad, setFlashSquad] = useState(false);
  const [activeAttackerIdx, setActiveAttackerIdx] = useState<number | null>(
    null,
  );

  const [showFullPassive, setShowFullPassive] = useState(false);

  let {
    hp: squadHp,
    atk: squadAtk,
    activeSynergies,
    synergyBonusAtk,
  } = getComboStats(squad);
  const dodgeRate = getSquadDodgeRate(squad);

  // Apply initial Leader Buff for display
  const hasLeader = squad.some((c) => c && c.id === leaderId);
  if (hasLeader) {
    squadHp = Math.floor(squadHp * 1.15);
    squadAtk = Math.floor(squadAtk * 1.15);
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
    if (!inBattle && boss) {
      setDisplayBossHp(boss.hp);
      bossMaxHp.current = boss.hp;
    }
  }, [boss, inBattle]);

  useEffect(() => {
    if (!inBattle) {
      setDisplaySquadHp(squadHp);
      squadMaxHp.current = squadHp;
    }
  }, [squadHp, inBattle]);

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
      if (!["Tech", "Magic", "Mutant", "Light", "Dark"].includes(bossData.faction)) {
        // Fallback or random picking logic if AI goes rogue
        const fallbacks = ["Tech", "Magic", "Mutant", "Light", "Dark"];
        bossData.faction = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      const facInfo = getFactionInfo(bossData.faction);
      setLogs((prev) => [
        ...prev,
        <div
          key={Date.now()}
          className="text-cyan-600/50 mb-2 border-b border-white/10 pb-2"
        >
          Radar phát hiện: <strong>{bossData.name}</strong> (Hệ:{" "}
          <span className={facInfo.color}>
            <i className={`fa-solid ${facInfo.icon}`}></i> {facInfo.name}
          </span>
          ).
        </div>,
      ]);

      setBoss(bossData);

      try {
        const dummyCard = {
          gender: "Unknown",
          universe: bossData.universe,
          faction: bossData.faction,
          visualDescription: `Epic boss monster. ${bossData.visualDescription}`,
        };
        const bossImg = await generateImageFromAi(dummyCard, config);
        setBoss({ ...bossData, imageUrl: bossImg });
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
      setBoss(null),
    );
  };

  const triggerShake = (target: "squad" | "boss") => {
    if (target === "squad") {
      setShakeSquad(false);
      setFlashSquad(true);
      setTimeout(() => {
        setShakeSquad(true);
        setFlashSquad(false);
      }, 10);
    } else {
      setShakeBoss(false);
      setFlashBoss(true);
      setTimeout(() => {
        setShakeBoss(true);
        setFlashBoss(false);
      }, 10);
    }
  };

  const addDamagePopup = (
    value: number,
    target: "boss" | "squad",
    isCrit: boolean,
  ) => {
    const id =
      Date.now() + Math.random() + (target === "squad" ? "_squad" : "_boss");
    // Randomized position around target area
    const x =
      target === "boss" ? Math.random() * 60 - 30 : Math.random() * 100 - 50;
    const y = target === "boss" ? -50 : -40;
    setDamagePopups((prev) => [
      ...prev,
      { id: parseFloat(id.split("_")[0]), value, x, y, isCrit, target } as any,
    ]);
    setTimeout(() => {
      setDamagePopups((prev) =>
        prev.filter((p) => (p as any).id !== parseFloat(id.split("_")[0])),
      );
    }, 1000);
  };

  const executeBattle = async () => {
    if (inBattle || !boss) return;
    setInBattle(true);
    setGlobalProcessing(true);
    setStrikeUses(0);
    setHealUses(0);

    let currentBossHp = boss.hp;
    let currentSquadHp = squadHp;

    const addLog = (msg: string | React.ReactNode, colorClass: string) => {
      setLogs((prev) => [
        ...prev,
        <div
          key={Math.random()}
          className={`${colorClass} mb-1.5 animate-fade-in`}
        >
          {msg}
        </div>,
      ]);
    };

    addLog(
      `>>> CHIẾN DỊCH: ${boss.name} [Vũ trụ: ${boss.universe}] <<<`,
      "text-red-500 mb-2 border-b border-red-900/50 pb-1 mt-4 text-xs font-bold",
    );

    // Announce boss passive if any
    if (boss.passiveSkill && boss.passiveSkill.length > 5) {
      addLog(
        `BOSS NỘI TẠI: ${boss.passiveSkill}`,
        "text-red-400 font-serif italic border-l-2 border-red-500 pl-2 text-[10px] mb-2",
      );
    }
    addLog(
      `--- Phân Tích Tương Quan Tộc Hệ & Đặc tính Nguyên Tố ---`,
      "text-cinematic-gold mt-2",
    );

    let actualSquadAtk = 0;
    let bossAtkMultiplier = 0;
    let activeCardsCount = 0;
    const bossFac = getFactionInfo(boss.faction);

    let leaderBuffMod = 1.0;
    let leaderHpBuffMod = 1.0;
    const leaderCard = squad.find((c) => c && c.id === leaderId);
    if (leaderCard) {
      leaderBuffMod = 1.15;
      leaderHpBuffMod = 1.15;
      addLog(
        <span className="flex items-center gap-2">
          <i className="fa-solid fa-crown text-cinematic-gold"></i> CHỈ HUY [
          {leaderCard.name}]: Kích hoạt Leader Core! Toàn đội tăng 15% Sinh Lực
          & Tấn Công.
        </span>,
        "text-cinematic-gold font-bold bg-cinematic-gold/10 border border-cinematic-gold/20 px-2 py-1.5 rounded text-[11px] mb-2",
      );
      currentSquadHp = Math.floor(currentSquadHp * leaderHpBuffMod);
      setDisplaySquadHp(currentSquadHp);
      squadMaxHp.current = currentSquadHp;
    }

    squad.forEach((card, i) => {
      if (!card) return;
      activeCardsCount++;
      const cardFac = getFactionInfo(card.faction);
      const { atk } = calculateCombatStats(card);
      let atkMod = 1;
      let defMod = 1;
      let matchStatusText = "Hòa";
      let statusColor = "text-gray-400";

      if ((cardFac.id === 'Light' && boss.faction === 'Dark') || (cardFac.id === 'Dark' && boss.faction === 'Light')) {
        // Mutual counter: both deal +30% damage to each other
        atkMod *= 1.3;
        defMod *= 1.3;
        matchStatusText = "Thiên Địch";
        statusColor = "text-yellow-400 font-bold";
      } else if (cardFac.strongAgainst === boss.faction) {
        atkMod *= 1.3;
        defMod *= 0.7;
        matchStatusText = "Khắc Hệ";
        statusColor = "text-green-400 font-bold";
      } else if (cardFac.weakAgainst === boss.faction) {
        atkMod *= 0.7;
        defMod *= 1.3;
        matchStatusText = "Bị Khắc";
        statusColor = "text-red-400 font-bold";
      }

      const elemAdv = getElementAdvantage(card.element, boss.element);
      if (elemAdv > 1.0) {
        atkMod *= elemAdv;
        defMod *= 0.5;
        matchStatusText += " & Tương Tứ Nguyên Tố (+)";
        statusColor = "text-green-400 font-bold";
      } else if (elemAdv < 1.0) {
        atkMod *= elemAdv;
        defMod *= 1.5;
        matchStatusText += " & Nghịch Nguyên Tố (-)";
        statusColor = "text-red-600 font-bold drop-shadow-md";
      }

      actualSquadAtk += Math.floor(atk * atkMod);
      bossAtkMultiplier += defMod;
      addLog(
        <span>
          Slot {i + 1} [{cardFac.name} {card.element ? `| ${card.element}` : ""}
          ]: {card.name} vs Boss [{bossFac.name}{" "}
          {boss.element ? `| ${boss.element}` : ""}] -&gt;{" "}
          <span className={statusColor}>
            {matchStatusText} {(atkMod * 100).toFixed(0)}% ST Lên Boss
          </span>
        </span>,
        "text-xs text-cinematic-muted",
      );
    });

    actualSquadAtk = Math.floor(actualSquadAtk * leaderBuffMod);
    if (synergyBonusAtk > 0) {
      actualSquadAtk = Math.floor(actualSquadAtk * (1 + synergyBonusAtk));
      addLog(
        <span>
          Buff Cộng Hưởng: Sát thương tăng thêm{" "}
          <span className="text-cinematic-cyan">
            +{(synergyBonusAtk * 100).toFixed(0)}%
          </span>
        </span>,
        "text-cinematic-cyan font-bold mb-1",
      );
    }

    const actualBossAtk = Math.floor(
      boss.attack *
        (activeCardsCount > 0 ? bossAtkMultiplier / activeCardsCount : 1),
    );
    addLog(
      <span>
        Hỏa lực tổng hợp (Đã áp dụng Buff/Khắc chế):{" "}
        <span className="text-orange-400">{actualSquadAtk}</span> ATK
      </span>,
      "text-cinematic-muted border-b border-white/10 pb-2 mb-2",
    );

    const activeSquad = squad.filter((c) => c !== null) as Card[];
    let turn = 1;
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let currentActualBossAtk = actualBossAtk;
    let isEnraged = false;
    let bossStatus = { type: "none", turnsLeft: 0 };

    // Process Tactical Overrides before entering loop just in case
    tacticalQueue.current = [];

    while (currentSquadHp > 0 && currentBossHp > 0 && turn <= 30) {
      await delay(400);

      // Process Tactical Overrides
      while (tacticalQueue.current.length > 0) {
        const action = tacticalQueue.current.shift();
        if (action === "strike") {
          const dmg = Math.floor(boss.hp * 0.2);
          currentBossHp -= dmg;
          setDisplayBossHp(Math.max(0, currentBossHp));
          triggerShake("boss");
          addDamagePopup(dmg, "boss", false);
          addLog(
            <span>
              🚀 <strong>CAN THIỆP CHIẾN THUẬT: ORBITAL STRIKE!</strong> Giáng
              xuống <span className="text-orange-500 font-bold">-{dmg} HP</span>
              !
            </span>,
            "text-yellow-400 text-xs bg-yellow-900/40 px-2 py-1 rounded border-l-2 border-yellow-500 my-1 font-serif",
          );
          await delay(600);
        } else if (action === "heal") {
          const healAmt = Math.floor(squadHp * 0.3);
          currentSquadHp = Math.min(squadHp, currentSquadHp + healAmt);
          setDisplaySquadHp(currentSquadHp);
          addLog(
            <span>
              💉 <strong>CAN THIỆP CHIẾN THUẬT: EMERGENCY REPAIR!</strong> Hồi
              phục{" "}
              <span className="text-green-500 font-bold">+{healAmt} HP</span>!
            </span>,
            "text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded border-l-2 border-green-500 my-1 font-serif",
          );
          await delay(600);
        }
      }
      if (currentBossHp <= 0) {
        setActiveAttackerIdx(null);
        break;
      }

      // Enrage Check
      if (currentBossHp <= boss.hp * 0.3 && !isEnraged) {
        isEnraged = true;
        currentActualBossAtk = Math.floor(currentActualBossAtk * 1.5);
        addLog(
          <span>
            <i className="fa-solid fa-triangle-exclamation"></i>{" "}
            <strong>CẢNH BÁO: BOSS CUỒNG NỘ!</strong> Sinh lực giảm xuống dưới
            30%, Sát thương Boss tăng đột biến (x1.5)!
          </span>,
          "text-red-500 font-bold bg-red-900/20 px-2 py-1.5 border-l-4 border-red-500 animate-pulse my-2 text-[11px]",
        );
      }

      let currentAtk = actualSquadAtk;
      let isCrit = false;
      let critLog: React.ReactNode = "";

      if (bossStatus.turnsLeft > 0 && bossStatus.type === "pierce") {
        currentAtk = Math.floor(currentAtk * 1.3); // 30% more dmg taken
      }

      // Attacker logic for visual highlighting
      const attackerIdxInActive = (turn - 1) % activeSquad.length;
      const attackerCard = activeSquad[attackerIdxInActive];
      const realIdx = squad.findIndex((c) => c && c.id === attackerCard.id);
      setActiveAttackerIdx(realIdx);
      await delay(300);

      if (Math.random() * 100 < 25) {
        isCrit = true;
        const ultMul = attackerCard.ultimateLevel
          ? 1.5 + attackerCard.ultimateLevel * 0.15
          : 2.0;
        currentAtk = Math.floor(currentAtk * ultMul);
        const ultiName = attackerCard.ultimateMove || "Đòn Đánh Chí Mạng";
        critLog = (
          <>
            <div className="text-cinematic-cyan font-bold bg-cinematic-cyan/10 border border-cinematic-cyan/30 px-2 py-1 rounded inline-block mb-1 shadow-[0_0_10px_rgba(0,243,255,0.3)]">
              <i className="fa-solid fa-bolt"></i> {attackerCard.name} thi triển
              [{ultiName}]{" "}
              <span className="opacity-50 text-[10px]">
                Lv.{attackerCard.ultimateLevel || 1}
              </span>{" "}
              <span className="text-[9px] text-white/40">
                ({ultMul.toFixed(1)}x Dmg)
              </span>
            </div>
            <br />
          </>
        );
      }

      let triggerStatusLog: React.ReactNode = "";
      if (
        bossStatus.turnsLeft === 0 &&
        attackerCard.element &&
        attackerCard.element !== "Neutral"
      ) {
        const triggerChance = 20 + (attackerCard.ultimateLevel || 1) * 3; // 23% - 50%
        if (Math.random() * 100 < triggerChance) {
          bossStatus.turnsLeft = 2; // Lasts 2 full rounds
          let typeName = "";
          if (attackerCard.element === "Fire") {
            bossStatus.type = "burn";
            typeName = "Thiêu Đốt";
          } else if (attackerCard.element === "Water") {
            bossStatus.type = "chill";
            typeName = "Tê Buốt";
          } else if (attackerCard.element === "Earth") {
            bossStatus.type = "stun";
            typeName = "Hóa Đá";
          } else if (attackerCard.element === "Wind") {
            bossStatus.type = "pierce";
            typeName = "Bào Mòn";
          } else if (attackerCard.element === "Lightning") {
            bossStatus.type = "paralyze";
            typeName = "Tê Liệt";
          }

          const elRef = (ELEMENTS as any)[attackerCard.element];
          triggerStatusLog = (
            <span
              className="ml-2 text-[9px] px-1.5 py-0.5 rounded font-mono border bg-black/60 shadow-lg"
              style={{
                borderColor: "currentColor",
                color:
                  elRef?.color === "text-red-500"
                    ? "#ef4444"
                    : elRef?.color === "text-blue-400"
                      ? "#60a5fa"
                      : elRef?.color === "text-teal-400"
                        ? "#2dd4bf"
                        : elRef?.color === "text-green-500"
                          ? "#22c55e"
                          : elRef?.color === "text-yellow-400"
                            ? "#facc15"
                            : "white",
              }}
            >
              Gây {typeName.toUpperCase()}!
            </span>
          );
        }
      }

      currentAtk = Math.floor(currentAtk * (0.9 + Math.random() * 0.2));

      triggerShake("boss");
      addDamagePopup(currentAtk, "boss", isCrit);
      currentBossHp -= currentAtk;
      setDisplayBossHp(Math.max(0, currentBossHp));

      let dmgColor = isCrit
        ? "text-cinematic-cyan text-lg drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]"
        : "text-orange-400 font-bold";
      addLog(
        <span>
          {critLog}[Lượt {turn}] Lực lượng tiền tuyến tấn công:{" "}
          <span className={dmgColor}>-{currentAtk} HP</span> {triggerStatusLog}
        </span>,
        isCrit ? "text-white" : "text-zinc-400",
      );

      if (currentBossHp <= 0) {
        setActiveAttackerIdx(null);
        break;
      }
      await delay(800);
      setActiveAttackerIdx(null);

      // Process status BEFORE boss attacks
      let skipBossTurn = false;
      let currentBossTurnAtk = currentActualBossAtk;

      if (bossStatus.turnsLeft > 0) {
        if (bossStatus.type === "burn") {
          const burnDmg = Math.floor(actualSquadAtk * 0.15);
          currentBossHp -= burnDmg;
          setDisplayBossHp(Math.max(0, currentBossHp));
          triggerShake("boss");
          addLog(
            <span>
              🔥 [THIÊU ĐỐT] Boss mất{" "}
              <span className="text-orange-500 font-bold">-{burnDmg} HP</span>
            </span>,
            "text-zinc-400 text-[10px] pl-4",
          );
          if (currentBossHp <= 0) {
            break;
          }
        } else if (bossStatus.type === "chill") {
          currentBossTurnAtk = Math.floor(currentBossTurnAtk * 0.7);
          addLog(
            <span>❄️ [TÊ BUỐT] Lực tấn công Boss bị giảm 30%.</span>,
            "text-zinc-400 text-[10px] pl-4",
          );
        } else if (bossStatus.type === "stun") {
          if (Math.random() < 0.5) skipBossTurn = true;
          addLog(
            <span>🪨 [HÓA ĐÁ] Rung chấn chặn đứng hành động của Boss!</span>,
            "text-zinc-400 text-[10px] pl-4",
          );
        } else if (bossStatus.type === "paralyze") {
          if (Math.random() < 0.3) skipBossTurn = true;
          addLog(
            <span>⚡ [TÊ LIỆT] Sốc điện có thể làm Boss mất lượt!</span>,
            "text-zinc-400 text-[10px] pl-4",
          );
        }
        bossStatus.turnsLeft--;
      }

      if (skipBossTurn) {
        addLog(
          <span>
            [Lượt {turn}] Boss không thể hành động do hiệu ứng Khống Chế!
          </span>,
          "text-cinematic-cyan/80 bg-cinematic-cyan/10 px-2 py-1",
        );
      } else if (Math.random() * 100 < dodgeRate) {
        addLog(
          <span>
            [Lượt {turn}] ⚡{" "}
            <strong className="tracking-widest bg-white/10 px-2 rounded">
              [NÉ TRÁNH]
            </strong>{" "}
            Bóng ma chiến trường! Đội hình né được sát thương.
          </span>,
          "text-cinematic-gold",
        );
      } else {
        const bossDmg = Math.floor(
          currentBossTurnAtk * (0.9 + Math.random() * 0.2),
        );
        currentSquadHp -= bossDmg;
        setDisplaySquadHp(Math.max(0, currentSquadHp));
        triggerShake("squad");
        addDamagePopup(bossDmg, "squad", false);
        addLog(
          <span>
            [Lượt {turn}] <i className="fa-solid fa-burst text-red-500"></i>{" "}
            {boss.name} quét mục tiêu:{" "}
            <span className="text-red-500 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">
              -{bossDmg} HP
            </span>
          </span>,
          "text-white/80 bg-red-900/10 p-1 border-l-2 border-red-500",
        );
      }
      turn++;
    }

    await delay(800);
    if (currentBossHp <= 0) {
      let baseDrop = 0;
      let eliteDrop = 0;
      let expGained = 0;
      if (boss.threatLevel.includes("Elite")) {
        baseDrop = 1;
        if (Math.random() < 0.15) eliteDrop = 1;
        expGained = 15;
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
      if (baseDrop > 0 || eliteDrop > 0) modifyInventory(baseDrop, eliteDrop);

      onAlert("Chiến dịch xuất sắc!", rewardLogMsgs.join("<br>"));
      setBoss(null);
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

    setInBattle(false);
    setGlobalProcessing(false);
  };

  const renderSquadSlot = (card: Card | null, index: number) => {
    if (!card) {
      return (
        <div
          key={`empty-${index}`}
          onClick={() => !inBattle && onOpenSquadSelector(index)}
          className="w-24 h-36 sm:w-32 sm:h-48 rounded-xl flex flex-col items-center justify-center cursor-pointer relative group bg-black/40 border border-white/10 hover:border-cinematic-cyan/50 transition-colors overflow-hidden shadow-lg"
        >
          <i className="fa-solid fa-plus text-2xl text-white/20 mb-2"></i>
          <p className="text-[8px] text-cinematic-muted tracking-widest uppercase">
            Triển Khai
          </p>
        </div>
      );
    }
    const stats = calculateCombatStats(card);
    const facInfo = getFactionInfo(card.faction);
    const isAttacking = activeAttackerIdx === index;
    return (
      <motion.div
        key={card.id || index}
        animate={
          isAttacking
            ? {
                y: -40,
                scale: 1.15,
                boxShadow: "0 0 40px rgba(0, 243, 255, 0.4)",
                borderColor: "rgba(0, 243, 255, 0.6)",
                zIndex: 40,
              }
            : shakeSquad
              ? {
                  x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0],
                  rotate: [0, -3, 3, -3, 3, -1, 1, 0, 0, 0],
                  boxShadow: [
                    "0 0 10px rgba(0, 0, 0, 0.5)",
                    "0 0 40px rgba(239, 68, 68, 0.8)",
                    "0 0 10px rgba(0, 0, 0, 0.5)",
                  ],
                  borderColor: [
                    "rgba(255, 255, 255, 0.1)",
                    "rgba(239, 68, 68, 0.8)",
                    "rgba(255, 255, 255, 0.1)",
                  ],
                  transition: { duration: 0.4 },
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
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => !inBattle && onOpenSquadSelector(index)}
        className={`w-24 h-36 sm:w-32 sm:h-48 rounded-xl flex flex-col items-center justify-center cursor-pointer relative group bg-black/40 border transition-all overflow-hidden shadow-lg`}
      >
        <img
          src={card.imageUrl}
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
          crossOrigin="anonymous"
          alt={card.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

        {isAttacking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.4 }}
            className="absolute inset-0 bg-cinematic-cyan/20 blur-xl pointer-events-none"
          ></motion.div>
        )}
        <div className="absolute top-1 right-1 z-20 flex flex-col gap-1 items-end">
          <div
            className={`text-[9px] ${facInfo.color} bg-black/60 w-5 h-5 rounded-full flex items-center justify-center border border-white/10`}
            title={facInfo.name}
          >
            <i className={`fa-solid ${facInfo.icon}`}></i>
          </div>
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
        </div>
        <div className="absolute bottom-0 left-0 w-full p-2">
          <div className="text-[10px] font-bold text-white truncate drop-shadow-md flex items-center justify-between">
            <span>{card.name}</span>
            {leaderId === card.id && (
              <i className="fa-solid fa-crown text-cinematic-gold text-[8px] animate-pulse"></i>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-[8px] text-green-400 font-mono">
              <i className="fa-solid fa-heart"></i>{" "}
              {leaderId === card.id ? Math.floor(stats.hp * 1.15) : stats.hp}
            </div>
          </div>
          <div className="text-[8px] text-orange-400 font-mono">
            <i className="fa-solid fa-burst"></i>{" "}
            {leaderId === card.id ? Math.floor(stats.atk * 1.15) : stats.atk}
          </div>
        </div>
        {!inBattle && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
            {leaderId !== card.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLeaderId(card.id);
                }}
                className="bg-cinematic-gold text-black text-[9px] font-bold px-2 py-1 rounded shadow-lg hover:bg-yellow-400 flex items-center gap-1"
              >
                <i className="fa-solid fa-crown"></i> CHỈ HUY
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearSquadSlot(index);
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
      >
        <div className="min-h-screen flex flex-col items-center justify-between py-12 sm:py-8 px-2 sm:px-4 relative">
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

          {/* Tactical Override Commands */}
          <div className="fixed right-2 sm:right-4 top-1/4 sm:top-1/2 -translate-y-1/2 flex flex-col gap-3 sm:gap-4 z-[110]">
            <button
              onClick={() => handleTacticalCommand("strike")}
              className={`group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-red-500/50 hover:border-red-500 bg-black/60 backdrop-blur-sm hover:bg-black flex items-center justify-center transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:scale-110 ${strikeUses >= getTacticalLimit() ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
              disabled={strikeUses >= getTacticalLimit()}
            >
              <i className="fa-solid fa-satellite text-red-500 text-lg"></i>
              <div className="absolute -bottom-1 -right-1 bg-red-900 border border-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">
                {getTacticalLimit() - strikeUses}
              </div>
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-black/90 border border-red-500/30 px-3 py-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity flex flex-col items-end backdrop-blur-md">
                <div className="text-[10px] sm:text-xs font-bold text-red-500 mb-1 flex items-center gap-1 font-serif tracking-widest uppercase">
                  Orbital Strike <i className="fa-solid fa-satellite"></i>
                </div>
                <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest">
                  -20% HP Boss
                </div>
                <div className="text-[9px] text-red-400 font-mono mt-0.5">
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
              className={`group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-green-500/50 hover:border-green-500 bg-black/60 backdrop-blur-sm hover:bg-black flex items-center justify-center transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] hover:scale-110 ${healUses >= getTacticalLimit() ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
              disabled={healUses >= getTacticalLimit()}
            >
              <i className="fa-solid fa-kit-medical text-green-500 text-lg"></i>
              <div className="absolute -bottom-1 -right-1 bg-green-900 border border-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">
                {getTacticalLimit() - healUses}
              </div>
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-black/90 border border-green-500/30 px-3 py-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity flex flex-col items-end backdrop-blur-md">
                <div className="text-[10px] sm:text-xs font-bold text-green-500 mb-1 flex items-center gap-1 font-serif tracking-widest uppercase">
                  Emergency Repair <i className="fa-solid fa-kit-medical"></i>
                </div>
                <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest">
                  Phục hồi 30% Sinh Lực Đoàn
                </div>
                <div className="text-[9px] text-green-400 font-mono mt-0.5">
                  (Còn {getTacticalLimit() - healUses}/{getTacticalLimit()}{" "}
                  lượt)
                </div>
                <div className="text-[10px] text-cinematic-gold font-bold mt-1 bg-cinematic-gold/10 border border-cinematic-gold/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                  <i className="fa-solid fa-coins"></i> 50 DC
                </div>
              </div>
            </button>
          </div>

          {/* Top: Boss Section */}
          <motion.div
            animate={
              shakeBoss
                ? {
                    x: [-20, 20, -20, 20, 0],
                    y: [-10, 10, -10, 10, 0],
                    rotate: [-2, 2, -2, 2, 0],
                  }
                : {}
            }
            className="w-full max-w-lg flex flex-col items-center relative z-20 mt-8"
          >
            <div
              className={`relative group ${flashBoss ? "brightness-[3] saturate-200 blur-sm" : ""} transition-all duration-75`}
            >
              {/* Boss Aura */}
              <div className="absolute -inset-10 bg-red-600/10 blur-[60px] animate-pulse rounded-full pointer-events-none"></div>

              <div className="w-36 h-36 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-3xl overflow-hidden border-2 border-red-500/40 shadow-[0_0_80px_rgba(220,38,38,0.5)] bg-black relative transform scale-100 hover:scale-105 transition-transform">
                <img
                  src={boss.imageUrl || undefined}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  alt={boss.name}
                />

                {/* Scanning effect */}
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-px bg-red-400/30 z-10 box-shadow-[0_0_10px_#f87171]"
                ></motion.div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                {/* Damage Popups for Boss - Enhanced */}
                <AnimatePresence>
                  {damagePopups
                    .filter((p) => (p as any).target === "boss")
                    .map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 1, y: 40, scale: 0.2, rotate: -10 }}
                        animate={{
                          opacity: 0,
                          y: -200,
                          scale: p.isCrit ? 3 : 1.8,
                          rotate: 10,
                        }}
                        className={`absolute inset-0 flex items-center justify-center pointer-events-none z-[110] font-black italic ${p.isCrit ? "text-cinematic-cyan text-7xl drop-shadow-[0_0_25px_rgba(0,243,255,1)]" : "text-orange-500 text-5xl drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]"}`}
                        style={{ left: `${p.x}px` }}
                      >
                        {p.value}
                        {p.isCrit && (
                          <div className="absolute -top-6 text-xs uppercase font-serif tracking-[0.5em] text-white">
                            Critical
                          </div>
                        )}
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-1.5 rounded-full text-[10px] font-black text-white border-2 border-white/20 whitespace-nowrap shadow-2xl flex items-center gap-3 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]"
              >
                <i className="fa-solid fa-skull animate-bounce"></i>
                <span className="tracking-widest">
                  {boss.name.toUpperCase()}
                </span>
                <div className="w-px h-3 bg-white/20"></div>
                <span className="opacity-70 font-mono text-[8px]">
                  THREAT: {boss.threatLevel}
                </span>
              </motion.div>
            </div>

            {/* Boss Health Glass UI */}
            <div className="w-full max-w-sm mt-12 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-2xl">
              <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[7px] font-black border ${bf.border} ${bf.color} uppercase shadow-lg`}
                  >
                    {bf.name}
                  </span>
                  {be && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[7px] font-black border border-white/10 ${be.color} uppercase shadow-lg`}
                    >
                      {be.name}
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono font-bold text-red-500 flex items-baseline gap-1">
                  <span className="text-sm">{displayBossHp}</span>
                  <span className="opacity-30">/ {boss.hp}</span>
                </div>
              </div>
              <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 shadow-inner relative ring-2 ring-red-900/20">
                {/* Ghost Health (Orange) */}
                <div
                  className="absolute inset-0 bg-orange-500 opacity-30 transition-all duration-1000 ease-out"
                  style={{ width: `${(displayBossHp / boss.hp) * 100}%` }}
                ></div>
                <motion.div
                  className="h-full bg-gradient-to-r from-red-800 via-red-500 to-orange-400 relative z-10 box-shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(displayBossHp / boss.hp) * 100}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-shimmer"></div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Center: Action Clear Zone - Cinematic Slash */}
          <div className="flex-1 w-full flex flex-col items-center justify-center relative">
            <AnimatePresence>
              {activeAttackerIdx !== null && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1, skewX: -20 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="h-px bg-gradient-to-r from-transparent via-cinematic-cyan to-transparent absolute z-0"
                ></motion.div>
              )}
            </AnimatePresence>
            <div className="py-2 text-[9px] font-mono text-zinc-700 tracking-[1em] uppercase opacity-40 font-bold">
              Orbital_Engagement_Link
            </div>
          </div>

          {/* Bottom: Squad Section */}
          <motion.div className="w-full max-w-lg flex flex-col items-center relative z-20">
            <div className="w-full max-w-sm mb-6 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-start mb-2 px-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
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
                <div className="text-[10px] font-mono font-bold text-green-400 flex items-baseline gap-1 mt-1">
                  <span className="text-sm">{displaySquadHp}</span>
                  <span className="opacity-30">/ {squadHp}</span>
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

            <div
              className={`flex justify-center gap-3 sm:gap-10 relative items-end pb-4 ${flashSquad ? "brightness-150" : ""}`}
            >
              {/* Damage Popups for Squad */}
              <AnimatePresence>
                {damagePopups
                  .filter((p) => (p as any).target === "squad")
                  .map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 1, y: 0, scale: 0.5 }}
                      animate={{ opacity: 0, y: -250, scale: 2 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[110] font-black text-red-500 text-6xl drop-shadow-[0_0_30px_rgba(239,68,68,1)]"
                      style={{ left: `${p.x}px` }}
                    >
                      -{p.value}
                    </motion.div>
                  ))}
              </AnimatePresence>
              {renderSquadSlot(squad[0], 0)}
              {renderSquadSlot(squad[1], 1)}
              {renderSquadSlot(squad[2], 2)}
            </div>
          </motion.div>

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

      <div className="w-full max-w-5xl glass-panel rounded-3xl p-4 sm:p-6 mb-8 relative border border-red-900/30 overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.05)]">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #ef4444 0, #ef4444 1px, transparent 0, transparent 50%)",
            backgroundSize: "30px 30px",
          }}
        ></div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative z-10 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-900/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
              <i className="fa-solid fa-crosshairs text-xl animate-pulse"></i>
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-white tracking-widest uppercase leading-none">
                MILITARY OPS
              </h2>
              <p className="text-[9px] text-zinc-500 font-mono tracking-widest mt-1">
                STATUS: ANALYZING_THREATS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-2 border border-white/5">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono mb-0.5">
                SQUAD_HP
              </span>
              <span className="text-xs font-mono font-bold text-green-400 tabular-nums">
                {displaySquadHp}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono mb-0.5">
                SQUAD_ATK
              </span>
              <span className="text-xs font-mono font-bold text-orange-400 tabular-nums">
                {squadAtk}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-zinc-500 uppercase font-mono mb-0.5">
                DODGE
              </span>
              <span className="text-xs font-mono font-bold text-cinematic-cyan tabular-nums">
                {dodgeRate}%
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap justify-center items-center gap-2 text-[9px] text-cinematic-muted mb-6 relative z-10 font-mono bg-black/50 py-1.5 px-4 rounded-lg border border-white/5 w-fit mx-auto cursor-help"
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
            <div className="w-full max-w-3xl bg-black/40 border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none"></div>
              <i className="fa-solid fa-satellite-dish text-3xl sm:text-4xl text-cinematic-muted mb-3 animate-pulse"></i>
              <p className="text-xs sm:text-sm text-white/80 mb-2 font-serif tracking-wide">
                HỆ THỐNG RADAR TRINH SÁT (SECTOR SCAN)
              </p>
              <p className="text-[10px] text-zinc-500 mb-6 font-mono max-w-lg">
                Phát hiện mục tiêu dựa trên thực lực đội hình. Có 3 khu vực với
                mức độ nguy hiểm khác nhau.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
                {/* Normal Scanner */}
                <button
                  onClick={() => handleScan("normal")}
                  disabled={isGlobalProcessing}
                  className="flex-1 bg-black border border-white/10 hover:border-cinematic-cyan/50 p-4 rounded-xl transition-all group flex flex-col items-center disabled:opacity-50"
                >
                  <div className="text-cinematic-cyan mb-2 text-xl group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-radar"></i>
                  </div>
                  <div className="text-[10px] font-bold text-white tracking-widest uppercase mb-1">
                    Cơ Bản
                  </div>
                  <div className="text-[9px] text-zinc-500 mb-2">
                    Thưởng: Tiêu chuẩn
                  </div>
                  <div className="text-[10px] font-mono text-cinematic-gold bg-cinematic-gold/10 px-2 py-0.5 rounded">
                    50 DC
                  </div>
                </button>

                {/* Elite Scanner */}
                <button
                  onClick={() => handleScan("elite")}
                  disabled={isGlobalProcessing}
                  className="flex-1 bg-black border border-white/10 hover:border-purple-500/50 p-4 rounded-xl transition-all group flex flex-col items-center disabled:opacity-50"
                >
                  <div className="text-purple-400 mb-2 text-xl group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-satellite"></i>
                  </div>
                  <div className="text-[10px] font-bold text-white tracking-widest uppercase mb-1">
                    Tinh Anh
                  </div>
                  <div className="text-[9px] text-zinc-500 mb-2">
                    Thưởng: x2 - x3
                  </div>
                  <div className="text-[10px] font-mono text-cinematic-gold bg-cinematic-gold/10 px-2 py-0.5 rounded">
                    100 DC
                  </div>
                </button>

                {/* Nightmare Scanner */}
                <button
                  onClick={() => handleScan("nightmare")}
                  disabled={isGlobalProcessing}
                  className="flex-1 bg-red-900/20 border border-red-500/30 hover:border-red-500 hover:bg-red-900/40 p-4 rounded-xl transition-all group flex flex-col items-center disabled:opacity-50 relative overflow-hidden"
                >
                  <div className="absolute -inset-4 bg-red-600/10 blur-xl group-hover:bg-red-600/20 transition-colors"></div>
                  <div className="text-red-500 mb-2 text-xl group-hover:scale-110 transition-transform relative z-10">
                    <i className="fa-solid fa-biohazard animate-pulse"></i>
                  </div>
                  <div className="text-[10px] font-bold text-red-100 tracking-widest uppercase mb-1 relative z-10 drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]">
                    Ác Mộng
                  </div>
                  <div className="text-[9px] text-red-300/70 mb-2 relative z-10">
                    Thưởng: Khổng Lồ
                  </div>
                  <div className="text-[10px] font-mono text-red-400 bg-red-500/20 px-2 py-0.5 rounded relative z-10 border border-red-500/30">
                    200 DC
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div
              id="bossContainer"
              className={`w-full max-w-2xl bg-zinc-950/80 border border-red-900/40 rounded-2xl p-5 flex flex-col sm:flex-row gap-6 shadow-[0_0_40px_rgba(220,38,38,0.1)] relative overflow-hidden backdrop-blur-md ${shakeBoss ? "combat-shake" : ""} ${flashBoss ? "bg-red-500/20" : ""}`}
            >
              <AnimatePresence>
                {damagePopups
                  .filter((p) => (p as any).target === "boss")
                  .map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 1, y: 0, scale: 0.5 }}
                      animate={{
                        opacity: 0,
                        y: -100,
                        scale: p.isCrit ? 2 : 1.2,
                      }}
                      className={`absolute pointer-events-none z-[100] font-black italic ${p.isCrit ? "text-cinematic-cyan text-4xl drop-shadow-[0_0_10px_rgba(0,243,255,1)]" : "text-orange-500 text-2xl"}`}
                      style={{
                        left: `calc(50% + ${p.x}px)`,
                        top: `calc(40% + ${p.y}px)`,
                      }}
                    >
                      {p.isCrit && (
                        <div className="text-[10px] uppercase tracking-[0.3em] font-mono mb-[-10px] text-center">
                          Critical
                        </div>
                      )}
                      {p.value}
                    </motion.div>
                  ))}
              </AnimatePresence>

              {!inBattle && (
                <button
                  onClick={cancelBoss}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white/50 hover:text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors z-20 shadow-lg border border-white/10"
                  title="Rút lui / Đổi mục tiêu"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}

              <div className="w-full sm:w-48 h-48 rounded-xl overflow-hidden relative border border-white/5 shrink-0 shadow-2xl bg-black">
                <img
                  src={boss.imageUrl || undefined}
                  className="w-full h-full object-cover transform scale-110"
                  crossOrigin="anonymous"
                  alt={boss.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded shadow flex gap-1 items-center border border-white/20">
                  <span className="font-mono">
                    THREAT_LV {boss.threatLevel}
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const bf = getFactionInfo(boss.faction);
                    const be = boss.element
                      ? (ELEMENTS as any)[boss.element] || null
                      : null;
                    return (
                      <>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black border ${bf.border} ${bf.color} shadow-sm uppercase tracking-tighter`}
                        >
                          <i className={`fa-solid ${bf.icon} mr-1`}></i>{" "}
                          {bf.name}
                        </span>
                        {be && (
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black border border-white/10 ${be.color} shadow-sm uppercase tracking-tighter`}
                          >
                            <i className={`fa-solid ${be.icon} mr-1`}></i>{" "}
                            {be.name}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>

                <h3 className="text-3xl font-serif text-white mb-2 leading-none tracking-tight">
                  {boss.name}
                </h3>

                {/* Boss Health Bar */}
                <div className="w-full mb-4">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                      Target_Core_integrity
                    </span>
                    <span className="text-xs font-mono font-bold text-red-400 tabular-nums">
                      {displayBossHp} / {boss.hp}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-300 ease-out"
                      style={{ width: `${(displayBossHp / boss.hp) * 100}%` }}
                    ></div>
                    {/* Notch markers */}
                    <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                      {[...Array(9)].map((_, i) => (
                        <div
                          key={i}
                          className="border-r border-black/20 h-full"
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-black/40 border border-white/5 p-2 rounded-lg">
                    <div className="text-[8px] text-zinc-500 font-mono uppercase mb-1">
                      Combat_Power
                    </div>
                    <div className="text-sm font-bold text-orange-400 font-mono">
                      <i className="fa-solid fa-burst mr-1 opacity-60"></i>{" "}
                      {boss.attack}
                    </div>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-2 rounded-lg">
                    <div className="text-[8px] text-zinc-500 font-mono uppercase mb-1">
                      Recovery_Data
                    </div>
                    <div className="text-sm font-bold text-cinematic-gold font-mono">
                      <i className="fa-solid fa-database mr-1 opacity-60"></i>{" "}
                      {boss.reward}
                    </div>
                  </div>
                </div>

                {boss.passiveSkill && (
                  <div className="px-2 py-1.5 bg-white/5 border-l-2 border-cinematic-gold rounded-r text-[9px] text-zinc-400 font-mono italic relative">
                    <span className="text-cinematic-gold font-bold not-italic mr-2">
                      SYS_MSG:
                    </span>
                    <span className={showFullPassive ? "" : "line-clamp-2"}>
                      "{boss.passiveSkill}"
                    </span>
                    {boss.passiveSkill.length > 80 && (
                      <button
                        onClick={() => setShowFullPassive(!showFullPassive)}
                        className="text-cinematic-cyan ml-2 hover:underline not-italic font-bold"
                      >
                        {showFullPassive ? "[CLOSE]" : "[MORE]"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Combat Dashboard Layout */}
        <div className="w-full flex flex-col lg:flex-row gap-6 relative z-20">
          {/* Left/Main Area: Combat Focus */}
          <div className="flex-1 flex flex-col gap-8">
            {/* Squad Area */}
            <div className="w-full relative py-6 border-y border-white/5 bg-black/20 rounded-3xl">
              <div className="flex items-center justify-between px-6 mb-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${inBattle ? "bg-green-500 animate-pulse" : "bg-green-800"}`}
                    ></div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                      SQUAD_INTEGRITY
                    </span>
                  </div>
                  {activeSynergies && activeSynergies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {activeSynergies.map((syn, idx) => (
                        <div
                          key={idx}
                          className="bg-cinematic-cyan/10 border border-cinematic-cyan/30 text-cinematic-cyan text-[9px] px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_5px_rgba(0,243,255,0.2)]"
                        >
                          <i className="fa-solid fa-link"></i> {syn}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-green-400">
                  {displaySquadHp} / {squadHp}
                </span>
              </div>

              <div className="h-1.5 w-full max-w-md mx-auto bg-white/5 rounded-full overflow-hidden mb-8 px-6">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all duration-300"
                  style={{ width: `${(displaySquadHp / squadHp) * 100}%` }}
                ></div>
              </div>

              <div
                className={`flex justify-center gap-4 sm:gap-8 relative ${shakeSquad ? "combat-shake" : ""} ${flashSquad ? "bg-white/5 rounded-3xl" : ""}`}
              >
                <AnimatePresence>
                  {damagePopups
                    .filter((p) => (p as any).target === "squad")
                    .map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: -100 }}
                        className="absolute pointer-events-none z-[100] font-black text-red-500 text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,1)]"
                        style={{ left: `calc(50% + ${p.x}px)`, top: "20px" }}
                      >
                        -{p.value}
                      </motion.div>
                    ))}
                </AnimatePresence>
                {renderSquadSlot(squad[0], 0)}
                {renderSquadSlot(squad[1], 1)}
                {renderSquadSlot(squad[2], 2)}
              </div>
            </div>

            {/* Control Area */}
            <div className="flex justify-center items-center py-4">
              <button
                onClick={executeBattle}
                disabled={
                  !boss ||
                  squad.filter((c) => c !== null).length === 0 ||
                  inBattle ||
                  isGlobalProcessing
                }
                className={`group relative overflow-hidden px-12 py-4 rounded-2xl font-bold tracking-[0.3em] uppercase transition-all duration-500 shadow-2xl border flex flex-col items-center justify-center gap-2 ${inBattle ? "bg-zinc-900 border-red-500/30 text-red-500/50 scale-95" : "bg-red-600 border-red-500 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95"}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <i
                  className={`fa-solid ${inBattle ? "fa-spinner fa-spin" : "fa-bolt text-2xl animate-bounce"}`}
                ></i>
                <span className="text-[10px]">
                  {inBattle ? "ENGAGED" : "INITIATE OPS"}
                </span>
              </button>
            </div>
          </div>

          {/* Right Area: Ops Log */}
          <div
            className={`w-full lg:w-80 shrink-0 flex flex-col gap-4 ${inBattle ? "opacity-100 translate-y-0" : "opacity-60 lg:opacity-100"}`}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                <i className="fa-solid fa-file-invoice mr-2"></i>Mission_Log
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
              className="bg-zinc-950/80 border border-white/5 rounded-xl p-4 font-mono text-[10px] leading-relaxed text-zinc-500 shadow-inner h-[200px] lg:h-[450px] overflow-y-auto no-scrollbar scroll-smooth backdrop-blur-sm"
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
