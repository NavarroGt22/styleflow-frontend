import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ClientLogin from '../components/ClientLogin';
import ClientRegister from '../components/ClientRegister';
import { isCustomDomainHost, parseApiError, useTenantBranding } from '../hooks/useTenant';
import type { TenantBranding } from '../hooks/useTenant';
import { apiUrl } from '../config/api';
import { prefetchPublicSalon, readPublicSalonCache } from '../lib/public-salon-cache';

interface ClientAuthProps {
  mode: 'login' | 'register';
}

export default function ClientAuth({ mode }: ClientAuthProps) {
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const navigate = useNavigate();
  const isCustomDomain = isCustomDomainHost();

  const [tenant, setTenant] = useState<TenantBranding | null>(() => {
    const cached = readPublicSalonCache(salonSlug) as { tenant?: TenantBranding } | null;
    return cached?.tenant ?? null;
  });
  const [salonName, setSalonName] = useState(() => {
    const cached = readPublicSalonCache(salonSlug) as { salon?: { name?: string } } | null;
    return cached?.salon?.name || '';
  });
  const [salonAddress, setSalonAddress] = useState(() => {
    const cached = readPublicSalonCache(salonSlug) as { salon?: { address?: string } } | null;
    return cached?.salon?.address || '';
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { brandName, primaryColor, logoUrl } = useTenantBranding(tenant);

  const publicSalonPath = isCustomDomain ? '/' : `/app/${salonSlug}`;
  const loginPath = isCustomDomain ? '/login' : `/app/${salonSlug}/login`;
  const registerPath = isCustomDomain ? '/cadastro' : `/app/${salonSlug}/cadastro`;

  useEffect(() => {
    const token = sessionStorage.getItem('client_token');
    const storedUser = sessionStorage.getItem('client_user');
    if (token && storedUser) {
      navigate(publicSalonPath);
    }
  }, [navigate, publicSalonPath]);

  useEffect(() => {
    prefetchPublicSalon(salonSlug);
  }, [salonSlug]);

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
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
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

  const sharedProps = {
    brandName,
    salonName: salonName || salonSlug || brandName,
    salonAddress: salonAddress || undefined,
    logoUrl,
    primaryColor: primaryColor || '#d5a85c',
    backHref: publicSalonPath,
    onSubmit: handleSubmit,
    loading,
    error,
    success,
  };

  if (mode === 'login') {
    return (
      <ClientLogin
        {...sharedProps}
        registerHref={registerPath}
        onPrefetchAlternate={() => prefetchPublicSalon(salonSlug)}
        phone={phone}
        onPhoneChange={(value) => setPhone(formatPhoneInput(value))}
      />
    );
  }

  return (
    <ClientRegister
      {...sharedProps}
      loginHref={loginPath}
      onPrefetchAlternate={() => prefetchPublicSalon(salonSlug)}
      name={name}
      phone={phone}
      onNameChange={setName}
      onPhoneChange={(value) => setPhone(formatPhoneInput(value))}
    />
  );
}
