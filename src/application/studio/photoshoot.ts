import type { Card, AppConfig } from '../../types';
import { generateImageFromAi } from '../../services/ai/index';

export const PHOTOSHOOT_COST = 50;
export interface PhotoshootRequest {
  card: Card;
  concept: string;
  ratio: string;
  model: string;
  config: AppConfig;
}
export interface PhotoshootPorts {
  getCurrentCard: (id: string) => Card | undefined;
  updateCard: (card: Card) => Promise<void>;
  modifyDust: (amount: number) => void;
  setProcessing: (processing: boolean) => void;
  onImage: (image: string) => void;
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

// Resolve the latest card after generation so concurrent metadata edits survive.
export async function photoshoot(
  request: PhotoshootRequest,
  ports: PhotoshootPorts,
  generateImage: typeof generateImageFromAi = generateImageFromAi,
): Promise<void> {
  const { card, concept, ratio, model, config } = request;
  try {
    ports.setProcessing(true);
    ports.modifyDust(-PHOTOSHOOT_COST);
    const image = await generateImage({ ...card, studioConcept: concept, studioRatio: ratio }, config, model, true);
    ports.onImage(image);
    const current = ports.getCurrentCard(card.id);
    if (!current) throw new Error('Thẻ không còn tồn tại để lưu ảnh.');
    await ports.updateCard({
      ...current,
      affection: (current.affection || 0) + 10,
      variants: current.variants ? [...current.variants, image] : [current.imageUrl || '', image].filter(Boolean),
    });
    ports.onSuccess();
  } catch (error) {
    ports.onError(error);
    ports.modifyDust(PHOTOSHOOT_COST);
  } finally {
    ports.setProcessing(false);
  }
}
