import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore } from './chatStore';
import type { Conversation, Message } from '../types';

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 1,
  contactId: 10,
  contactName: 'Alice',
  contactEmail: 'alice@test.com',
  subject: 'Help needed',
  status: 'open',
  unreadCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 100,
  conversationId: 1,
  senderId: 2,
  senderName: 'Agent',
  senderType: 'agent',
  body: 'Hello',
  createdAt: '2024-01-01T00:00:00Z',
  isRead: true,
  ...overrides,
});

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      messages: {},
    });
  });

  describe('setConversations', () => {
    it('replaces conversation list', () => {
      const convs = [makeConversation({ id: 1 }), makeConversation({ id: 2 })];
      useChatStore.getState().setConversations(convs);
      expect(useChatStore.getState().conversations).toEqual(convs);
    });

    it('replaces previous list entirely', () => {
      useChatStore.getState().setConversations([makeConversation({ id: 1 })]);
      useChatStore.getState().setConversations([makeConversation({ id: 2 })]);
      expect(useChatStore.getState().conversations).toHaveLength(1);
      expect(useChatStore.getState().conversations[0].id).toBe(2);
    });
  });

  describe('upsertConversation', () => {
    it('prepends new conversation', () => {
      useChatStore.getState().setConversations([makeConversation({ id: 1 })]);
      useChatStore.getState().upsertConversation(makeConversation({ id: 2 }));
      expect(useChatStore.getState().conversations[0].id).toBe(2);
      expect(useChatStore.getState().conversations).toHaveLength(2);
    });

    it('updates existing conversation in place', () => {
      useChatStore.getState().setConversations([makeConversation({ id: 1, subject: 'Old' })]);
      useChatStore.getState().upsertConversation(makeConversation({ id: 1, subject: 'New' }));
      expect(useChatStore.getState().conversations).toHaveLength(1);
      expect(useChatStore.getState().conversations[0].subject).toBe('New');
    });
  });

  describe('setActiveConversation', () => {
    it('sets active conversation id', () => {
      useChatStore.getState().setActiveConversation(5);
      expect(useChatStore.getState().activeConversationId).toBe(5);
    });

    it('can clear active conversation with null', () => {
      useChatStore.getState().setActiveConversation(5);
      useChatStore.getState().setActiveConversation(null);
      expect(useChatStore.getState().activeConversationId).toBeNull();
    });
  });

  describe('setMessages', () => {
    it('stores messages keyed by conversationId', () => {
      const msgs = [makeMessage({ id: 1 }), makeMessage({ id: 2 })];
      useChatStore.getState().setMessages(1, msgs);
      expect(useChatStore.getState().messages[1]).toEqual(msgs);
    });

    it('stores multiple conversations independently', () => {
      useChatStore.getState().setMessages(1, [makeMessage({ id: 1, conversationId: 1 })]);
      useChatStore.getState().setMessages(2, [makeMessage({ id: 2, conversationId: 2 })]);
      expect(useChatStore.getState().messages[1]).toHaveLength(1);
      expect(useChatStore.getState().messages[2]).toHaveLength(1);
    });
  });

  describe('appendMessage', () => {
    beforeEach(() => {
      useChatStore.getState().setConversations([makeConversation({ id: 1, unreadCount: 0 })]);
      useChatStore.getState().setMessages(1, [makeMessage({ id: 1 })]);
    });

    it('appends a new message', () => {
      useChatStore.getState().appendMessage(makeMessage({ id: 2 }));
      expect(useChatStore.getState().messages[1]).toHaveLength(2);
      expect(useChatStore.getState().messages[1][1].id).toBe(2);
    });

    it('deduplicates — ignores message with same id', () => {
      useChatStore.getState().appendMessage(makeMessage({ id: 1 }));
      expect(useChatStore.getState().messages[1]).toHaveLength(1);
    });

    it('updates lastMessage and lastMessageAt on conversation', () => {
      const msg = makeMessage({ id: 2, body: 'World', createdAt: '2024-06-01T12:00:00Z' });
      useChatStore.getState().appendMessage(msg);
      const conv = useChatStore.getState().conversations[0];
      expect(conv.lastMessage).toBe('World');
      expect(conv.lastMessageAt).toBe('2024-06-01T12:00:00Z');
    });

    it('increments unreadCount when conversation is not active', () => {
      useChatStore.getState().setActiveConversation(99); // different conversation
      useChatStore.getState().appendMessage(makeMessage({ id: 2 }));
      expect(useChatStore.getState().conversations[0].unreadCount).toBe(1);
    });

    it('does not increment unreadCount when conversation is active', () => {
      useChatStore.getState().setActiveConversation(1);
      useChatStore.getState().appendMessage(makeMessage({ id: 2 }));
      expect(useChatStore.getState().conversations[0].unreadCount).toBe(0);
    });

    it('initializes messages array when conversationId has no prior messages', () => {
      const msg = makeMessage({ id: 1, conversationId: 99 });
      useChatStore.getState().appendMessage(msg);
      expect(useChatStore.getState().messages[99]).toHaveLength(1);
    });
  });

  describe('markRead', () => {
    it('resets unreadCount to 0', () => {
      useChatStore.getState().setConversations([makeConversation({ id: 1, unreadCount: 5 })]);
      useChatStore.getState().markRead(1);
      expect(useChatStore.getState().conversations[0].unreadCount).toBe(0);
    });

    it('does not affect other conversations', () => {
      useChatStore.getState().setConversations([
        makeConversation({ id: 1, unreadCount: 3 }),
        makeConversation({ id: 2, unreadCount: 7 }),
      ]);
      useChatStore.getState().markRead(1);
      expect(useChatStore.getState().conversations[1].unreadCount).toBe(7);
    });
  });
});
