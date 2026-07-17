import { create } from 'zustand';
import type { Conversation, Message } from '../types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: number | null;
  messages: Record<number, Message[]>;
  setConversations: (list: Conversation[]) => void;
  upsertConversation: (c: Conversation) => void;
  setActiveConversation: (id: number | null) => void;
  setMessages: (conversationId: number, msgs: Message[]) => void;
  appendMessage: (msg: Message) => void;
  markRead: (conversationId: number) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},

  setConversations: (list) => set({ conversations: list }),

  upsertConversation: (c) => set(s => {
    const idx = s.conversations.findIndex(x => x.id === c.id);
    const list = idx >= 0
      ? s.conversations.map((x, i) => i === idx ? c : x)
      : [c, ...s.conversations];
    return { conversations: list };
  }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, msgs) =>
    set(s => ({ messages: { ...s.messages, [conversationId]: msgs } })),

  appendMessage: (msg) =>
    set(s => {
      const existing = s.messages[msg.conversationId] ?? [];
      if (existing.some(m => m.id === msg.id)) return s;
      return {
        messages: {
          ...s.messages,
          [msg.conversationId]: [...existing, msg],
        },
        conversations: s.conversations.map(c =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg.body, lastMessageAt: msg.createdAt,
                unreadCount: c.id === s.activeConversationId ? 0 : c.unreadCount + 1 }
            : c
        ),
      };
    }),

  markRead: (conversationId) =>
    set(s => ({
      conversations: s.conversations.map(c =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),
}));
