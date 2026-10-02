import type { Card, Boss } from '../src/types';
import { rollImplant, rollGear } from '../src/domain/gameRules';
import type { CombatOutcomeInput, CombatOutcomePorts } from '../src/application/combat/resolveCombatOutcome';

export const scenarios = ['single_boss', 'battlefield', 'phantasm', 'world_boss'].flatMap(mode =>
  (mode === 'single_boss' ? ['Minion', 'Elite', 'Nightmare'] : ['Elite']).flatMap(threat =>
    ['victory', 'defeat', 'draw'].flatMap(outcome => [1, 4, 6, 11, 16].map(turn => ({ mode, threat, outcome, turn })))));

export function scenarioInput(scenario: typeof scenarios[number]): CombatOutcomeInput {
  return {
    opTab: scenario.mode as CombatOutcomeInput['opTab'], level: 7, worldBossState: { level: 3 },
    phantasmProgress: { floor: 4 }, squad: [{ id: 'operative', affection: 8 } as Card, null],
    boss: { id: 'enemy', reward: 120, threatLevel: scenario.threat, hp: 500, drops: [{ item: 'Token', amount: 2 }] } as Boss,
    enemySquad: [{ reward: 120, campaignStageId: 'stage-1' } as Boss, { reward: 180 } as Boss, null],
    currentEnemyHps: scenario.outcome === 'victory' ? [0, 0] : [50, 20],
    currentCardHps: scenario.outcome === 'defeat' ? [0, 0] : [77, 0],
    currentSquadHp: scenario.outcome === 'defeat' ? 0 : 77,
    turn: scenario.turn, totalActions: scenario.outcome === 'draw' ? 60 : 12, MAX_ACTIONS: 60,
  };
}
export function tracePorts(trace: unknown[][]): CombatOutcomePorts {
  const record = (name: string) => (...args: any[]) => { trace.push([name, ...args]); };
  return {
    isCancelled: () => false,
    setWorldBossState: update => trace.push(['worldBoss', update({ level: 3, boss: { hp: 500 } })]),
    modifyCurrency: record('currency'), modifyInventory: record('inventory'), gainExperience: record('experience'),
    addLog: (...args) => { Math.random(); record('log')(...args); }, setCombatResult: record('result'), setEnemySquad: record('enemies'),
    updateQuestProgress: record('quest'), onCampaignWin: record('campaign'),
    updateCard: async card => { record('card')(card); },
    addImplant: async implant => { record('implant')(implant); },
    addGear: async gear => { record('gear')(gear); },
    onPhantasmWin: record('phantasmWin'), onPhantasmDefeat: record('phantasmDefeat'),
  };
}
export const fixtureLoot = { rollImplant, rollGear };
export async function seeded<T>(action: () => Promise<T>): Promise<T> {
  const original = Math.random;
  const originalNow = Date.now;
  Date.now = () => 1700000000000;
  let cursor = 0;
  const sequence = [0.04, 0.8, 0.3, 0.6, 0.12, 0.95, 0.4];
  Math.random = () => sequence[cursor++ % sequence.length];
  try { return await action(); } finally { Math.random = original; Date.now = originalNow; }
}
