export interface CombatTurnState {
  squadAlive: readonly boolean[];
  enemyAlive: readonly boolean[];
  squadATB: readonly number[];
  enemyATB: readonly number[];
  squadSpeeds: readonly number[];
  enemySpeeds: readonly number[];
}
export type CombatTurnTransition = {
  kind: 'action';
  side: 'squad' | 'enemy';
  index: number;
  squadATB: number[];
  enemyATB: number[];
} | {
  kind: 'advanced';
  squadATB: number[];
  enemyATB: number[];
} | {
  kind: 'stalled';
  squadATB: number[];
  enemyATB: number[];
};

// Six slots, threshold 1000. Strict > preserves squad/slot priority on ties.
export function advanceCombatTurn(state: CombatTurnState): CombatTurnTransition {
  const squadATB = [...state.squadATB], enemyATB = [...state.enemyATB];
  let highestATB = -1, index = -1;
  let side: 'squad' | 'enemy' = 'enemy';
  for (let i = 0; i < 6; i++) {
    if (state.squadAlive[i] && squadATB[i] >= 1000 && squadATB[i] > highestATB) {
      highestATB = squadATB[i]; side = 'squad'; index = i;
    }
    if (state.enemyAlive[i] && enemyATB[i] >= 1000 && enemyATB[i] > highestATB) {
      highestATB = enemyATB[i]; side = 'enemy'; index = i;
    }
  }
  if (index !== -1) {
    if (side === 'squad') squadATB[index] -= 1000;
    else enemyATB[index] -= 1000;
    return { kind: 'action', side, index, squadATB, enemyATB };
  }
  let ticks = Infinity;
  for (let i = 0; i < 6; i++) {
    if (state.squadAlive[i]) ticks = Math.min(ticks, (1000 - squadATB[i]) / Math.max(1, state.squadSpeeds[i]));
    if (state.enemyAlive[i]) ticks = Math.min(ticks, (1000 - enemyATB[i]) / Math.max(1, state.enemySpeeds[i]));
  }
  if (ticks === Infinity || ticks < 0) return { kind: 'stalled', squadATB, enemyATB };
  for (let i = 0; i < 6; i++) {
    if (state.squadAlive[i]) squadATB[i] += state.squadSpeeds[i] * ticks;
    if (state.enemyAlive[i]) enemyATB[i] += state.enemySpeeds[i] * ticks;
  }
  return { kind: 'advanced', squadATB, enemyATB };
}
