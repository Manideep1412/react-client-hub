import * as signalR from '@microsoft/signalr';
import type { Message, Conversation } from '../types';

type MessageHandler = (message: Message) => void;
type ConversationHandler = (conversation: Conversation) => void;

class ChatHubService {
  private connection: signalR.HubConnection | null = null;

  async start(token: string): Promise<void> {
    // Dev:  direct to localhost:5000 (bypasses Vite proxy which is unreliable for WS)
    // Prod: VITE_API_URL is the Azure Container Apps backend URL
    const apiRoot = import.meta.env.VITE_API_URL
      ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');
    const hubUrl = `${apiRoot}/hubs/chat`;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 1000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    await this.connection.start();
  }

  async stop(): Promise<void> {
    await this.connection?.stop();
    this.connection = null;
  }

  async joinConversation(conversationId: number): Promise<void> {
    await this.connection?.invoke('JoinConversation', conversationId);
  }

  async leaveConversation(conversationId: number): Promise<void> {
    await this.connection?.invoke('LeaveConversation', conversationId);
  }

  async sendMessage(conversationId: number, body: string): Promise<void> {
    await this.connection?.invoke('SendMessage', conversationId, body);
  }

  onMessage(handler: MessageHandler): () => void {
    this.connection?.on('ReceiveMessage', handler);
    return () => this.connection?.off('ReceiveMessage', handler);
  }

  onConversationUpdated(handler: ConversationHandler): () => void {
    this.connection?.on('ConversationUpdated', handler);
    return () => this.connection?.off('ConversationUpdated', handler);
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}

export const chatHub = new ChatHubService();
