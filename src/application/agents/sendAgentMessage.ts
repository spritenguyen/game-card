import type { Card, AppConfig } from '../../types';
import { chatWithAgentFromAI } from '../../services/ai/index';

export interface AgentChatPorts {
  getCurrentCard: () => Card;
  isCurrent: () => boolean;
  updateCard: (card: Card) => Promise<void>;
  onError?: (message: string) => void;
}

// UI owns input/busy state; this use case owns conversation persistence and AI orchestration.
export async function sendAgentMessage(
  displayCard: Card,
  userMsg: string,
  config: AppConfig,
  ports: AgentChatPorts,
  chat: typeof chatWithAgentFromAI = chatWithAgentFromAI,
): Promise<void> {
  const { getCurrentCard, isCurrent, updateCard, onError } = ports;
  const newHistory = [...(getCurrentCard().chatHistory || []), { role: 'user' as const, content: userMsg }];
  let userSaved = false;
  try {
      await updateCard({ ...getCurrentCard(), chatHistory: newHistory });
      userSaved = true;
      if (!isCurrent()) return;
      const { reply, isBounty, bountyData } = await chat(displayCard, newHistory, config);
      if (!isCurrent()) return;
      let finalReply = reply;
      if (isBounty && bountyData) {
          finalReply += `\n\n[FILE ĐÍNH KÈM: NHIỆM VỤ ĐỘNG]\nMục tiêu: ${bountyData.name}\nĐộ nguy hiểm: ${bountyData.threatLevel}\nHP dự kiến: ${bountyData.hp}\nATK dự kiến: ${bountyData.attack}\n(Cảnh báo: Tính năng nhận Bounties dạng tin nhắn đang được triển khai trên Global Map)`;
      }
      const current = getCurrentCard();
      await updateCard({ ...current, chatHistory: [...newHistory, { role: 'assistant', content: finalReply }], resonance: Math.min(999, (current.resonance || current.affection || 0) + 2) });
  } catch {
      if (!isCurrent()) return;
      if (userSaved) {
          try {
              await updateCard({ ...getCurrentCard(), chatHistory: [...newHistory, { role: 'assistant', content: 'Lỗi đường truyền! Tín hiệu gián đoạn...' }] });
          } catch { onError?.('Không thể lưu hội thoại.'); }
      } else { onError?.('Không thể lưu hội thoại.'); }
  }
}
