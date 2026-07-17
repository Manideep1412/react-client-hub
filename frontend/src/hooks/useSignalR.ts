import { useEffect, useRef } from 'react';
import { chatHub } from '../services/signalr';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

export function useSignalR() {
  const token = useAuthStore(s => s.token);
  const { appendMessage, upsertConversation } = useChatStore();
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    // start() assigns this.connection synchronously before the first await,
    // so calling onMessage() immediately after is safe — connection object is already set.
    chatHub.start(token)
      .then(() => console.log('[SignalR] Connected'))
      .catch(err => console.error('[SignalR] Connection failed — REST fallback active:', err));

    const offMsg  = chatHub.onMessage(msg => appendMessage(msg));
    const offConv = chatHub.onConversationUpdated(c => upsertConversation(c));

    return () => {
      offMsg();
      offConv();
      chatHub.stop();
      started.current = false;
    };
  }, [token]);
}
