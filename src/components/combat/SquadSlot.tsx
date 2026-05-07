import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../ui/Icon';
import { Card } from '../../types';
import { getFactionInfo, calculateCombatStats } from '../../lib/gameLogic';
import { ELEMENTS, STATUS_ICONS } from '../../lib/constants';

export interface SquadSlotProps {
  card: Card | null;
  index: number;
  inBattle: boolean;
  isAttacking: boolean;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  atb: number;
  shield: number;
  statuses: any[];
  leaderId: number | null;
  isMobileEnv: boolean;
  isDesktop: boolean;
  isLiteMode: boolean;
  deviceIOS: boolean;
  activeAttackVector: { x: number; y: number } | null;
  damagePopups: any[];
  onClick: (index: number) => void;
  onConfirm: (message: string, action: () => void) => void;
  setLeaderId: (id: number) => void;
  onClearSquadSlot: (index: number) => void;
}

export const SquadSlot = forwardRef<HTMLDivElement, SquadSlotProps>(
  (
    {
      card,
      index,
      inBattle,
      isAttacking,
      hp,
      maxHp,
      mana,
      maxMana,
      atb,
      shield,
      statuses,
      leaderId,
      isMobileEnv,
      isDesktop,
      isLiteMode,
      deviceIOS,
      activeAttackVector,
      damagePopups,
      onClick,
      onConfirm,
      setLeaderId,
      onClearSquadSlot,
    },
    ref
  ) => {
    if (!card) {
      return (
        <div
          ref={ref as any}
          key={`empty-${index}`}
          onClick={() => !inBattle && onClick(index)}
          className="w-24 h-36 lg:w-44 lg:h-60 rounded-xl flex flex-col items-center justify-center cursor-pointer relative group bg-black/40 border border-white/10 hover:border-cinematic-cyan/50 transition-all duration-300 overflow-hidden shadow-lg"
        >
          <Icon
            name="fa-plus text-xl text-white/20 mb-1"
            className="fa-plus text-xl text-white/20 mb-1"
          />
          <p className="text-[6px] lg:text-[8px] text-cinematic-muted tracking-widest uppercase font-mono">
            Deploy Unit
          </p>
        </div>
      );
    }

    const stats = calculateCombatStats(card);
    const facInfo = getFactionInfo(card.faction);
    const isDead = inBattle && hp <= 0;

    return (
      <motion.div
        ref={ref as any}
        key={card.id || index}
        animate={
          isDead
            ? { filter: 'grayscale(100%) brightness(0.4)', y: 0, scale: 0.95 }
            : isAttacking
            ? {
                x: activeAttackVector ? activeAttackVector.x : isDesktop ? 150 : 0,
                y: activeAttackVector ? activeAttackVector.y : isDesktop ? 0 : -350,
                scale: [1, 1.15, 1],
                boxShadow: '0 0 50px rgba(0, 243, 255, 0.6)',
                borderColor: 'rgba(0, 243, 255, 0.8)',
                zIndex: 100,
              }
            : {
                y: 0,
                scale: 1,
                x: 0,
                rotate: 0,
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                zIndex: 10,
              }
        }
        transition={
          isAttacking
            ? { duration: 0.5, times: [0, 0.15, 1], ease: ['backOut', 'backIn'] }
            : { type: 'spring', stiffness: 400, damping: 25 }
        }
        onClick={() => !inBattle && onClick(index)}
        className={`w-24 h-36 lg:w-44 lg:h-60 rounded-xl flex flex-col relative group bg-black/40 border transition-all duration-300 shadow-lg ${
          isAttacking
            ? 'border-cinematic-cyan shadow-[0_0_20px_rgba(0,243,255,0.4)]'
            : 'border-white/10'
        }`}
      >
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <img
            src={card.imageUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
            crossOrigin="anonymous"
            alt={card.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
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
            <Icon
              name="fa-skull text-3xl text-red-500  opacity-80"
              className="fa-skull text-3xl text-red-500  opacity-80"
            />
            <span className="text-red-500 font-bold text-[10px] font-mono bg-black/60 px-1 rounded uppercase tracking-wider mt-1 border border-red-500/30">
              Destroyed
            </span>
          </div>
        )}
        
        {card.element && !(isLiteMode || deviceIOS) && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className={`absolute -inset-4 rounded-full border border-dashed opacity-30 pointer-events-none z-[-1] ${
              (ELEMENTS as any)[card.element]?.color?.replace('text-', 'border-') ||
              'border-white/20'
            }`}
            style={{
              borderWidth: '2px',
              boxShadow: `0 0 10px ${
                (ELEMENTS as any)[card.element]?.color ? 'currentColor' : 'rgba(255,255,255,0)'
              }`,
            }}
          />
        )}
        <div className="absolute top-1 right-1 z-20 flex flex-row gap-1 items-center">
          {card.element && (
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className={`text-[8px] color-[${
                ELEMENTS[card.element as keyof typeof ELEMENTS]?.color
              }] bg-black/60 w-4 h-4 rounded-full flex items-center justify-center border border-white/10`}
              title={card.element}
            >
              <Icon name={ELEMENTS[card.element as keyof typeof ELEMENTS]?.icon} />
            </motion.div>
          )}
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className={`text-[9px] ${facInfo.color} bg-black/60 w-5 h-5 rounded-full flex items-center justify-center border border-white/10`}
            title={facInfo.name}
          >
            <Icon name={facInfo.icon} />
          </motion.div>
        </div>
        <div className="absolute top-1 left-1 z-20 flex gap-1">
          <div className="bg-cinematic-gold text-black text-[8px] font-black px-1 py-0.5 rounded shadow shadow-cinematic-gold/20">
            {card.cardClass}
          </div>
          {leaderId === card.id && (
            <div className="bg-cinematic-cyan text-black text-[8px] font-black px-1 py-0.5 rounded shadow shadow-cinematic-cyan/20 flex items-center gap-1">
              <Icon name="fa-crown text-[7px]" className="fa-crown text-[7px]" /> HQ
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full p-1.5 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-white truncate drop-shadow-md">
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate">{card.name}</span>
              {statuses?.length > 0 && (
                <div className="flex gap-1 shrink-0">
                  {statuses.map((status, sIdx) => {
                    const sconfig = STATUS_ICONS[status.type as keyof typeof STATUS_ICONS];
                    if (!sconfig) return null;
                    return (
                      <div
                        key={sIdx}
                        className="flex items-center bg-black/50 rounded px-1 border border-white/10"
                        title={`${sconfig.label}: ${status.turnsLeft} turns`}
                      >
                        <Icon
                          name={sconfig.icon}
                          className={`${sconfig.color} text-[8px] mr-1`}
                        />
                        <span className="text-[6px] text-white/80 shrink-0">
                          {status.turnsLeft}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-[8px] text-green-400 font-mono w-full">
                <div className="flex justify-between w-full mb-[0.5px]">
                  <span>
                    <Icon name="fa-heart" className="fa-heart" /> {hp}
                  </span>
                </div>
                <div className="h-[3px] bg-white/10 w-full rounded-full overflow-hidden relative">
                  <div
                    className={`h-full bg-cinematic-cyan transition-all duration-300 absolute left-0 top-0 bottom-0 ${
                      isMobileEnv ? '' : 'shadow-[0_0_5px_#00f3ff]'
                    }`}
                    style={{
                      width: `${(hp / (maxHp || 1)) * 100}%`,
                    }}
                  ></div>
                  {shield > 0 && (
                    <div
                      className="h-full bg-blue-400 opacity-60 transition-all duration-300 absolute right-0 top-0 bottom-0 border-l border-white/30"
                      style={{
                        width: `${Math.min(100, (shield / (maxHp || 1)) * 100)}%`,
                      }}
                    ></div>
                  )}
                </div>
                <div className="flex justify-between w-full mt-1 mb-[0.5px]">
                  <span className="text-[7px] text-blue-300 font-bold">
                    <Icon name="fa-bolt" className="fa-bolt" /> {Math.floor(mana || 0)}/{maxMana || 100}
                  </span>
                </div>
                <div className="h-[2px] bg-white/10 w-full rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (mana / (maxMana || 1)) * 100)}%` }}></div>
                </div>
                <div className="flex justify-between w-full mt-1 mb-[1px]">
                  <span className="text-[7px] text-yellow-500 font-bold"><Icon name="fa-gauge-high" className="fa-gauge-high" /> ATB</span>
                </div>
                <div className="h-[2px] bg-white/10 w-full rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 transition-all duration-300 shadow-[0_0_5px_rgba(234,179,8,0.5)]" style={{ width: `${Math.min(100, (atb / 1000) * 100)}%` }}></div>
                </div>
              </div>
            </div>
            <div className="w-10 flex flex-col justify-end items-end gap-1">
              <div className="text-[9px] text-orange-400 font-black italic drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
                <Icon name="fa-burst text-[7px]" className="fa-burst text-[7px]" /> {leaderId === card.id ? Math.floor(stats.atk * 1.15) : stats.atk}
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
                <Icon name="fa-crown" className="fa-crown" /> CHỈ HUY
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
              <Icon name="fa-square-minus" className="fa-square-minus" /> RÚT LUI
            </button>
          </div>
        )}
        <AnimatePresence>
          {!isLiteMode && damagePopups
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
                  scale: p.isCrit ? [0.5, 1.8, 1.5, 1.5] : [0.5, 1.4, 1.2, 1.2],
                }}
                transition={{
                  duration: 1.5,
                  times: [0, 0.2, 0.7, 1],
                  ease: "easeOut",
                }}
                className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-[110] font-black ${p.isCrit ? "text-cinematic-cyan  text-4xl sm:text-5xl" : `${p.colorClass || "text-red-500"} text-3xl sm:text-4xl `} whitespace-nowrap`}
                style={{ willChange: 'transform, opacity, scale', WebkitTextStroke: "1.5px black",
                  textShadow: "0 4px 10px rgba(0,0,0,0.8)",
                }}
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  {p.dmgType === "Physical" && (
                     <Icon name="fa-burst text-[0.5em] opacity-80" className="fa-burst text-[0.5em] opacity-80" />
                  )}
                  {p.dmgType === "Magic" && (
                    <Icon name="fa-wand-magic-sparkles text-[0.5em] opacity-80" className="fa-wand-magic-sparkles text-[0.5em] opacity-80" />
                  )}
                  {p.dmgType === "Fire" && (
                    <Icon name="fa-fire text-[0.5em] opacity-80" className="fa-fire text-[0.5em] opacity-80" />
                  )}
                  {p.dmgType === "Water" && (
                    <Icon name="fa-droplet text-[0.5em] opacity-80" className="fa-droplet text-[0.5em] opacity-80" />
                  )}
                  {p.dmgType === "Lightning" && (
                    <Icon name="fa-bolt text-[0.5em] opacity-80" className="fa-bolt text-[0.5em] opacity-80" />
                  )}
                  {p.dmgType === "Earth" && (
                    <Icon name="fa-leaf text-[0.5em] opacity-80" className="fa-leaf text-[0.5em] opacity-80" />
                  )}
                  {p.dmgType === "Wind" && (
                    <Icon name="fa-wind text-[0.5em] opacity-80" className="fa-wind text-[0.5em] opacity-80" />
                  )}
                  {p.dmgType === "Tech" && (
                     <Icon name="fa-crosshairs text-[0.5em] opacity-80" className="fa-crosshairs text-[0.5em] opacity-80" />
                  )}
                  <span>{p.isHeal ? '+' : '-'}{p.value}</span>
                </div>
                {p.isCrit && (
                  <div className="absolute -top-4 text-[10px] uppercase font-serif tracking-[0.2em] text-white">
                    Critical
                  </div>
                )}
              </motion.div>
            ))}
        </AnimatePresence>
      </motion.div>
    );
  }
);

SquadSlot.displayName = 'SquadSlot';
