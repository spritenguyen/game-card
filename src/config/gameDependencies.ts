import type { GameRepository } from '../application/ports/gameRepository';
import { dbService } from '../infrastructure/storage/indexedDbGameRepository';

/** Composition root: application consumers use the repository contract. */
export const gameRepository: GameRepository = dbService;
