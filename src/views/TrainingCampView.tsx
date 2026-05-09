import React, { useState, useEffect } from "react";
import { Icon } from "../components/ui/Icon";
import { Card, Inventory } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { MiniCard } from "../components/MiniCard";
import { Dialog } from "../components/ui/Dialog";
import { AppConfig } from "../types";
import { t } from "../lib/i18n";

interface Props {
  config: AppConfig;
  cards: Card[];
  updateCard: (c: Card) => void;
  onAlert: (t: string, m: string) => void;
  inventory: Inventory;
  modifyInventory: (
    d?: number,
    e?: number,
    mat?: Record<string, number>,
    quantumDust?: number,
  ) => void;
  isGlobalProcessing: boolean;
  setGlobalProcessing: (v: boolean) => void;
}

const EXP_REQ = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000]; // up to level 10
export const MAX_LEVEL = 10;

const COURSES = [
  { id: 'light', name: 'Light Routine', expGain: 50, durationMin: 5, dustCost: 50, shardCost: 0, coreCost: 0, icon: 'fa-person-running', color: 'text-green-400' },
  { id: 'intense', name: 'Intense Drill', expGain: 200, durationMin: 30, dustCost: 100, shardCost: 1, coreCost: 0, icon: 'fa-dumbbell', color: 'text-blue-400' },
  { id: 'tactics', name: 'Advanced Tactics', expGain: 500, durationMin: 120, dustCost: 300, shardCost: 2, coreCost: 0, icon: 'fa-chess-knight', color: 'text-yellow-400' },
  { id: 'special', name: 'Special Ops', expGain: 1200, durationMin: 360, dustCost: 500, shardCost: 0, coreCost: 1, icon: 'fa-crosshairs', color: 'text-purple-400' },
  { id: 'awakening', name: 'Awakening Path', expGain: 3000, durationMin: 720, dustCost: 1000, shardCost: 0, coreCost: 2, icon: 'fa-dna', color: 'text-cinematic-gold' },
];

export const TrainingCampView: React.FC<Props> = ({
  config,
  cards,
  updateCard,
  onAlert,
  inventory,
  modifyInventory,
  isGlobalProcessing,
  setGlobalProcessing,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedCard = cards.find((c) => c.id === selectedCardId) || null;
  const currentLevel = selectedCard?.level || 1;
  const currentExp = selectedCard?.exp || 0;

  const isMaxLevel = currentLevel >= MAX_LEVEL;
  const expNeeded = isMaxLevel
    ? 0
    : EXP_REQ[currentLevel] || EXP_REQ[EXP_REQ.length - 1];
  const progress = isMaxLevel ? 100 : (currentExp / expNeeded) * 100;

  const handleStartTraining = (courseId: string) => {
    if (!selectedCard) {
      onAlert('Lỗi', 'Vui lòng chọn thẻ để huấn luyện.'); return;
    }
    if (selectedCard.trainingSession) {
      onAlert('Lỗi', 'Thẻ này đang trong quá trình huấn luyện.'); return;
    }
    if (isMaxLevel) {
      onAlert('Thông báo', 'Thẻ này đã đạt cấp độ tối đa!'); return;
    }

    const course = COURSES.find((c) => c.id === courseId);
    if (!course) return;

    if (inventory.quantumDust < course.dustCost) {
      onAlert("Lỗi", `Bạn cần ${course.dustCost} Quantum Dust.`); return;
    }
    
    const matReqShard = `${selectedCard.element} Shard`;
    const matReqCore = `${selectedCard.faction} Core`;
    const ownedShard = (inventory.materials || {})[matReqShard] || 0;
    const ownedCore = (inventory.materials || {})[matReqCore] || 0;

    if (ownedShard < course.shardCost) {
      onAlert("Lỗi", `Bạn cần ${course.shardCost}x ${matReqShard}.`); return;
    }
    if (ownedCore < course.coreCost) {
      onAlert("Lỗi", `Bạn cần ${course.coreCost}x ${matReqCore}.`); return;
    }

    const deductObj: Record<string, number> = {};
    if (course.shardCost > 0) deductObj[matReqShard] = -course.shardCost;
    if (course.coreCost > 0) deductObj[matReqCore] = -course.coreCost;
    
    let costMsg = `Phí: <span class="text-cinematic-cyan font-bold">${course.dustCost} Dust</span>`;
    if (course.shardCost > 0) costMsg += `, <span class="text-blue-400 font-bold">${course.shardCost}x ${matReqShard}</span>`;
    if (course.coreCost > 0) costMsg += `, <span class="text-cinematic-gold font-bold">${course.coreCost}x ${matReqCore}</span>`;

    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận huấn luyện',
      message: `Cho thẻ <strong>${selectedCard.name}</strong> tham gia khóa <strong>${course.name}</strong>?<br><br>${costMsg}`,
      onConfirm: () => {
        modifyInventory(0, 0, Object.keys(deductObj).length > 0 ? deductObj : undefined, -course.dustCost);

        const startTime = Date.now();
        const endTime = startTime + course.durationMin * 60 * 1000;
        
        updateCard({
          ...selectedCard,
          trainingSession: {
            type: course.name,
            startTime,
            endTime,
            expGain: course.expGain
          }
        });

        onAlert("Bắt đầu huấn luyện", `${selectedCard.name} đã bắt đầu khóa huấn luyện ${course.name}.`);
      }
    });
  };

  const handleClaim = (card: Card) => {
     if (!card.trainingSession) return;
     if (Date.now() < card.trainingSession.endTime) {
        onAlert('Chưa hoàn thành', 'Quá trình huấn luyện chưa kết thúc!');
        return;
     }

     const gain = card.trainingSession.expGain;
     let newExp = (card.exp || 0) + gain;
     let newLevel = card.level || 1;

     while (newLevel < MAX_LEVEL && newExp >= (EXP_REQ[newLevel] || 999999)) {
       newExp -= EXP_REQ[newLevel];
       newLevel++;
     }

     if (newLevel >= MAX_LEVEL) {
       newLevel = MAX_LEVEL;
       newExp = 0;
       onAlert("Thành công", `Huấn luyện đỉnh cao! ${card.name} đã đạt Cấp Tối Đa (${MAX_LEVEL})!`);
     } else {
       onAlert("Hoàn thành huấn luyện", `${card.name} nhận được +${gain} EXP. Cấp độ hiện tại: ${newLevel}.`);
     }

     const updatedCard = { ...card, level: newLevel, exp: newExp };
     delete updatedCard.trainingSession; 
     updateCard(updatedCard);
  };
  
  const handleCancel = (card: Card) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hủy huấn luyện',
      message: 'Bạn có chắc muốn hủy khóa huấn luyện? Các tài nguyên đã trả sẽ <strong class="text-red-400">KHÔNG</strong> được hoàn lại.',
      onConfirm: () => {
        onAlert('Hủy huấn luyện', `Đã hủy khóa huấn luyện của ${card.name}. Mất phí nhưng không được cộng EXP.`);
        const updatedCard = { ...card };
        delete updatedCard.trainingSession;
        updateCard(updatedCard);
      }
    });
  };

  const getFormatTime = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div className="flex flex-col items-center py-6 px-4 pb-24 lg:flex-row lg:items-start lg:justify-center gap-6">
      {/* Left List */}
      <div className="w-full lg:w-1/3 max-w-sm flex flex-col gap-4">
        <h2 className="text-xl font-serif text-white uppercase tracking-widest border-b border-white/10 pb-2">
          {t(config.language || 'vi', 'training.available')}
        </h2>
        <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[80vh] custom-scrollbar pr-2 pb-10">
          {cards.map((c) => {
            const isTraining = !!c.trainingSession;
            const isReady = isTraining && now >= c.trainingSession!.endTime;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCardId(c.id)}
                className={`cursor-pointer transition-transform transform hover:scale-105 relative ${selectedCardId === c.id ? "ring-2 ring-cinematic-cyan ring-offset-2 ring-offset-black" : "ring-1 ring-white/10"}`}
                style={{ borderRadius: "12px" }}
              >
                <MiniCard card={c} />
                <div className="bg-black/80 text-center py-1 mt-1 rounded text-[10px] font-mono text-white tracking-widest uppercase flex justify-center items-center gap-2">
                  {t(config.language || 'vi', 'training.level')}: {c.level || 1}
                  {isTraining && !isReady && <Icon name="fa-person-running animate-bounce text-yellow-500" />}
                  {isReady && <Icon name="fa-check text-green-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 max-w-2xl bg-cinematic-900/40 border border-green-500/10 ring-1 ring-green-500/20 rounded-3xl p-6 sm:p-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.5),0_0_40px_rgba(34,197,94,0.05)] relative backdrop-blur-md">
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-2xl sm:text-4xl font-serif text-transparent bg-clip-text bg-gradient-to-br from-white via-green-300 to-green-500 uppercase tracking-[0.3em] mb-4">
            <Icon
              name="fa-dumbbell mr-3 text-green-400"
              className="fa-dumbbell mr-3 text-green-400"
            />
            {t(config.language || 'vi', 'training.title')}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono tracking-widest uppercase">
            {t(config.language || 'vi', 'training.subtitle')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {selectedCard ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex flex-col sm:flex-row gap-6 mb-8 bg-black/40 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="w-full sm:w-1/3 flex-shrink-0 relative">
                  <MiniCard card={selectedCard} />
                  {selectedCard.trainingSession && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm rounded-lg border border-yellow-500/30">
                        {now >= selectedCard.trainingSession.endTime ? (
                           <div className="text-center">
                              <Icon name="fa-check-circle text-4xl text-green-500 mb-2 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                              <div className="text-[10px] font-mono text-green-400 uppercase font-bold tracking-widest">Training Complete</div>
                           </div>
                        ) : (
                           <div className="text-center">
                              <Icon name="fa-person-running text-4xl text-yellow-500 mb-2 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse" />
                              <div className="text-[10px] font-mono text-yellow-400 uppercase font-bold tracking-widest mb-1">In Progress</div>
                              <div className="text-[9px] font-mono text-white">{getFormatTime(selectedCard.trainingSession.endTime - now)}</div>
                           </div>
                        )}
                     </div>
                  )}
                </div>
                <div className="w-full sm:w-2/3 flex flex-col justify-center">
                  <h3 className="text-xl text-white font-serif tracking-widest uppercase mb-1">
                    {selectedCard.name}
                  </h3>
                  <div className="text-[10px] text-zinc-400 font-mono tracking-[0.2em] mb-4 uppercase">
                    {selectedCard.faction} {selectedCard.element}{" "}
                    {selectedCard.role || "Striker"}
                  </div>

                  <div className="mb-2 flex justify-between items-end">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Level {currentLevel}{" "}
                      {isMaxLevel && (
                        <span className="text-amber-400 ml-1">(MAX)</span>
                      )}
                    </span>
                    {!isMaxLevel && (
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        {currentExp} / {expNeeded} EXP
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-black rounded-full h-2 border border-white/10 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-500 ease-out relative"
                      style={{ width: `${progress}%` }}
                    >
                        {selectedCard.trainingSession && now < selectedCard.trainingSession.endTime && (
                            <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {!isMaxLevel && !selectedCard.trainingSession && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {COURSES.map(course => (
                     <button
                        key={course.id}
                        onClick={() => handleStartTraining(course.id)}
                        className={`bg-black/60 border border-white/10 hover:border-white/30 p-4 rounded-xl flex flex-col justify-center items-center gap-2 group transition-all text-center`}
                     >
                        <span className={`font-serif uppercase tracking-widest text-sm ${course.color} opacity-80 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-2`}>
                           <Icon name={`${course.icon} text-xl`} /> {course.name}
                        </span>
                        <span className="text-[10px] text-white font-mono bg-white/10 px-2 py-0.5 rounded-full mt-1">
                           +{course.expGain} EXP
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono flex items-center gap-1 mt-1">
                           <Icon name="fa-clock" /> {course.durationMin >= 60 ? `${(course.durationMin/60).toFixed(1)}h` : `${course.durationMin}m`}
                        </span>
                        <div className="w-full h-px bg-white/10 my-1"></div>
                        <span className="text-[9px] text-zinc-500 font-mono flex items-center flex-wrap justify-center gap-2">
                           <span className="flex items-center gap-1"><Icon name="fa-coins text-cinematic-gold" /> {course.dustCost}</span>
                           {course.shardCost > 0 && <span className="flex items-center gap-1"><Icon name="fa-gem text-cinematic-cyan" /> {course.shardCost}</span>}
                           {course.coreCost > 0 && <span className="flex items-center gap-1"><Icon name="fa-cube text-purple-400" /> {course.coreCost}</span>}
                        </span>
                     </button>
                  ))}
                </div>
              )}

              {selectedCard.trainingSession && (
                 <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center space-y-6 mt-4">
                    <div>
                       <h4 className="text-xl font-serif text-white tracking-widest uppercase mb-2">
                          <Icon name="fa-chalkboard-user mr-2 text-zinc-400" /> {selectedCard.trainingSession.type}
                       </h4>
                       <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                          Dự kiến nhận: <span className="text-green-400 font-bold">+{selectedCard.trainingSession.expGain} EXP</span>
                       </p>
                    </div>

                    {now >= selectedCard.trainingSession.endTime ? (
                       <button
                          onClick={() => handleClaim(selectedCard)}
                          className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-lg text-xs tracking-widest uppercase shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all"
                       >
                          <Icon name="fa-check mr-2" /> Hoàn thành & Nhận EXP
                       </button>
                    ) : (
                       <div className="space-y-4">
                          <div className="text-3xl font-mono text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                             {getFormatTime(selectedCard.trainingSession.endTime - now)}
                          </div>
                          <div>
                            <button
                                onClick={() => handleCancel(selectedCard)}
                                className="text-[10px] text-red-500 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg font-mono uppercase tracking-widest transition-colors border border-red-500/20"
                            >
                                <Icon name="fa-xmark mr-1" /> Hủy (Mất học phí)
                            </button>
                          </div>
                       </div>
                    )}
                 </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="unselected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-zinc-800 font-mono text-center flex flex-col items-center justify-center gap-4 w-full h-[300px] border border-white/5 border-dashed rounded-3xl bg-black/30"
            >
              <Icon
                name="fa-id-badge text-6xl opacity-30 mb-2"
                className="fa-id-badge text-6xl opacity-30 mb-2"
              />
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em]">
                {t(config.language || 'vi', 'training.selectPrompt')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <Dialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="confirm"
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        config={config}
      />
    </div>
  );
};
