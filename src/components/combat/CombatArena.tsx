import React, { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Icon } from '../ui/Icon';
import { Card } from '../../types';
import { calculateUltimateStats, getFactionInfo } from '../../lib/gameLogic';
import { ELEMENTS } from '../../lib/constants';
import { t } from '../../lib/i18n';

interface CombatArenaProps {
  boss: Card | null;
  screenShake: boolean;
  isLiteMode: boolean;
  hitStop: boolean;
  glassBreak: boolean;
  activeCutInCard: Card | null;
  activeCutInQuote: string | null;
  displaySquadHp: number;
  squadHp: number;
  activeSynergies: string[];
  squad: (Card | null)[];
  renderSquadSlot: (card: Card | null, index: number) => ReactNode;
  mounted: boolean;
  handleTacticalCommand: (type: "strike" | "heal") => void;
  strikeUses: number;
  getTacticalLimit: () => number;
  healUses: number;
  isBossAttacking: boolean;
  displayEnemyHps: number[];
  enemySquad: (Card | null)[];
  renderEnemySlot: (card: Card | null, index: number) => ReactNode;
  dodgeRate: number;
}

export const CombatArena: React.FC<CombatArenaProps> = ({
  boss,
  screenShake,
  isLiteMode,
  hitStop,
  glassBreak,
  activeCutInCard,
  activeCutInQuote,
  displaySquadHp,
  squadHp,
  activeSynergies,
  squad,
  renderSquadSlot,
  mounted,
  handleTacticalCommand,
  strikeUses,
  getTacticalLimit,
  healUses,
  isBossAttacking,
  displayEnemyHps,
  enemySquad,
  renderEnemySlot,
  dodgeRate
}) => {
  const [showMobileSynergies, setShowMobileSynergies] = useState(false);

  if (!boss) return null;
  const bf = getFactionInfo(boss.faction);
  const be = boss.element ? (ELEMENTS as any)[boss.element] || null : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[100] bg-zinc-950 overflow-y-auto overflow-x-hidden no-scrollbar ${screenShake ? "combat-shake" : ""} ${isLiteMode ? "lite-combat-view" : ""}`}
      style={{
        filter: hitStop
          ? "invert(0.1) contrast(200%) brightness(150%) blur(1px)"
          : "none",
        transform: hitStop ? "scale(1.05)" : "scale(1)",
        transition: "transform 0.05s, filter 0.05s",
      }}
    >
      <AnimatePresence>
        {hitStop && (
           <motion.div
              initial={{ opacity: 0.8, scale: 0.9 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none"
           >
              <div className="absolute inset-0 bg-cinematic-cyan/20 mix-blend-screen"></div>
              {/* Slash impact visual */}
              <div className="w-[150vw] h-[20px] bg-white rotate-[-45deg] absolute opacity-80 blur-[2px] shadow-[0_0_20px_#fff]"></div>
           </motion.div>
        )}
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
        {activeCutInCard && (() => {
          const getCutInColors = (card: Card) => {
            switch (card.element) {
              case "Fire": return { bg: "bg-red-500/30", to: "to-red-500", stroke: "rgba(239,68,68,0.5)", border: "border-red-500/30" };
              case "Water": return { bg: "bg-blue-500/30", to: "to-blue-500", stroke: "rgba(59,130,246,0.5)", border: "border-blue-500/30" };
              case "Earth": return { bg: "bg-emerald-500/30", to: "to-emerald-500", stroke: "rgba(16,185,129,0.5)", border: "border-emerald-500/30" };
              case "Lightning": return { bg: "bg-yellow-400/30", to: "to-yellow-400", stroke: "rgba(250,204,21,0.5)", border: "border-yellow-400/30" };
              case "Wind": return { bg: "bg-teal-400/30", to: "to-teal-400", stroke: "rgba(45,212,191,0.5)", border: "border-teal-400/30" };
              default:
                if (card.faction === "Ethereal") return { bg: "bg-yellow-200/30", to: "to-yellow-200", stroke: "rgba(254,240,138,0.5)", border: "border-yellow-200/30" };
                if (card.faction === "VoidBringer") return { bg: "bg-purple-600/30", to: "to-purple-600", stroke: "rgba(147,51,234,0.5)", border: "border-purple-600/30" };
                return { bg: "bg-cinematic-cyan/30", to: "to-cinematic-cyan", stroke: "rgba(0,243,255,0.5)", border: "border-cinematic-cyan/30" };
            }
          };
          const colors = getCutInColors(activeCutInCard);
          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[12vh] bg-black shadow-[0_10px_50px_black] z-50 animate-slide-up origin-top"></div>
            <div className="absolute bottom-0 left-0 w-full h-[12vh] bg-black shadow-[0_-10px_50px_black] z-50 animate-slide-up origin-bottom"></div>

            {/* Dark background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
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
                className={`absolute h-64 ${colors.bg} blur-md transform -translate-y-12`}
              />

              {/* Character Image */}
              <motion.img
                src={activeCutInCard.imageUrl}
                alt="cut-in"
                crossOrigin="anonymous"
                className="max-h-[60vh] max-w-[90vw] md:max-w-3xl object-scale-down relative z-10 filter contrast-125 mx-auto"
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
                  className={`text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white ${colors.to} drop-shadow-2xl`}
                  style={{ willChange: 'transform, opacity, scale', WebkitTextStroke: `2px ${colors.stroke}` }}
                >
                  {activeCutInCard.ultimateMove || "CRITICAL STRIKE"}
                </span>
                {calculateUltimateStats(activeCutInCard) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={`flex items-center gap-4 mt-2 bg-black/60 px-4 py-2 rounded border ${colors.border}`}
                  >
                    <span className="text-red-400 font-mono text-sm tracking-wider">
                      <Icon name="fa-fire mr-1" className="fa-fire mr-1" />PWR:{" "}
                      {calculateUltimateStats(activeCutInCard).power}
                    </span>
                    <span className="text-yellow-400 font-mono text-sm tracking-wider">
                      <Icon name="fa-crosshairs mr-1" className="fa-crosshairs mr-1" />SCALE:{" "}
                      {calculateUltimateStats(activeCutInCard).scaling}
                    </span>
                  </motion.div>
                )}
                {activeCutInQuote && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="mt-4 bg-black/80 backdrop-blur-md rounded-xl p-4 border-l-4 shadow-xl max-w-lg"
                    style={{ borderLeftColor: colors.stroke, boxShadow: `0 10px 30px ${colors.border}` }}
                  >
                    <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase mb-1 block">
                      <Icon name="fa-microphone text-[10px]" /> Kênh thoại kết nối
                    </span>
                    <p className={`font-serif text-lg md:text-xl italic text-white leading-relaxed`}>&quot;{activeCutInQuote}&quot;</p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>
          );
        })()}
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
              {t('combat.liveFeed')}
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
                    <div className="hidden sm:flex flex-wrap gap-1 mt-1">
                      {activeSynergies.map((syn, idx) => (
                        <div
                          key={idx}
                          className="bg-cinematic-cyan/10 border border-cinematic-cyan/30 text-cinematic-cyan text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[0_0_5px_rgba(0,243,255,0.2)] whitespace-nowrap"
                        >
                          <Icon name="fa-link" className="fa-link" /> {syn}
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
        {mounted && document.getElementById("tactical-command-portal") && createPortal(
          <div className="fixed right-1 sm:right-4 top-[50%] -translate-y-1/2 flex flex-col justify-center items-center gap-3 sm:gap-4 z-[200] w-auto pointer-events-auto">
            <button
              onClick={() => handleTacticalCommand("strike")}
              className={`group relative w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-red-500/50 hover:border-red-500 bg-black/80 backdrop-blur-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] active:scale-90 lg:hover:scale-110 ${strikeUses >= getTacticalLimit() ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
              disabled={strikeUses >= getTacticalLimit()}
            >
              <Icon name="fa-satellite text-red-500 text-base sm:text-lg" className="fa-satellite text-red-500 text-base sm:text-lg" />
              <div className="absolute -bottom-1 -right-1 bg-red-900 border border-red-500 text-white text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">
                {getTacticalLimit() - strikeUses}
              </div>
              <div className="absolute bottom-full mb-4 lg:bottom-auto lg:mb-0 lg:right-full lg:mr-4 top-auto lg:top-1/2 right-0 lg:right-auto lg:left-auto lg:translate-x-0 lg:-translate-y-1/2 bg-black/90 border border-red-500/30 px-3 py-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 whitespace-normal sm:whitespace-nowrap transition-opacity flex flex-col items-center lg:items-end w-[140px] sm:w-auto shadow-2xl">
                <div className="text-[10px] sm:text-xs font-bold text-red-500 mb-1 flex items-center gap-1 font-serif tracking-widest uppercase text-center lg:text-right">
                  {t('combat.orbitalStrike')} <Icon name="fa-satellite" className="fa-satellite" />
                </div>
                <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest text-center lg:text-right">
                  {t('combat.orbitalStrikeDesc')}
                </div>
                <div className="text-[9px] text-red-400 font-mono mt-0.5 text-center lg:text-right">
                  ({t('combat.remaining')} {getTacticalLimit() - strikeUses}/{getTacticalLimit()}{" "}
                  {t('combat.uses')})
                </div>
                <div className="text-[10px] text-cinematic-gold font-bold mt-1 bg-cinematic-gold/10 border border-cinematic-gold/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                  <Icon name="fa-coins" className="fa-coins" /> 100 DC
                </div>
              </div>
            </button>
            <button
              onClick={() => handleTacticalCommand("heal")}
              className={`group relative w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-green-500/50 hover:border-green-500 bg-black/80 backdrop-blur-lg flex items-center justify-center transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] active:scale-90 lg:hover:scale-110 ${healUses >= getTacticalLimit() ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
              disabled={healUses >= getTacticalLimit()}
            >
              <Icon name="fa-kit-medical text-green-500 text-base sm:text-lg" className="fa-kit-medical text-green-500 text-base sm:text-lg" />
              <div className="absolute -bottom-1 -right-1 bg-green-900 border border-green-500 text-white text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">
                {getTacticalLimit() - healUses}
              </div>
              <div className="absolute bottom-full mb-4 lg:bottom-auto lg:mb-0 lg:right-full lg:mr-4 top-auto lg:top-1/2 right-0 lg:right-auto lg:left-auto lg:translate-x-0 lg:-translate-y-1/2 bg-black/90 border border-green-500/30 px-3 py-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 whitespace-normal sm:whitespace-nowrap transition-opacity flex flex-col items-center lg:items-end w-[140px] sm:w-auto shadow-2xl">
                <div className="text-[10px] sm:text-xs font-bold text-green-500 mb-1 flex items-center gap-1 font-serif tracking-widest uppercase text-center lg:text-right">
                  {t('combat.emergencyRepair')} <Icon name="fa-kit-medical" className="fa-kit-medical" />
                </div>
                <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-widest text-center lg:text-right">
                  {t('combat.emergencyRepairDesc')}
                </div>
                <div className="text-[9px] text-green-400 font-mono mt-0.5 text-center lg:text-right">
                  ({t('combat.remaining')} {getTacticalLimit() - healUses}/{getTacticalLimit()}{" "}
                  {t('combat.uses')})
                </div>
                <div className="text-[10px] text-cinematic-gold font-bold mt-1 bg-cinematic-gold/10 border border-cinematic-gold/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                  <Icon name="fa-coins" className="fa-coins" /> 50 DC
                </div>
              </div>
            </button>
          </div>,
          document.getElementById("tactical-command-portal")!
        )}

        {/* Mobile Synergies Portal (Left Edge) */}
        {mounted && activeSynergies && activeSynergies.length > 0 && document.getElementById("tactical-command-portal") && createPortal(
          <div className="fixed left-0 top-[50%] -translate-y-1/2 sm:hidden z-[200] flex flex-col pointer-events-auto">
            <button
              onClick={() => setShowMobileSynergies(!showMobileSynergies)}
              className="w-8 h-10 bg-cinematic-cyan/20 border border-l-0 border-cinematic-cyan/50 rounded-r-lg flex items-center justify-center backdrop-blur-md shadow-[0_0_10px_rgba(0,243,255,0.2)]"
            >
              <Icon name="fa-link text-cinematic-cyan text-xs" className="fa-link text-cinematic-cyan text-xs" />
            </button>
            <AnimatePresence>
              {showMobileSynergies && (
                <motion.div 
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  className="absolute left-10 top-0 bg-black/90 border border-cinematic-cyan/30 p-2.5 rounded-lg flex flex-col gap-1.5 shadow-2xl w-[180px]"
                >
                  <div className="text-[10px] text-cinematic-cyan font-bold mb-0.5 border-b border-cinematic-cyan/30 pb-1.5 uppercase tracking-widest font-mono flex items-center justify-between">
                    <span>Synergies</span>
                    <button onClick={() => setShowMobileSynergies(false)} className="text-zinc-500 hover:text-white">
                      <Icon name="fa-xmark" className="fa-xmark" />
                    </button>
                  </div>
                  {activeSynergies.map((syn, idx) => (
                    <div key={idx} className="bg-cinematic-cyan/10 border border-cinematic-cyan/30 text-cinematic-cyan text-[9px] px-2 py-1 rounded flex items-center gap-1.5 shadow-[0_0_5px_rgba(0,243,255,0.2)]">
                      <Icon name="fa-link" className="fa-link shrink-0" /> <span className="truncate break-words whitespace-normal leading-tight">{syn}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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
