import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getConversation, getMessages, sendMessage as sendMessageApi, updateConversationStatus } from '../../services/api';
import { useChatStore } from '../../store/chatStore';
import { chatHub } from '../../services/signalr';
import type { Conversation } from '../../types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';

export default function ChatWindow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const convId = Number(id);
  const { messages, setMessages, markRead, appendMessage } = useChatStore();
  const [conv,       setConv]       = useState<Conversation | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [statusBusy, setStatusBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevId    = useRef<number | null>(null);

  useEffect(() => {
    if (!convId) return;
    if (prevId.current && prevId.current !== convId)
      chatHub.leaveConversation(prevId.current).catch(() => {});
    prevId.current = convId;
    setLoading(true);

    Promise.all([getConversation(convId), getMessages(convId)])
      .then(([c, msgs]) => {
        setConv(c);
        setMessages(convId, msgs);
        markRead(convId);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    chatHub.joinConversation(convId).catch(() => {});
    return () => { chatHub.leaveConversation(convId).catch(() => {}); };
  }, [convId]);

  // Polling fallback: catches any messages SignalR missed.
  // Merges by id so no duplicates or scroll flicker.
  useEffect(() => {
    if (!convId) return;
    const poll = setInterval(async () => {
      try {
        const fresh = await getMessages(convId);
        const store = useChatStore.getState();
        const current = store.messages[convId] ?? [];
        const knownIds = new Set(current.map(m => m.id));
        fresh.filter(m => !knownIds.has(m.id)).forEach(m => store.appendMessage(m));
      } catch { /* ignore */ }
    }, 500);
    return () => clearInterval(poll);
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[convId]?.length]);

  async function handleStatusChange(status: 'resolved' | 'closed' | 'open') {
    if (!conv || statusBusy) return;
    setStatusBusy(true);
    try {
      const updated = await updateConversationStatus(conv.id, status);
      setConv(updated);
      useChatStore.getState().upsertConversation(updated);
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleSend(body: string) {
    try {
      if (chatHub.isConnected) {
        // SignalR: hub saves to DB and broadcasts ReceiveMessage back to group (including sender)
        await chatHub.sendMessage(convId, body);
      } else {
        // Fallback: REST API + add to store locally so sender sees the message
        const msg = await sendMessageApi({ conversationId: convId, body });
        appendMessage(msg);
      }
    } catch {
      // SignalR invoke failed — fall back to REST
      const msg = await sendMessageApi({ conversationId: convId, body });
      appendMessage(msg);
    }
  }

  const msgs = messages[convId] ?? [];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }
  if (!conv) return null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 px-3 sm:px-5 border-b border-gray-100 bg-white flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/inbox')}
          className="sm:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
          aria-label="Back to conversations"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Avatar name={conv.contactName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{conv.contactName}</span>
            <Badge label={conv.status} variant={conv.status as 'open' | 'pending' | 'resolved' | 'closed'} />
          </div>
          <p className="text-xs text-gray-400 truncate">{conv.subject}</p>
        </div>
        {conv.assignedToName && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-gray-400">Assigned to</span>
            <span className="font-medium text-gray-700">{conv.assignedToName}</span>
          </div>
        )}

        {/* Status action buttons */}
        <div className="flex items-center gap-1.5 ml-2">
          {conv.status === 'closed' ? (
            <button
              onClick={() => handleStatusChange('open')}
              disabled={statusBusy}
              className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Reopen
            </button>
          ) : (
            <>
              {conv.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={statusBusy}
                  className="px-3 py-1 text-xs font-medium rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  {statusBusy ? '…' : 'Resolve'}
                </button>
              )}
              <button
                onClick={() => handleStatusChange('closed')}
                disabled={statusBusy}
                className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {statusBusy ? '…' : 'Close'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          msgs.map(m => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} disabled={conv.status === 'closed'} />
    </div>
  );
}
