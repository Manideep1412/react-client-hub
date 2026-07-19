import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ── Hoisted mock — must run before any imports are resolved ───────────────────
const mockHttp = vi.hoisted(() => ({
  interceptors: {
    request:  { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get:   vi.fn(),
  post:  vi.fn(),
  patch: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockHttp) },
}));

// Import AFTER mock registration so that api.ts runs against mockHttp
import {
  login,
  getConversations,
  getConversation,
  createConversation,
  updateConversationStatus,
  getMessages,
  sendMessage,
  getContacts,
  getContact,
  createContact,
} from './api';

// ── Capture interceptor functions once (before clearAllMocks removes call records)
let requestInterceptor:   (cfg: any) => any;
let responseErrHandler:   (err: any) => Promise<never>;

describe('api service', () => {
  beforeAll(() => {
    // api.ts registers interceptors at module-load time; capture them here
    requestInterceptor = mockHttp.interceptors.request.use.mock.calls[0][0];
    responseErrHandler = mockHttp.interceptors.response.use.mock.calls[0][1];
  });

  beforeEach(() => {
    vi.clearAllMocks(); // clears call counts but NOT implementations
    localStorage.clear();
  });

  // ── Request interceptor ───────────────────────────────────────────────────

  it('request interceptor adds Authorization header when token exists', () => {
    localStorage.setItem('ch_token', 'bearer-token');
    const cfg = { headers: {} } as any;
    const result = requestInterceptor(cfg);
    expect(result.headers.Authorization).toBe('Bearer bearer-token');
  });

  it('request interceptor skips Authorization when no token', () => {
    const cfg = { headers: {} } as any;
    const result = requestInterceptor(cfg);
    expect(result.headers.Authorization).toBeUndefined();
  });

  // ── Response error interceptor ────────────────────────────────────────────

  it('response error interceptor clears storage and redirects on 401', async () => {
    const spy = vi.spyOn(window, 'location', 'get').mockReturnValue({ href: '' } as any);
    const err = { response: { status: 401 } };
    await expect(responseErrHandler(err)).rejects.toBe(err);
    expect(localStorage.getItem('ch_token')).toBeNull();
    expect(localStorage.getItem('ch_user')).toBeNull();
    spy.mockRestore();
  });

  it('response error interceptor re-throws non-401 errors', async () => {
    const err = { response: { status: 500 } };
    await expect(responseErrHandler(err)).rejects.toBe(err);
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('login posts to /auth/login and returns response data', async () => {
    const payload = { token: 'tok', user: { id: 1 } };
    mockHttp.post.mockResolvedValueOnce({ data: payload });
    const result = await login({ email: 'a@b.com', password: 'pw' });
    expect(mockHttp.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pw' });
    expect(result).toEqual(payload);
  });

  // ── Conversations ─────────────────────────────────────────────────────────

  it('getConversations sends GET /conversations with params', async () => {
    const paged = { items: [], totalCount: 0, totalPages: 0, page: 1, pageSize: 20 };
    mockHttp.get.mockResolvedValueOnce({ data: paged });
    const result = await getConversations({ status: 'open', page: 2 });
    expect(mockHttp.get).toHaveBeenCalledWith('/conversations', {
      params: { status: 'open', page: 2 },
    });
    expect(result).toEqual(paged);
  });

  it('getConversations with no params passes undefined', async () => {
    mockHttp.get.mockResolvedValueOnce({ data: { items: [] } });
    await getConversations();
    expect(mockHttp.get).toHaveBeenCalledWith('/conversations', { params: undefined });
  });

  it('getConversation sends GET /conversations/:id', async () => {
    const conv = { id: 5, subject: 'T' };
    mockHttp.get.mockResolvedValueOnce({ data: conv });
    expect(await getConversation(5)).toEqual(conv);
    expect(mockHttp.get).toHaveBeenCalledWith('/conversations/5');
  });

  it('createConversation posts to /conversations', async () => {
    const conv = { id: 1 };
    mockHttp.post.mockResolvedValueOnce({ data: conv });
    const result = await createConversation({ contactId: 3, subject: 'Sub', body: 'Hi' });
    expect(mockHttp.post).toHaveBeenCalledWith('/conversations', { contactId: 3, subject: 'Sub', body: 'Hi' });
    expect(result).toEqual(conv);
  });

  it('updateConversationStatus patches /conversations/:id/status', async () => {
    const conv = { id: 2, status: 'resolved' };
    mockHttp.patch.mockResolvedValueOnce({ data: conv });
    const result = await updateConversationStatus(2, 'resolved');
    expect(mockHttp.patch).toHaveBeenCalledWith('/conversations/2/status', { status: 'resolved' });
    expect(result).toEqual(conv);
  });

  // ── Messages ──────────────────────────────────────────────────────────────

  it('getMessages sends GET /conversations/:id/messages', async () => {
    const msgs = [{ id: 1 }];
    mockHttp.get.mockResolvedValueOnce({ data: msgs });
    expect(await getMessages(7)).toEqual(msgs);
    expect(mockHttp.get).toHaveBeenCalledWith('/conversations/7/messages');
  });

  it('sendMessage posts to /messages', async () => {
    const msg = { id: 10 };
    mockHttp.post.mockResolvedValueOnce({ data: msg });
    const result = await sendMessage({ conversationId: 3, body: 'World' });
    expect(mockHttp.post).toHaveBeenCalledWith('/messages', { conversationId: 3, body: 'World' });
    expect(result).toEqual(msg);
  });

  // ── Contacts ──────────────────────────────────────────────────────────────

  it('getContacts sends GET /contacts with params', async () => {
    const paged = { items: [], totalCount: 0 };
    mockHttp.get.mockResolvedValueOnce({ data: paged });
    const result = await getContacts({ search: 'alice', page: 1 });
    expect(mockHttp.get).toHaveBeenCalledWith('/contacts', {
      params: { search: 'alice', page: 1 },
    });
    expect(result).toEqual(paged);
  });

  it('getContact sends GET /contacts/:id', async () => {
    const c = { id: 9 };
    mockHttp.get.mockResolvedValueOnce({ data: c });
    expect(await getContact(9)).toEqual(c);
    expect(mockHttp.get).toHaveBeenCalledWith('/contacts/9');
  });

  it('createContact posts to /contacts', async () => {
    const c = { id: 1 };
    mockHttp.post.mockResolvedValueOnce({ data: c });
    const result = await createContact({ name: 'Bob', email: 'bob@test.com' });
    expect(mockHttp.post).toHaveBeenCalledWith('/contacts', { name: 'Bob', email: 'bob@test.com' });
    expect(result).toEqual(c);
  });
});
