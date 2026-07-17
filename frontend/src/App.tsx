import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/layout/Shell';
import LoginPage from './pages/LoginPage';
import InboxPage from './pages/InboxPage';
import ContactsPage from './pages/ContactsPage';
import { useAuthStore } from './store/authStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Shell>
                <Routes>
                  <Route path="/" element={<Navigate to="/inbox" replace />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/inbox/:id" element={<InboxPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                </Routes>
              </Shell>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
