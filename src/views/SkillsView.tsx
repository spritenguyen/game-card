import React from "react";
import { motion } from "motion/react";
import { Icon } from "../components/ui/Icon";
import { useGameState } from "../hooks/useGameState";
import { SKILL_TREE, SkillNode, getSkillEffects } from "../lib/skills";
import { AppConfig } from "../types";
import { t } from "../lib/i18n";

interface Props {
  config: AppConfig;
}

export const SkillsView: React.FC<Props> = ({ config }) => {
  const { level, unlockedSkills, setUnlockedSkills } = useGameState();

  const unlockedSet = new Set(unlockedSkills);
  const totalSpent = SKILL_TREE.reduce((acc, node) => acc + (unlockedSet.has(node.id) ? node.cost : 0), 0);
  const availableSP = Math.max(0, (level - 1) - totalSpent);

  const canUnlock = (node: SkillNode) => {
    if (unlockedSet.has(node.id)) return false;
    if (level < node.reqLevel) return false;
    if (availableSP < node.cost) return false;
    const meetsReqs = node.reqNodes.every((req) => unlockedSet.has(req));
    return meetsReqs;
  };

  const handleUnlock = (node: SkillNode) => {
    if (!canUnlock(node)) return;
    setUnlockedSkills([...(unlockedSkills || []), node.id]);
  };

  const effects = getSkillEffects(unlockedSkills || []);

  const tiers = [[], [], [], []] as SkillNode[][];
  SKILL_TREE.forEach(node => {
      if (node.reqLevel <= 2) tiers[0].push(node);
      else if (node.reqLevel <= 5) tiers[1].push(node);
      else if (node.reqLevel <= 10) tiers[2].push(node);
      else tiers[3].push(node);
  });

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-cinematic-cardBg border border-white/5 p-6 rounded-xl">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-wider flex items-center gap-3">
            <Icon name="fa-dna" className="text-cinematic-cyan" /> {t(config.language || 'vi', 'skills.title')}
          </h1>
          <p className="text-white/60 mt-1">{t(config.language || 'vi', 'skills.subtitle')}</p>
        </div>
        <div className="flex bg-black/40 border border-white/10 rounded-lg p-3 px-6 text-center">
            <div className="flex flex-col border-r border-white/10 pr-6 mr-6">
                <span className="text-xs text-white/50 uppercase tracking-widest">{t(config.language || 'vi', 'training.level')}</span>
                <span className="text-2xl font-bold font-mono text-white">{level}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-xs text-white/50 uppercase tracking-widest">{t(config.language || 'vi', 'skills.pointsDesc')}</span>
                <span className="text-2xl font-bold font-mono text-cinematic-cyan">{availableSP}</span>
            </div>
        </div>
      </div>

      {/* Global Stats Summary */}
      {(Object.keys(effects).length > 0 && Array.from(unlockedSet).length > 0) && (
        <div className="mb-8 p-4 bg-cinematic-cyan/5 border border-cinematic-cyan/20 rounded-xl">
            <h3 className="text-cinematic-cyan text-sm uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                <Icon name="fa-chart-pie" /> Global Bonuses Active
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {effects.hp_pct > 0 && <div className="text-green-400 font-mono text-sm">+{(effects.hp_pct * 100).toFixed(0)}% <span className="text-white/60 text-xs font-sans">MAX HP</span></div>}
               {effects.atk_pct > 0 && <div className="text-orange-400 font-mono text-sm">+{(effects.atk_pct * 100).toFixed(0)}% <span className="text-white/60 text-xs font-sans">ATTACK</span></div>}
               {effects.def_pct > 0 && <div className="text-zinc-300 font-mono text-sm">+{(effects.def_pct * 100).toFixed(0)}% <span className="text-white/60 text-xs font-sans">DEF/MDEF</span></div>}
               {effects.speed_flat > 0 && <div className="text-blue-300 font-mono text-sm">+{effects.speed_flat} <span className="text-white/60 text-xs font-sans">SPEED</span></div>}
               {effects.crit_flat > 0 && <div className="text-yellow-300 font-mono text-sm">+{effects.crit_flat}% <span className="text-white/60 text-xs font-sans">CRIT RATE</span></div>}
               {effects.dodge_flat > 0 && <div className="text-teal-300 font-mono text-sm">+{effects.dodge_flat}% <span className="text-white/60 text-xs font-sans">DODGE RATE</span></div>}
            </div>
        </div>
      )}

      {/* Skill Tree visualization */}
      <div className="space-y-8">
          {tiers.map((tierNodes, tierIdx) => (
             <div key={tierIdx} className="relative">
                 <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -z-10 hidden md:block"></div>
                 <div className="flex flex-wrap justify-center gap-6">
                     {tierNodes.map(node => {
                         const unlocked = unlockedSet.has(node.id);
                         const unlockable = canUnlock(node);
                         const requiresLevel = level < node.reqLevel;

                         return (
                            <motion.div 
                               key={node.id}
                               whileHover={unlockable ? { scale: 1.05 } : {}}
                               className={`
                                 relative w-64 p-4 rounded-xl border flex flex-col gap-3 transition-colors
                                 ${unlocked ? 'bg-cinematic-cyan/10 border-cinematic-cyan flex-col shadow-[0_0_15px_rgba(0,243,255,0.1)]' : 
                                   unlockable ? 'bg-zinc-800/80 border-white/20 hover:border-cinematic-cyan/50 cursor-pointer' : 
                                   'bg-black/60 border-white/5 opacity-60'}
                               `}
                               onClick={() => unlockable && handleUnlock(node)}
                            >
                                <div className="flex justify-between items-start">
                                   <div className={`p-3 rounded-lg flex items-center justify-center ${unlocked ? 'bg-cinematic-cyan/20' : 'bg-black/50'} border border-white/5`}>
                                       <Icon name={node.icon} className="text-xl" />
                                   </div>
                                   {unlocked ? (
                                       <span className="text-[10px] uppercase tracking-widest text-cinematic-cyan border border-cinematic-cyan/30 px-2 py-1 rounded bg-cinematic-cyan/10">Active</span>
                                   ) : (
                                       <span className="text-[10px] uppercase font-mono text-white/40">{node.cost} {t(config.language || 'vi', 'skills.points')}</span>
                                   )}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold tracking-wide text-lg">{node.name}</h4>
                                    <p className="text-white/60 text-sm mt-1">{node.description}</p>
                                </div>
                                {!unlocked && (
                                   <div className="pt-3 mt-auto border-t border-white/5 flex flex-col gap-1">
                                      {requiresLevel && <span className="text-xs text-red-400 font-mono">Requires Lv.{node.reqLevel}</span>}
                                      {node.reqNodes.map(req => {
                                          const parent = SKILL_TREE.find(n => n.id === req);
                                          const parentUnlocked = unlockedSet.has(req);
                                          return !parentUnlocked && (
                                              <span key={req} className="text-xs text-red-400 font-mono">Requires {parent?.name}</span>
                                          )
                                      })}
                                   </div>
                                )}
                            </motion.div>
                         )
                     })}
                 </div>
             </div>
          ))}
      </div>
    </div>
  );
};
