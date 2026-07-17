import axios from 'axios';
import type {
  AuthResponse, LoginRequest, Conversation, Message,
  Contact, PagedResult, SendMessageRequest,
  CreateConversationRequest, CreateContactRequest
} from '../types';

// In production VITE_API_URL = https://your-backend.azurecontainerapps.io
// In dev, Vite proxy handles /api → localhost:5000
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const http = axios.create({ baseURL: BASE });

http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ch_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

http.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ch_token');
      localStorage.removeItem('ch_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data: LoginRequest) =>
  http.post<AuthResponse>('/auth/login', data).then(r => r.data);

// Conversations
export const getConversations = (params?: { status?: string; search?: string; page?: number; pageSize?: number }) =>
  http.get<PagedResult<Conversation>>('/conversations', { params }).then(r => r.data);

export const getConversation = (id: number) =>
  http.get<Conversation>(`/conversations/${id}`).then(r => r.data);

export const createConversation = (data: CreateConversationRequest) =>
  http.post<Conversation>('/conversations', data).then(r => r.data);

export const updateConversationStatus = (id: number, status: string) =>
  http.patch<Conversation>(`/conversations/${id}/status`, { status }).then(r => r.data);

// Messages
export const getMessages = (conversationId: number) =>
  http.get<Message[]>(`/conversations/${conversationId}/messages`).then(r => r.data);

export const sendMessage = (data: SendMessageRequest) =>
  http.post<Message>('/messages', data).then(r => r.data);

// Contacts
export const getContacts = (params?: { search?: string; page?: number }) =>
  http.get<PagedResult<Contact>>('/contacts', { params }).then(r => r.data);

export const getContact = (id: number) =>
  http.get<Contact>(`/contacts/${id}`).then(r => r.data);

export const createContact = (data: CreateContactRequest) =>
  http.post<Contact>('/contacts', data).then(r => r.data);
