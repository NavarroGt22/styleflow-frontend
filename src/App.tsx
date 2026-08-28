import { useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminRoute from './pages/AdminRoute';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import PublicQueue from './pages/PublicQueue';
import ClientAuth from './pages/ClientAuth';
import NotFound from './pages/NotFound';
import { ADMIN_DEV_PORT, CLIENT_DEV_PORT } from './config/dev-ports';
import { isCustomDomainHost, isLocalhostHost } from './config/domains';
import { ToastHost } from './lib/toast';

function isClientAppRoute(pathname: string, isCustomDomain: boolean) {
  if (pathname.startsWith('/platform') || pathname.startsWith('/admin')) return false;
  if (isCustomDomain) {
    return pathname === '/' || pathname === '/login' || pathname === '/cadastro' || pathname.startsWith('/app/');
  }
  return pathname.startsWith('/app/');
}

function AppRoutes() {
  const isCustomDomain = isCustomDomainHost();
  const location = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);
  const isClientSurface = useMemo(
    () => isClientAppRoute(location.pathname, isCustomDomain),
    [location.pathname, isCustomDomain]
  );

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

  useEffect(() => {
    document.documentElement.classList.toggle('client-surface', isClientSurface);
    return () => {
      document.documentElement.classList.remove('client-surface');
    };
  }, [isClientSurface]);

  useEffect(() => {
    if (!isClientSurface || !shellRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const node = shellRef.current;
    node.classList.remove('page-enter');
    void node.offsetWidth;
    node.classList.add('page-enter');
  }, [location.pathname, isClientSurface]);

  return (
    <div
      ref={shellRef}
      className={isClientSurface ? 'min-h-screen bg-[#0b0d0e]' : undefined}
    >
      <Routes location={location}>
        <Route path="/platform/super" element={<SuperAdminDashboard />} />
        <Route path="/admin/super" element={<Navigate to="/platform/super" replace />} />
        <Route path="/admin/novo" element={<Dashboard />} />
        <Route path="/admin/:salonSlug" element={<AdminRoute />} />
        <Route path="/admin" element={<Navigate to="/login" replace />} />

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
            <Route path="/app/:salonSlug" element={<PublicQueue />} />
            <Route path="/app/:salonSlug/login" element={<ClientAuth mode="login" />} />
            <Route path="/app/:salonSlug/cadastro" element={<ClientAuth mode="register" />} />
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            <Route path="/public/:salonSlug" element={<Navigate to="/app/:salonSlug" replace />} />
          </>
        )}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastHost />
      <AppRoutes />
    </BrowserRouter>
  );
}
