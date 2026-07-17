import { useSignalR } from '../../hooks/useSignalR';
import Sidebar from './Sidebar';

export default function Shell({ children }: { children: React.ReactNode }) {
  useSignalR();
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
