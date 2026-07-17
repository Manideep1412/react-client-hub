import { format } from 'date-fns';
import type { Message } from '../../types';
import Avatar from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';

interface Props { message: Message; }

function parseDate(iso: string) {
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z');
}

export default function MessageBubble({ message }: Props) {
  const userId = useAuthStore(s => s.user?.id);
  const isOwn  = message.senderId === userId;
  const date   = parseDate(message.createdAt);

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && <Avatar name={message.senderName} size="xs" />}
      <div className={`max-w-[72%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="text-[11px] text-gray-400 ml-1">{message.senderName}</span>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-brand-500 text-white rounded-br-sm'
            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-soft'
        }`}>
          {message.body}
        </div>
        <span className="text-[10px] text-gray-400 mx-1">
          {format(date, 'h:mm a')}
        </span>
      </div>
    </div>
  );
}
