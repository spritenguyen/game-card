import type { Card, Boss, Implant, Gear } from '../../types';
import { rollImplant, rollGear } from '../../domain/gameRules';

export type CombatMode = 'battlefield' | 'single_boss' | 'world_boss' | 'phantasm';
export interface CombatResult {
  status: 'victory' | 'defeat' | 'draw';
  title: string;
  rating: string;
  turns: number;
  exp: number;
  rewards: { label: string; value: string | number; colorClass?: string }[];
  message: string;
}
export interface CombatOutcomeInput {
  opTab: CombatMode;
  boss: Boss;
  enemySquad: (Boss | null)[];
  squad: (Card | null)[];
  level: number;
  worldBossState: { level: number };
  phantasmProgress?: { floor: number };
  currentEnemyHps: number[];
  currentCardHps: number[];
  currentSquadHp: number;
  turn: number;
  totalActions: number;
  MAX_ACTIONS: number;
}
export interface CombatOutcomePorts {
  isCancelled: () => boolean;
  setWorldBossState: (update: (previous: any) => any) => void;
  modifyCurrency: (amount: number) => void;
  modifyInventory: (base: number, elite: number, materials?: Record<string, number>) => void;
  gainExperience: (amount: number) => void;
  addLog: (message: string, className: string) => void;
  setCombatResult: (result: CombatResult) => void;
  setEnemySquad: (squad: (Boss | null)[]) => void;
  updateQuestProgress: (type: string, amount?: number) => void;
  onCampaignWin?: (stageId: string) => void;
  updateCard?: (card: Card) => Promise<void>;
  addImplant?: (implant: Implant) => Promise<void>;
  addGear?: (gear: Gear) => Promise<void>;
  onPhantasmWin?: (hp: Record<string, number>) => void;
  onPhantasmDefeat?: (hp: Record<string, number>) => void;
}

// Preserve reward RNG and effect order. A started persistence operation is not rolled back
// on cancellation; no following reward or presentation effect is allowed to start.
export async function resolveCombatOutcome(
  input: CombatOutcomeInput,
  ports: CombatOutcomePorts,
  loot = { rollImplant, rollGear },
): Promise<void> {
  const { opTab, boss, enemySquad, squad, level, worldBossState, phantasmProgress,
    currentEnemyHps, currentCardHps, currentSquadHp, turn, totalActions, MAX_ACTIONS } = input;
  const { isCancelled, setWorldBossState, modifyCurrency, modifyInventory, gainExperience,
    addLog, setCombatResult, setEnemySquad, updateQuestProgress, onCampaignWin,
    updateCard, addImplant, addGear, onPhantasmWin, onPhantasmDefeat } = ports;
  const getTotalEnemyHp = () => currentEnemyHps.reduce((sum, hp) => sum + hp, 0);
  if (isCancelled()) return;
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

      const wbRewards: CombatResult['rewards'] = [
          { label: "Tiền Thưởng", value: `+${dcReward} DC`, colorClass: "text-cinematic-gold" },
          { label: "Tài Nguyên", value: `+${matReward} ${randMat}`, colorClass: "text-purple-400" }
      ];

      const imp = loot.rollImplant(level + worldBossState.level * 2, true);
      if (imp && addImplant) {
          await addImplant(imp);
          if (isCancelled()) return;
          wbRewards.push({ label: "Cấy Ghép", value: imp.name, colorClass: "text-amber-400" });
      }
      const gear = loot.rollGear(level + worldBossState.level * 2, true);
      if (gear && addGear) {
          await addGear(gear);
          if (isCancelled()) return;
          wbRewards.push({ label: "Trang Bị", value: gear.name, colorClass: "text-cinematic-gold" });
      }

      setCombatResult({
        status: "victory",
        title: "World Boss Tiêu Diệt!",
        rating: finalRating,
        turns: turn,
        exp: 0,
        rewards: wbRewards,
        message: `Mối đe dọa vũ trụ cấp ${worldBossState.level} đã bị trừ khử! Chiến dịch thành công.`
      });
    } else {
      const newBoss = { ...boss, hp: currentEnemyHps[0] };
      setWorldBossState((p: any) => ({ ...p, boss: newBoss }));
      modifyCurrency(50 * worldBossState.level);
      if (totalActions >= MAX_ACTIONS && currentSquadHp > 0) {
          addLog(`>>> HẾT GIỚI HẠN HÀNH ĐỘNG <<<`, "font-bold text-yellow-500 my-2 uppercase text-center");
          addLog(`Hệ thống rút lui khẩn cấp. Boss còn lại ${currentEnemyHps[0]} HP.`, "text-cinematic-cyan");
          setCombatResult({
            status: "draw",
            title: "Hết Thời Gian",
            rating: "D",
            turns: turn,
            exp: 0,
            rewards: [{ label: "Tiền An Ủi", value: `+${50 * worldBossState.level} DC` }],
            message: "Trận đấu đã hết giới hạn hành động. Hệ thống tự động kích hoạt giao thức rút lui. Sát thương lên Boss đã được ghi nhận."
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
      
      const parsedRewards: CombatResult['rewards'] = [];
      
      modifyCurrency(totalDc);
      gainExperience(expGained);
      
      addLog(
        `>>> CHIẾN THẮNG BATTLEFIELD! <<<`,
        "text-green-400 font-bold mt-2 border-t border-green-900/50 pt-2",
      );
      parsedRewards.unshift({ label: "Kinh Nghiệm", value: `+${expGained} EXP`, colorClass: "text-blue-400" });
      parsedRewards.unshift({ label: "Tiền Thưởng", value: `+${totalDc} DC`, colorClass: "text-cinematic-gold" });
      
      let msg = "Toàn bộ kẻ địch đã bị triệt tiêu!";
      const campaignBoss = enemySquad.find(e => e && e.campaignStageId);
      if (campaignBoss && onCampaignWin) {
          onCampaignWin(campaignBoss.campaignStageId!);
          msg = "Đã hoàn thành Nhiệm vụ Cốt truyện!";
      }

      const bfImpCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < bfImpCount; i++) {
          const imp = loot.rollImplant(level + 10, true);
          if (imp && addImplant) {
              await addImplant(imp);
              if (isCancelled()) return;
              parsedRewards.push({ label: "Cấy Ghép", value: imp.name, colorClass: "text-amber-400" });
          }
          const gear = loot.rollGear(level + 10, true);
          if (gear && addGear) {
              await addGear(gear);
              if (isCancelled()) return;
              parsedRewards.push({ label: "Trang Bị", value: gear.name, colorClass: "text-cinematic-gold" });
          }
      }

      if (updateCard) {
          for (const member of squad) {
              if (member) {
                  const diff = Math.floor(Math.random() * 5) + 5; // 5-9 affection per win
                  await updateCard({ ...member, affection: (member.affection || 0) + diff });
                  if (isCancelled()) return;
              }
          }
      }

      setCombatResult({
        status: "victory",
        title: `Trận chiến thành công`,
        rating: finalRating,
        turns: turn,
        exp: expGained,
        rewards: parsedRewards,
        message: msg
      });
      setEnemySquad([null, null, null, null, null, null]);
    } else if (opTab === "phantasm") {
      const totalDc = enemySquad.reduce((sum, b) => sum + (b ? b.reward : 0), 0) || 1000;
      const expGained = Math.floor(totalDc / 3);
      const parsedRewards: CombatResult['rewards'] = [];
      
      modifyCurrency(totalDc);
      gainExperience(expGained);
      
      // Random Phantom Core drop
      const coreDrop = Math.floor(Math.random() * 2) + 1;
      modifyInventory(0, 0, { "Phantom Core": coreDrop });

      addLog(
        `>>> VƯỢT TẦNG THÁP ẢO ẢNH! <<<`,
        "text-cyan-400 font-bold mt-2 border-t border-cyan-900/50 pt-2",
      );
      parsedRewards.push({ label: "Kinh Nghiệm", value: `+${expGained} EXP`, colorClass: "text-blue-400" });
      parsedRewards.push({ label: "Tiền Thưởng", value: `+${totalDc} DC`, colorClass: "text-cinematic-gold" });
      parsedRewards.push({ label: "Phantom Core", value: `+${coreDrop}`, colorClass: "text-purple-400" });

      const imp = loot.rollImplant(level + (phantasmProgress?.floor || 1) * 2, true);
      if (imp && addImplant) {
          await addImplant(imp);
          if (isCancelled()) return;
          parsedRewards.push({ label: "Cấy Ghép", value: imp.name, colorClass: "text-amber-400" });
      }
      
      const gear = loot.rollGear(level + (phantasmProgress?.floor || 1) * 2, true);
      if (gear && addGear) {
          await addGear(gear);
          if (isCancelled()) return;
          parsedRewards.push({ label: "Trang Bị", value: gear.name, colorClass: "text-cinematic-gold" });
      }

      setCombatResult({
        status: "victory",
        title: `Vượt Ải Thành Công!`,
        rating: finalRating,
        turns: turn,
        exp: expGained,
        rewards: parsedRewards,
        message: "Tất cả kẻ địch tầng này đã bị tiêu diệt. Sinh lực Đặc vụ sẽ được bảo lưu cho tầng tiếp theo!"
      });
      setEnemySquad([null, null, null, null, null, null]);
    } else {
      let baseDrop = 0;
      let eliteDrop = 0;
      let expGained = 0;
      let coreDrop = 0;
      let shardDrop = 0;
      
      if (boss.threatLevel.includes("Elite") || opTab === "single_boss") {
        baseDrop = opTab === "single_boss" ? 2 : 1;
        if (Math.random() < 0.15 || opTab === "single_boss") eliteDrop = 1;
        expGained = opTab === "single_boss" ? 25 : 15;
        shardDrop = Math.floor(Math.random() * 3) + 1; // 1-3 Shards
        if (Math.random() < 0.5) coreDrop = 1;         // 50% chance for 1 Core
      } else if (boss.threatLevel.includes("Nightmare")) {
        baseDrop = 1;
        eliteDrop = 1;
        if (Math.random() < 0.2) eliteDrop = 2;
        expGained = 30;
        shardDrop = Math.floor(Math.random() * 5) + 3; // 3-7 Shards
        coreDrop = Math.floor(Math.random() * 2) + 1;  // 1-2 Cores
      } else {
        if (Math.random() < 0.3) baseDrop = 1;
        expGained = 5;
        if (Math.random() < 0.3) shardDrop = 1;        // 30% chance for 1 Shard
      }

      const parsedRewards: CombatResult['rewards'] = [
        { label: "Tiền Thưởng", value: `+${boss.reward} DC`, colorClass: "text-green-400" },
        { label: "Kinh Nghiệm", value: `+${expGained} EXP`, colorClass: "text-blue-400" },
      ];
      if (baseDrop > 0) parsedRewards.push({ label: "Vé Tiêu Chuẩn", value: `+${baseDrop}`, colorClass: "text-cinematic-cyan" });
      if (eliteDrop > 0) parsedRewards.push({ label: "Vé Đặc Quyền", value: `+${eliteDrop}`, colorClass: "text-purple-400" });
      if (shardDrop > 0) parsedRewards.push({ label: "Equipment Shard", value: `+${shardDrop}`, colorClass: "text-blue-400" });
      if (coreDrop > 0) parsedRewards.push({ label: "Forge Core", value: `+${coreDrop}`, colorClass: "text-amber-500" });

      const imp = loot.rollImplant(level, boss.threatLevel !== "Minion");
      if (imp && addImplant) {
          await addImplant(imp);
          if (isCancelled()) return;
          parsedRewards.push({ label: "Cấy Ghép", value: imp.name, colorClass: "text-amber-400" });
      }
      
      const gear = loot.rollGear(level, boss.threatLevel !== "Minion");
      if (gear && addGear) {
          await addGear(gear);
          if (isCancelled()) return;
          parsedRewards.push({ label: "Trang Bị", value: gear.name, colorClass: "text-cinematic-gold" });
      }

      addLog(
        ">>> CHIẾN THẮNG! <<<",
        "text-green-400 font-bold mt-2 border-t border-green-900/50 pt-2",
      );
      modifyCurrency(boss.reward);
      gainExperience(expGained);
      updateQuestProgress("boss", 1);
      
      if (updateCard) {
          for (const member of squad) {
              if (member) {
                  const diff = Math.floor(Math.random() * 5) + 3; // 3-7 affection
                  await updateCard({ ...member, affection: (member.affection || 0) + diff });
                  if (isCancelled()) return;
              }
          }
      }

      const matDrops: Record<string, number> = {};
      if (coreDrop > 0) matDrops["Forge Core"] = coreDrop;
      if (shardDrop > 0) matDrops["Equipment Shard"] = shardDrop;
      
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
    if (totalActions >= MAX_ACTIONS && currentSquadHp > 0) {
        addLog(">>> HÒA - HẾT GIỚI HẠN HÀNH ĐỘNG <<<", "font-bold text-yellow-500 my-2 uppercase text-center");
        setCombatResult({
          status: "draw",
          title: "Thất Bại (Hòa)",
          rating: "D",
          turns: turn,
          exp: 0,
          rewards: [],
          message: "Đã hết giới hạn hành động mà chưa tiêu diệt được đối phương."
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

  if (opTab === "phantasm") {
    const finalHps: Record<string, number> = {};
    squad.forEach((c, idx) => {
      if (c) {
        finalHps[c.id] = currentCardHps[idx] > 0 ? currentCardHps[idx] : 0;
      }
    });
    if (getTotalEnemyHp() <= 0) onPhantasmWin?.(finalHps);
    else onPhantasmDefeat?.(finalHps);
  }

}
