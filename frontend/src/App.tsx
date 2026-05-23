import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PublicQueue from './pages/PublicQueue';
import ClientAuth from './pages/ClientAuth';
import NotFound from './pages/NotFound';

export default function App() {
  // Redirecionamento dinâmico de portas para isolar 100% o localStorage das duas sessões
  useEffect(() => {
    const port = window.location.port;
    const path = window.location.pathname;

    if (port === '5173') {
      // Porta 5173 é restrita ao Painel de Admin/Profissional
      if (path.startsWith('/app')) {
        window.location.href = `http://localhost:5174${path}${window.location.search}${window.location.hash}`;
      }
    } else if (port === '5174') {
      // Porta 5174 é restrita ao Painel do Cliente final
      if (path.startsWith('/admin') || path === '/login' || path === '/') {
        window.location.href = `http://localhost:5173${path}${window.location.search}${window.location.hash}`;
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/novo" element={<Dashboard />} />
        <Route path="/admin/:salonSlug" element={<Dashboard />} />
        <Route path="/app/:salonSlug" element={<PublicQueue />} />
        <Route path="/app/:salonSlug/login" element={<ClientAuth mode="login" />} />
        <Route path="/app/:salonSlug/cadastro" element={<ClientAuth mode="register" />} />
        {/* Fallbacks para rotas antigas */}
        <Route path="/dashboard" element={<Navigate to="/login" replace />} />
        <Route path="/public/:salonSlug" element={<Navigate to="/app/:salonSlug" replace />} />
        
        {/* Catch-all para rotas não mapeadas (404 Not Found) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}


