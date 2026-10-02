export type CombatPhase = 'idle' | 'running' | 'resolving' | 'completed' | 'failed' | 'cancelled';

// Run ownership prevents an old async continuation from affecting a new battle.
export class CombatLifecycle {
  private generation = 0;
  private currentPhase: CombatPhase = 'idle';

  get phase(): CombatPhase { return this.currentPhase; }

  start(): number | null {
    if (this.currentPhase === 'running' || this.currentPhase === 'resolving') return null;
    this.currentPhase = 'running';
    return ++this.generation;
  }

  owns(run: number): boolean {
    return run === this.generation && this.currentPhase !== 'cancelled' && this.currentPhase !== 'idle';
  }

  resolve(run: number): void {
    if (this.owns(run) && this.currentPhase === 'running') this.currentPhase = 'resolving';
  }

  complete(run: number): void {
    if (this.owns(run) && this.currentPhase === 'resolving') this.currentPhase = 'completed';
  }

  fail(run: number): void {
    if (this.owns(run) && (this.currentPhase === 'running' || this.currentPhase === 'resolving')) this.currentPhase = 'failed';
  }

  cancel(): void { this.currentPhase = 'cancelled'; }

  reset(): void {
    ++this.generation;
    this.currentPhase = 'idle';
  }
}
