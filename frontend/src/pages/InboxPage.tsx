import { useParams } from 'react-router-dom';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';

export default function InboxPage() {
  const { id } = useParams<{ id?: string }>();

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationList />
      {id ? (
        <ChatWindow />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Select a conversation</p>
          <p className="text-xs text-gray-400 mt-1">Choose from the list on the left to start messaging</p>
        </div>
      )}
    </div>
  );
}
