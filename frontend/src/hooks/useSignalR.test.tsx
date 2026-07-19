import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSignalR } from './useSignalR';
import type { Message, Conversation } from '../types';

// ── Hoisted mocks — must be available inside vi.mock factories ────────────────

const mockAppendMessage      = vi.hoisted(() => vi.fn());
const mockUpsertConversation = vi.hoisted(() => vi.fn());
const mockChatHub = vi.hoisted(() => ({
  start:                 vi.fn(),
  stop:                  vi.fn(),
  onMessage:             vi.fn(),
  onConversationUpdated: vi.fn(),
}));

// Mutable token — updated per-test; read inside factory at call time (not hoist time)
let testToken: string | null = null;

vi.mock('../store/chatStore', () => ({
  useChatStore: vi.fn((selector?: (s: any) => any) => {
    const state = {
      conversations: [], activeConversationId: null, messages: {},
      setConversations:    vi.fn(),
      upsertConversation:  mockUpsertConversation,
      setActiveConversation: vi.fn(),
      setMessages:         vi.fn(),
      appendMessage:       mockAppendMessage,
      markRead:            vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: any) => any) =>
    selector({ token: testToken, user: null, setAuth: vi.fn(), logout: vi.fn() })
  ),
}));

vi.mock('../services/signalr', () => ({
  chatHub: mockChatHub,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSignalR', () => {
  beforeEach(() => {
    testToken = null;
    vi.clearAllMocks();
    // Restore implementations after clearAllMocks (which clears call history only)
    mockChatHub.start.mockResolvedValue(undefined);
    mockChatHub.stop.mockResolvedValue(undefined);
    mockChatHub.onMessage.mockReturnValue(vi.fn()); // returns cleanup fn
    mockChatHub.onConversationUpdated.mockReturnValue(vi.fn());
  });

  it('does not start chatHub when token is null', () => {
    testToken = null;
    renderHook(() => useSignalR());
    expect(mockChatHub.start).not.toHaveBeenCalled();
  });

  it('starts chatHub with the current token', () => {
    testToken = 'jwt-abc';
    renderHook(() => useSignalR());
    expect(mockChatHub.start).toHaveBeenCalledWith('jwt-abc');
  });

  it('registers onMessage handler', () => {
    testToken = 'jwt-abc';
    renderHook(() => useSignalR());
    expect(mockChatHub.onMessage).toHaveBeenCalledWith(expect.any(Function));
  });

  it('registers onConversationUpdated handler', () => {
    testToken = 'jwt-abc';
    renderHook(() => useSignalR());
    expect(mockChatHub.onConversationUpdated).toHaveBeenCalledWith(expect.any(Function));
  });

  it('onMessage handler calls appendMessage with the received message', () => {
    testToken = 'jwt-abc';
    renderHook(() => useSignalR());

    const handler = mockChatHub.onMessage.mock.calls[0][0] as (m: Message) => void;
    const msg = { id: 1, body: 'Hi', conversationId: 1 } as Message;
    handler(msg);

    expect(mockAppendMessage).toHaveBeenCalledWith(msg);
  });

  it('onConversationUpdated handler calls upsertConversation', () => {
    testToken = 'jwt-abc';
    renderHook(() => useSignalR());

    const handler = mockChatHub.onConversationUpdated.mock.calls[0][0] as (c: Conversation) => void;
    const conv = { id: 5, subject: 'Test' } as Conversation;
    handler(conv);

    expect(mockUpsertConversation).toHaveBeenCalledWith(conv);
  });

  it('cleanup calls offMessage, offConversation, and chatHub.stop', () => {
    testToken = 'jwt-abc';
    const { unmount } = renderHook(() => useSignalR());

    // Capture the cleanup functions returned by the mock
    const offMsg  = mockChatHub.onMessage.mock.results[0].value as ReturnType<typeof vi.fn>;
    const offConv = mockChatHub.onConversationUpdated.mock.results[0].value as ReturnType<typeof vi.fn>;

    unmount();

    expect(offMsg).toHaveBeenCalled();
    expect(offConv).toHaveBeenCalled();
    expect(mockChatHub.stop).toHaveBeenCalled();
  });

  it('does not start a second connection on re-render with same token', () => {
    testToken = 'jwt-abc';
    const { rerender } = renderHook(() => useSignalR());
    rerender();
    expect(mockChatHub.start).toHaveBeenCalledTimes(1);
  });
});
