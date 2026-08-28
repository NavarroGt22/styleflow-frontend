import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Scissors, ArrowLeft, Loader2, Sparkles, MapPin } from 'lucide-react';
import {
  getTenantBrandCss,
  isCustomDomainHost,
  parseApiError,
  useTenantBranding,
} from '../hooks/useTenant';
import type { TenantBranding } from '../hooks/useTenant';
import { apiUrl } from '../config/api';

interface ClientAuthProps {
  mode: 'login' | 'register';
}

export default function ClientAuth({ mode }: ClientAuthProps) {
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const navigate = useNavigate();
  const isCustomDomain = isCustomDomainHost();

  const [tenant, setTenant] = useState<TenantBranding | null>(null);
  const [salonName, setSalonName] = useState('');
  const [salonAddress, setSalonAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { brandName, primaryColor, logoUrl } = useTenantBranding(tenant);

  const publicSalonPath = isCustomDomain ? '/' : `/app/${salonSlug}`;
  const loginPath = isCustomDomain ? '/login' : `/app/${salonSlug}/login`;
  const registerPath = isCustomDomain ? '/cadastro' : `/app/${salonSlug}/cadastro`;
  const alternatePath = mode === 'login' ? registerPath : loginPath;

  useEffect(() => {
    const token = sessionStorage.getItem('client_token');
    const storedUser = sessionStorage.getItem('client_user');
    if (token && storedUser) {
      navigate(publicSalonPath);
    }
  }, [navigate, publicSalonPath]);

  useEffect(() => {
    const fetchSalonInfo = async () => {
      try {
        const url = salonSlug
          ? apiUrl(`/queue/public/${salonSlug}`)
          : apiUrl('/queue/public');

        const res = await fetch(url, {
          headers: {
            'X-Custom-Host': window.location.host,
          },
        });

        if (!res.ok) return;

        const json = await res.json();
        if (json?.tenant) setTenant(json.tenant);
        if (json?.salon?.name) setSalonName(json.salon.name);
        if (json?.salon?.address) setSalonAddress(json.salon.address);
      } catch (err) {
        console.error('Erro ao carregar dados do salão:', err);
      }
    };

    fetchSalonInfo();
  }, [salonSlug]);

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    // Até 7 dígitos: (71) 98884 — sem traço, para conseguir apagar normalmente
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    // Celular 11 dígitos: (71) 98884-1234
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    // 8 a 10 dígitos (fixando ou fixo): (71) 9888-4123
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const isLogin = mode === 'login';
    const endpoint = isLogin ? '/auth/client/login' : '/auth/client/register';

    const payload: Record<string, unknown> = {
      phone: phone.replace(/\D/g, ''),
      ...(tenant?.id ? { tenantId: tenant.id } : {}),
      ...(salonSlug ? { salonSlug } : {}),
    };

    if (!isLogin) {
      payload.name = name.trim();
    }

    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(parseApiError(data, 'Ocorreu um erro ao processar sua solicitação.'));
      }

      sessionStorage.setItem('client_token', data.token);
      sessionStorage.setItem('client_refreshToken', data.refreshToken);
      sessionStorage.setItem('client_user', JSON.stringify(data.user));

      setSuccess(isLogin ? 'Login realizado! Redirecionando...' : 'Conta criada! Redirecionando...');
      setTimeout(() => navigate(publicSalonPath), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300 px-4 relative overflow-hidden">
      {primaryColor && <style>{getTenantBrandCss(primaryColor)}</style>}

      <Link
        to={publicSalonPath}
        className="absolute top-6 left-6 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-extrabold text-xs rounded-full border border-gray-200 dark:border-slate-700 transition-all shadow-sm hover:scale-105 active:scale-95"
      >
        <ArrowLeft size={16} />
        <span>Ver Fila de Espera</span>
      </Link>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-slate-700 relative z-10">
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="w-16 h-16 object-cover rounded-2xl shadow-lg mb-4"
            />
          ) : (
            <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20 mb-4">
              <Scissors size={32} />
            </div>
          )}

          <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-md mb-2 flex items-center gap-1 shadow-sm">
            <Sparkles size={10} />
            <span>{brandName}</span>
          </span>

          <h1 className="text-2xl font-black text-center text-gray-900 dark:text-white mt-1">
            {mode === 'login' ? 'Entrar no Salão' : 'Criar sua Conta'}
          </h1>
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1.5 text-center">
            {salonName || salonSlug || brandName}
          </p>
          {salonAddress && (
            <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 text-center max-w-sm">
              <MapPin size={12} className="shrink-0" />
              <span>{salonAddress}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg mb-6 text-sm text-center font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/30">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg mb-6 text-sm text-center font-medium bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">
                Seu Nome
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">
              Telefone / WhatsApp
            </label>
            <input
              required
              type="text"
              inputMode="tel"
              maxLength={15}
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="(11) 99999-9999"
            />
            {mode === 'login' && (
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">
                Use o mesmo número que cadastrou na barbearia.
              </p>
            )}
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 mt-6 active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Entrar' : 'Cadastrar e Entrar'}</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700 text-center">
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
            {mode === 'login' ? 'Novo por aqui?' : 'Já possui uma conta?'}
            <Link
              to={alternatePath}
              className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
            >
              {mode === 'login' ? 'Crie sua conta' : 'Entrar com seu telefone'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
