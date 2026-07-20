import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../ui/Avatar';
import { useChatStore } from '../../store/chatStore';

const NAV = [
  {
    label: 'Inbox',
    to: '/inbox',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m4-5l4 4 4-4" />
      </svg>
    ),
  },
  {
    label: 'Contacts',
    to: '/contacts',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const totalUnread = useChatStore(s =>
    s.conversations.reduce((sum, c) => sum + c.unreadCount, 0)
  );

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="hidden sm:flex w-56 h-full bg-white border-r border-gray-100 flex-col flex-shrink-0">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-gray-900 tracking-tight">ClientHub</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            {item.icon}
            {item.label}
            {item.label === 'Inbox' && totalUnread > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div className="p-2 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
            <Avatar name={user.fullName} size="sm" online />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.fullName}</p>
              <p className="text-[11px] text-gray-400 truncate">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
