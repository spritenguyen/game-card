import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '../ui/Icon';
import { Boss } from '../../types';
import { getFactionInfo } from '../../lib/gameLogic';
import { ELEMENTS, STATUS_ICONS } from '../../lib/constants';
import { t } from '../../lib/i18n';

export interface EnemySlotProps {
  bossData: Boss | null;
  index: number;
  inBattle: boolean;
  isAttacking: boolean;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  atb: number;
  statuses: any[];
  isMobileEnv: boolean;
  isDesktop: boolean;
  isLiteMode: boolean;
  deviceIOS: boolean;
  activeAttackVector: { x: number; y: number } | null;
  damagePopups: any[];
}

export const EnemySlot = forwardRef<HTMLDivElement, EnemySlotProps>(
  (
    {
      bossData,
      index,
      inBattle,
      isAttacking,
      hp,
      maxHp,
      mana,
      maxMana,
      atb,
      statuses,
      isMobileEnv,
      isDesktop,
      isLiteMode,
      deviceIOS,
      activeAttackVector,
      damagePopups,
    },
    ref
  ) => {
    if (!bossData) {
      return (
        <div
          ref={ref as any}
          key={`empty-enemy-${index}`}
          className="w-24 h-36 lg:w-44 lg:h-60 rounded-xl flex flex-col items-center justify-center relative group bg-black/40 border border-white/5 overflow-hidden opacity-50 transition-all duration-300"
        ></div>
      );
    }

    const facInfo = getFactionInfo(bossData.faction);
    const isDead = inBattle && hp <= 0;

    return (
      <motion.div
        ref={ref as any}
        key={`enemy-${bossData.id}-${index}`}
        animate={
          isDead
            ? { filter: 'grayscale(100%) brightness(0.4)', y: 0, scale: 0.95 }
            : isAttacking
            ? {
                x: [0, (activeAttackVector?.x || (isDesktop ? -150 : 0)) * -0.2, activeAttackVector?.x || (isDesktop ? -150 : 0)],
                y: [0, (activeAttackVector?.y || (isDesktop ? 0 : 150)) * -0.2, activeAttackVector?.y || (isDesktop ? 0 : 150)],
                scale: [1, 0.95, 1.2],
                rotate: [0, 5, -10],
                filter: ['brightness(1) blur(0px)', 'brightness(0.8) blur(1px)', 'brightness(1.5) blur(4px)'],
                boxShadow: '0 0 50px rgba(220, 38, 38, 0.6)',
                borderColor: 'rgba(220, 38, 38, 0.8)',
                zIndex: 100,
              }
            : {
                y: 0,
                scale: 1,
                x: 0,
                rotate: 0,
                filter: 'brightness(1) blur(0px)',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                zIndex: 10,
              }
        }
        transition={
          isAttacking
            ? { duration: 0.6, times: [0, 0.3, 1], ease: ['backIn', 'circOut'] }
            : { type: 'spring', stiffness: 400, damping: 25 }
        }
        className={`w-24 h-36 lg:w-44 lg:h-60 rounded-xl flex flex-col relative group bg-black/40 border transition-all duration-300 shadow-lg ${
          isAttacking
            ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
            : 'border-white/10'
        }`}
      >
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <img
            src={bossData.imageUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
            crossOrigin="anonymous"
            alt={bossData.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=300&auto=format&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-black/40 to-transparent"></div>
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
            <Icon
              name="fa-skull text-3xl text-red-500 opacity-80"
              className="fa-skull text-3xl text-red-500 opacity-80"
            />
            <span className="text-red-500 font-bold text-[10px] font-mono bg-black/60 px-1 rounded uppercase tracking-wider mt-1 border border-red-500/30">
              {t('combat.destroyed')}
            </span>
          </div>
        )}

        {bossData.element && !(isLiteMode || deviceIOS) && (
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className={`absolute -inset-4 rounded-full border border-dashed opacity-30 pointer-events-none z-[-1] ${
              (ELEMENTS as any)[bossData.element]?.color?.replace('text-', 'border-') ||
              'border-white/20'
            }`}
            style={{
              borderWidth: '2px',
              boxShadow: `0 0 10px ${
                (ELEMENTS as any)[bossData.element]?.color ? 'currentColor' : 'rgba(255,255,255,0)'
              }`,
            }}
          />
        )}

        <div className="absolute top-1 right-1 z-20 flex flex-row gap-1 items-center">
          {bossData.element && (
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
              className={`text-[8px] color-[${
                ELEMENTS[bossData.element as keyof typeof ELEMENTS]?.color
              }] bg-black/60 w-4 h-4 rounded-full flex items-center justify-center border border-white/10`}
              title={bossData.element}
            >
              <Icon name={ELEMENTS[bossData.element as keyof typeof ELEMENTS]?.icon} />
            </motion.div>
          )}
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
            className={`text-[9px] ${facInfo.color} bg-black/60 w-5 h-5 rounded-full flex items-center justify-center border border-white/10`}
            title={facInfo.name}
          >
            <Icon name={facInfo.icon} />
          </motion.div>
        </div>
        <div className="absolute top-1 left-1 z-20">
          <div className="text-[8px] font-black text-white bg-red-600/80 px-1 py-0.5 rounded flex items-center font-mono">
            {bossData.level ? `LV${bossData.level}` : bossData.threatLevel}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full p-1.5 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-red-200 truncate drop-shadow-md flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate">{bossData.name}</span>
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
          <div className="flex flex-col w-full gap-1">
            <div className="text-[8px] text-red-400 font-mono w-full">
              <div className="flex justify-between w-full mb-[1px]">
                <span>
                  <Icon name="fa-heart" className="fa-heart" /> {hp}
                </span>
              </div>
              <div className="h-[3px] bg-red-900/50 w-full rounded-full overflow-hidden relative">
                <div
                  className={`h-full bg-red-50 transition-all duration-300 absolute left-0 top-0 bottom-0 ${
                    isMobileEnv ? '' : 'shadow-[0_0_5px_#fca5a5]'
                  }`}
                  style={{ width: `${(hp / (maxHp || 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between w-full mt-1 mb-[1px]">
                <span className="text-[7px] text-blue-300">
                  <Icon name="fa-bolt" className="fa-bolt" /> {Math.floor(mana)}/{maxMana || 100}
                </span>
              </div>
              <div className="h-[2px] bg-white/10 w-full rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (mana / (maxMana || 1)) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between w-full mt-1 mb-[1px]">
                <span className="text-[7px] text-yellow-500 font-bold">
                  <Icon name="fa-gauge-high" className="fa-gauge-high" /> ATB
                </span>
              </div>
              <div className="h-[2px] bg-white/10 w-full rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 transition-all duration-300 shadow-[0_0_5px_rgba(234,179,8,0.5)]"
                  style={{ width: `${Math.min(100, (atb / 1000) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {!isLiteMode &&
            damagePopups
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
                    ease: 'easeOut',
                  }}
                  className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none z-[110] font-black font-serif italic tracking-tighter ${
                    p.isCrit
                      ? 'text-cinematic-cyan  text-4xl sm:text-5xl'
                      : `${p.colorClass || 'text-orange-500'} text-3xl sm:text-4xl `
                  } whitespace-nowrap`}
                  style={{
                    willChange: 'transform, opacity, scale',
                    WebkitTextStroke: '1.5px black',
                    textShadow: '0 4px 10px rgba(0,0,0,0.8)',
                  }}
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    {p.dmgType === 'Physical' && (
                      <Icon
                        name="fa-burst text-[0.5em] opacity-80"
                        className="fa-burst text-[0.5em] opacity-80"
                      />
                    )}
                    {p.dmgType === 'Magic' && (
                      <Icon
                        name="fa-wand-magic-sparkles text-[0.5em] opacity-80"
                        className="fa-wand-magic-sparkles text-[0.5em] opacity-80"
                      />
                    )}
                    {p.dmgType === 'Fire' && (
                      <Icon
                        name="fa-fire text-[0.5em] opacity-80"
                        className="fa-fire text-[0.5em] opacity-80"
                      />
                    )}
                    {p.dmgType === 'Water' && (
                      <Icon
                        name="fa-droplet text-[0.5em] opacity-80"
                        className="fa-droplet text-[0.5em] opacity-80"
                      />
                    )}
                    {p.dmgType === 'Lightning' && (
                      <Icon
                        name="fa-bolt text-[0.5em] opacity-80"
                        className="fa-bolt text-[0.5em] opacity-80"
                      />
                    )}
                    {p.dmgType === 'Earth' && (
                      <Icon
                        name="fa-leaf text-[0.5em] opacity-80"
                        className="fa-leaf text-[0.5em] opacity-80"
                      />
                    )}
                    {p.dmgType === 'Wind' && (
                      <Icon
                        name="fa-wind text-[0.5em] opacity-80"
                        className="fa-wind text-[0.5em] opacity-80"
                      />
                    )}
                    {p.dmgType === 'Tech' && (
                      <Icon
                        name="fa-crosshairs text-[0.5em] opacity-80"
                        className="fa-crosshairs text-[0.5em] opacity-80"
                      />
                    )}
                    <span>
                      {p.isHeal ? '+' : '-'}
                      {p.value}
                    </span>
                  </div>
                  {p.isCrit && (
                    <div className="absolute -top-4 text-[10px] uppercase font-serif tracking-[0.2em] text-white">
                      {t('combat.critical')}
                    </div>
                  )}
                </motion.div>
              ))}
        </AnimatePresence>
      </motion.div>
    );
  }
);

EnemySlot.displayName = 'EnemySlot';
