export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'Agent' | 'Admin';
  avatarUrl?: string;
  isOnline?: boolean;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  company?: string;
  avatarUrl?: string;
  createdAt: string;
  conversationCount: number;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderType: 'agent' | 'client';
  body: string;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: number;
  contactId: number;
  contactName: string;
  contactEmail: string;
  contactAvatarUrl?: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  assignedToId?: number;
  assignedToName?: string;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SendMessageRequest {
  conversationId: number;
  body: string;
}

export interface CreateConversationRequest {
  contactId: number;
  subject: string;
  body: string;
}

export interface CreateContactRequest {
  name: string;
  email: string;
  company?: string;
}
