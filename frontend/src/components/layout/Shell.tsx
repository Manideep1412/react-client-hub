import { NavLink } from 'react-router-dom';
import { useSignalR } from '../../hooks/useSignalR';
import Sidebar from './Sidebar';

export default function Shell({ children }: { children: React.ReactNode }) {
  useSignalR();
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile-only top bar */}
        <header className="sm:hidden h-12 bg-white border-b border-gray-100 px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">ClientHub</span>
          </div>
          <div className="flex items-center gap-0.5">
            <NavLink to="/inbox"
              className={({ isActive }) =>
                `p-2 rounded-lg transition-colors ${isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:bg-gray-100'}`
              }>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m4-5l4 4 4-4" />
              </svg>
            </NavLink>
            <NavLink to="/contacts"
              className={({ isActive }) =>
                `p-2 rounded-lg transition-colors ${isActive ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:bg-gray-100'}`
              }>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </NavLink>
          </div>
        </header>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
