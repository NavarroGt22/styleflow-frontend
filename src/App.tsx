import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import PublicQueue from './pages/PublicQueue';
import ClientAuth from './pages/ClientAuth';
import NotFound from './pages/NotFound';
import { ADMIN_DEV_PORT, CLIENT_DEV_PORT } from './config/dev-ports';
import { isCustomDomainHost, isLocalhostHost } from './config/domains';

const isCustomDomain = isCustomDomainHost();

export default function App() {
  useEffect(() => {
    const port = window.location.port;
    const path = window.location.pathname;
    const hostname = window.location.hostname;

    if (isLocalhostHost(hostname)) {
      if (port === String(ADMIN_DEV_PORT)) {
        if (path.startsWith('/app')) {
          window.location.href = `http://${hostname}:${CLIENT_DEV_PORT}${path}${window.location.search}${window.location.hash}`;
        }
      } else if (port === String(CLIENT_DEV_PORT)) {
        if (path.startsWith('/admin') || path === '/login' || path === '/') {
          window.location.href = `http://${hostname}:${ADMIN_DEV_PORT}${path}${window.location.search}${window.location.hash}`;
        }
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {isCustomDomain ? (
          <>
            <Route path="/" element={<PublicQueue />} />
            <Route path="/login" element={<ClientAuth mode="login" />} />
            <Route path="/cadastro" element={<ClientAuth mode="register" />} />
            <Route path="/app/:salonSlug" element={<Navigate to="/" replace />} />
            <Route path="/app/:salonSlug/login" element={<Navigate to="/login" replace />} />
            <Route path="/app/:salonSlug/cadastro" element={<Navigate to="/cadastro" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/super" element={<SuperAdminDashboard />} />
            <Route path="/admin/novo" element={<Dashboard />} />
            <Route path="/admin/:salonSlug" element={<Dashboard />} />
            <Route path="/app/:salonSlug" element={<PublicQueue />} />
            <Route path="/app/:salonSlug/login" element={<ClientAuth mode="login" />} />
            <Route path="/app/:salonSlug/cadastro" element={<ClientAuth mode="register" />} />
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            <Route path="/public/:salonSlug" element={<Navigate to="/app/:salonSlug" replace />} />
          </>
        )}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
