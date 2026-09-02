'use client'

import { useState, useEffect, useRef } from 'react';
import { toast } from '@/lib/client/toast';
import { useParams, useRouter } from 'next/navigation';
import { Clock, AlertCircle, Check, CheckCircle, Gift } from 'lucide-react';
import { secureFetch as fetch } from '@/lib/client/api';
import { useTenantBranding, type TenantBranding } from '@/lib/client/useTenant';
import { apiUrl, wsUrl } from '@/lib/client/config';
import { isCustomDomainHost } from '@/lib/client/domains';
import ClientLanding from '@/components/client/ClientLanding';
import BookingDateTimePicker from '@/components/client/BookingDateTimePicker';
import { ClientSalonError, ClientSalonLoading, clientBrandStyles } from '@/components/client/ClientSalonShell';
import { ClientTopBar } from '@/components/client/ClientTopBar';
import { BookingHero } from '@/components/client/booking/BookingHero';
import { DynamicQueueSection } from '@/components/client/queue/DynamicQueueSection';
import type { QueueSession } from '@/components/client/queue/types';
import { readClientSession, setSalonCache } from '@/lib/client/salon-cache';

const formatInstagramUrl = (url: string) => {
  if (!url) return '';
  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  if (clean.startsWith('www.instagram.com') || clean.startsWith('instagram.com')) {
    return `https://${clean}`;
  }
  const handle = clean.startsWith('@') ? clean.slice(1) : clean;
  return `https://instagram.com/${handle}`;
};

const generateTimeSlots = (professional: any, selectedDate: string, serviceDuration: number, busySlotsList: any[]) => {
  if (!professional) return [];
  const slots = [];
  const [startHour, startMin] = (professional.workStart || "09:00").split(':').map(Number);
  const [endHour, endMin] = (professional.workEnd || "18:00").split(':').map(Number);

  // Começo e fim do expediente como Date na data selecionada
  const workStart = new Date(`${selectedDate}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
  const workEnd = new Date(`${selectedDate}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`);

  let current = new Date(workStart);

  while (current.getTime() + serviceDuration * 60000 <= workEnd.getTime()) {
    const slotStart = new Date(current);
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

    // Verifica se bate com algum horário ocupado
    const isBusy = busySlotsList.some(busy => {
      const busyStart = new Date(busy.startTime);
      const busyEnd = new Date(busy.endTime);
      return (slotStart < busyEnd && slotEnd > busyStart);
    });

    const now = new Date();
    const isPast = slotStart.getTime() < now.getTime();

    slots.push({
      time: slotStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      available: !isBusy && !isPast,
      start: slotStart,
      end: slotEnd
    });

    current.setMinutes(current.getMinutes() + 30);
  }

  return slots;
};

const isCustomDomain = isCustomDomainHost();

export default function PublicSalonPage() {
  const params = useParams<{ salonSlug?: string }>();
  const salonSlug = params?.salonSlug;
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(() => readClientSession());
  const [loyalty, setLoyalty] = useState<any>(null);

  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('theme') !== 'light' : true,
  );

  useEffect(() => {
    document.documentElement.classList.add('dark');
    if (isDark) {
      document.body.classList.add('bg-[#0b0d0e]', 'text-white');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('bg-[#0b0d0e]', 'text-white');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // States para Agendamento Comercial
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [lastProfessionalId, setLastProfessionalId] = useState<string | null>(null);
  const appliedLastProfessional = useRef(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // States para Fila Dinâmica do Cliente
  const [activeQueueSession, setActiveQueueSession] = useState<any>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedQueueService, setSelectedQueueService] = useState<any>(null);
  const [joinQueueLoading, setJoinQueueLoading] = useState(false);
  const [joinQueueError, setJoinQueueError] = useState<string | null>(null);
  const [joinQueueSuccess, setJoinQueueSuccess] = useState<boolean>(false);

  const displayServices = (activeQueueSession?.services && activeQueueSession.services.length > 0)
    ? activeQueueSession.services.filter((s: any) => s.isActive !== false)
    : services.filter((s: any) => s.isActive !== false);

  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingBookingData, setLoadingBookingData] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    name: string;
    percentOff: number;
    discountAmount: number;
    quotedPrice: number;
    originalPrice: number;
  } | null>(null);

  const { brandName, primaryColor, logoUrl, faviconUrl } = useTenantBranding(data?.tenant);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) return;
    const icon = faviconUrl || logoUrl;
    if (icon) {
      link.href = icon;
      if (icon.includes('svg')) link.type = 'image/svg+xml';
      else if (icon.includes('png')) link.type = 'image/png';
      else link.type = 'image/x-icon';
    } else {
      link.href = '/favicon.svg';
      link.type = 'image/svg+xml';
    }
  }, [faviconUrl, logoUrl]);

  useEffect(() => {
    const sessionUser = readClientSession();
    if (sessionUser) setCurrentUser(sessionUser);
  }, []);

  useEffect(() => {
    const salonId = data?.salon?.id;
    if (!currentUser || !salonId || !sessionStorage.getItem('client_token')) {
      setLoyalty(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/loyalty/me?salonId=${encodeURIComponent(salonId)}`));
        if (!res.ok) return;
        const payload = await res.json();
        if (!cancelled) setLoyalty(payload);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, data?.salon?.id]);

  const handleLogout = () => {
    sessionStorage.removeItem('client_token');
    sessionStorage.removeItem('client_user');
    sessionStorage.removeItem('client_refreshToken');
    setCurrentUser(null);
    setLoyalty(null);
    setSelectedService(null);
    setSelectedProfessional(null);
    setSelectedDate('');
    setSelectedTime('');
    setBookingSuccess(null);
  };

  const getServiceDisplayInfo = () => {
    if (!selectedService) return null;
    if (!selectedProfessional || !selectedProfessional.services) {
      return {
        name: selectedService.name,
        price: selectedService.price,
        duration: selectedService.duration
      };
    }
    const custom = selectedProfessional.services.find((ps: any) => ps.serviceId === selectedService.id);
    if (custom && custom.isActive) {
      return {
        name: custom.customName || selectedService.name,
        price: (custom.customPrice !== null && custom.customPrice !== undefined) ? custom.customPrice : selectedService.price,
        duration: (custom.customDuration !== null && custom.customDuration !== undefined) ? custom.customDuration : selectedService.duration
      };
    }
    return {
      name: selectedService.name,
      price: selectedService.price,
      duration: selectedService.duration
    };
  };

  const displayService = getServiceDisplayInfo();

  const fetchPublicQueue = async () => {
    try {
      const fetchUrl = salonSlug
        ? apiUrl(`/queue/public/${salonSlug}`)
        : apiUrl('/queue/public');
      const res = await fetch(fetchUrl, {
        headers: {
          'X-Custom-Host': window.location.host,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 402 || body.code === 'BILLING_LOCKED') {
          throw new Error('Este salão está temporariamente indisponível. Tente novamente mais tarde.')
        }
        if (res.status === 404) {
          throw new Error('Fila pública ou estabelecimento não disponível.');
        }
        throw new Error(body.error || 'Erro ao carregar a fila de atendimento.');
      }
      const json = await res.json();
      setData(json);
      setSalonCache(salonSlug, json);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicQueue();
  }, [salonSlug]);

  useEffect(() => {
    if (!data?.salon?.queueMode) return;
    const interval = window.setInterval(() => {
      fetchPublicQueue();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [data?.salon?.queueMode, salonSlug]);

  useEffect(() => {
    const tenant = data?.tenant as TenantBranding | undefined;
    const salon = data?.salon;
    if (tenant || salon) {
      const brandName = tenant?.customBrandName || tenant?.name || salon?.name;
      document.title = `Agendamento - ${brandName}`;
    }
  }, [data?.tenant, data?.salon]);

  // Carregar dados adicionais de agendamento (serviços) se o salão estiver carregado
  useEffect(() => {
    if (data?.salon) {
      const fetchBookingData = async () => {
        setLoadingBookingData(true);
        try {
          const sRes = await fetch(apiUrl(`/services/${data.salon.id}`));
          let sJson = [];
          if (sRes.ok) sJson = await sRes.json();
          setServices(sJson);

          if (!data.salon.queueMode && currentUser) {
            const pRes = await fetch(apiUrl(`/professionals/${data.salon.id}`));
            let pJson = [];
            if (pRes.ok) pJson = await pRes.json();
            setProfessionals(pJson);
          }
        } catch (err) {
          console.error("Erro ao buscar dados de agendamento:", err);
        } finally {
          setLoadingBookingData(false);
        }
      };
      
      fetchBookingData();
    }
  }, [data?.salon?.id, currentUser]);

  const lastProfessionalStorageKey = data?.salon?.id && currentUser?.id
    ? `sf_last_pro_${data.salon.id}_${currentUser.id}`
    : null;

  // Pré-seleciona o último barbeiro do cliente
  useEffect(() => {
    appliedLastProfessional.current = false;
  }, [data?.salon?.id, currentUser?.id]);

  useEffect(() => {
    if (!professionals.length || !data?.salon?.id || !currentUser || appliedLastProfessional.current) return;

    const applyLastProfessional = async () => {
      let preferredId: string | null = null;

      if (lastProfessionalStorageKey) {
        preferredId = localStorage.getItem(lastProfessionalStorageKey);
      }

      const token = sessionStorage.getItem('client_token');
      if (token) {
        try {
          const res = await fetch(
            apiUrl(`/appointments/last-professional?salonId=${data.salon.id}`),
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            const json = await res.json();
            if (json.professionalId) preferredId = json.professionalId;
          }
        } catch {
          // mantém fallback do localStorage
        }
      }

      if (!preferredId) return;

      setLastProfessionalId(preferredId);
      const match = professionals.find((p) => p.id === preferredId);
      if (match) {
        setSelectedProfessional(match);
        appliedLastProfessional.current = true;
      }
    };

    applyLastProfessional();
  }, [professionals, data?.salon?.id, currentUser, lastProfessionalStorageKey]);


  // Carregar slots ocupados
  useEffect(() => {
    if (data?.salon?.id && selectedProfessional && selectedDate) {
      const fetchBusySlots = async () => {
        setLoadingSlots(true);
        try {
          const res = await fetch(apiUrl(`/appointments/busy-slots?salonId=${data.salon.id}&professionalId=${selectedProfessional.id}&date=${selectedDate}`));
          if (res.ok) {
            const json = await res.json();
            setBusySlots(json);
          }
        } catch (err) {
          console.error("Erro ao buscar horários ocupados:", err);
        } finally {
          setLoadingSlots(false);
        }
      };
      
      fetchBusySlots();
    } else {
      setBusySlots([]);
    }
  }, [data?.salon?.id, selectedProfessional?.id, selectedDate]);

  // Agendar horário
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
      setBookingError('Por favor, preencha todos os campos do agendamento.');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(null);

    const token = sessionStorage.getItem('client_token');
    if (!token) {
      setBookingError('Você precisa estar autenticado para realizar um agendamento.');
      setBookingLoading(false);
      return;
    }

    const start = new Date(`${selectedDate}T${selectedTime}:00`);
    const custom = selectedProfessional?.services?.find((ps: any) => ps.serviceId === selectedService.id);
    const duration = (custom && custom.customDuration !== null && custom.customDuration !== undefined)
      ? custom.customDuration
      : selectedService.duration;
    const end = new Date(start.getTime() + duration * 60000);

    const payload: Record<string, string> = {
      salonId: data.salon.id,
      professionalId: selectedProfessional.id,
      serviceId: selectedService.id,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    };
    if (appliedCoupon?.code) {
      payload.couponCode = appliedCoupon.code;
    }

    try {
      const res = await fetch(apiUrl('/appointments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao realizar o agendamento. Tente outro horário.');
      }

      setBookingSuccess({
        appointment: json.appointment,
        service: selectedService,
        professional: selectedProfessional,
        date: selectedDate,
        time: selectedTime
      });

      if (lastProfessionalStorageKey && selectedProfessional?.id) {
        localStorage.setItem(lastProfessionalStorageKey, selectedProfessional.id);
        setLastProfessionalId(selectedProfessional.id);
      }

      // Limpar formulário
      setSelectedService(null);
      setSelectedProfessional(null);
      setSelectedDate('');
      setSelectedTime('');
    } catch (err: any) {
      console.error(err);
      setBookingError(err.message || 'Ocorreu um erro.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQueueSession || !selectedQueueService) {
      setJoinQueueError('Por favor, selecione um serviço.');
      return;
    }

    setJoinQueueLoading(true);
    setJoinQueueError(null);

    const token = sessionStorage.getItem('client_token');
    if (!token) {
      setJoinQueueError('Você precisa estar autenticado para entrar na fila.');
      setJoinQueueLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl(`/queue/${activeQueueSession.sessionId}/join`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serviceId: selectedQueueService.id })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao entrar na fila.');
      }

      setJoinQueueSuccess(true);
      setSelectedQueueService(null);
      
      // Fecha o modal após 1.5s para exibir o visual de sucesso
      setTimeout(() => {
        setIsJoinModalOpen(false);
        setJoinQueueSuccess(false);
        setActiveQueueSession(null);
      }, 1500);

      // Atualiza a fila
      fetchPublicQueue();
    } catch (err: any) {
      console.error(err);
      setJoinQueueError(err.message || 'Ocorreu um erro.');
    } finally {
      setJoinQueueLoading(false);
    }
  };

  const handleLeaveQueue = async (sessionId: string) => {
    if (!window.confirm('Tem certeza que deseja sair desta fila de atendimento?')) {
      return;
    }

    const token = sessionStorage.getItem('client_token');
    if (!token) return;

    try {
      const res = await fetch(apiUrl(`/queue/${sessionId}/leave`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao sair da fila.');
      }

      // Atualiza a fila
      fetchPublicQueue();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro de conexão.');
    }
  };

  // WebSocket para atualizações em tempo real
  useEffect(() => {

    if (data?.salon?.id) {
      const ws = new WebSocket(wsUrl(`/ws/queue?salonId=${data.salon.id}`));
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type || msg.event;
          if (type === 'QUEUE_UPDATED' || type === 'SESSION_OPENED') {
            fetchPublicQueue();
          }
        } catch (err) {
          console.error("Erro ao processar mensagem WS:", err);
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [data?.salon?.id]);

  if (loading) {
    const cached = data?.tenant?.primaryColor as string | undefined;
    return <ClientSalonLoading accent={cached || '#d5a85c'} />;
  }

  if (error || !data) {
    return (
      <ClientSalonError
        accent={primaryColor || '#d5a85c'}
        error={error || 'Não foi possível encontrar a fila de atendimento para este estabelecimento.'}
        onRetry={() => {
          setLoading(true);
          fetchPublicQueue();
        }}
      />
    );
  }

  const { salon, queues } = data;
  const tenantSalons: Array<{ id: string; name: string; slug: string }> = data?.tenantSalons ?? [];

  const unitPicker = tenantSalons.length > 1 && (
    <div className="max-w-lg mx-auto mb-6 px-4">
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
        Escolha a unidade
      </label>
      <select
        value={salon.slug}
        onChange={(e) => {
          const next = e.target.value;
          if (isCustomDomain) {
            router.push(`/${next}`);
          } else {
            router.push(`/app/${next}`);
          }
        }}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-medium"
      >
        {tenantSalons.map((unit) => (
          <option key={unit.id} value={unit.slug}>{unit.name}</option>
        ))}
      </select>
    </div>
  );

  if (!salon.queueMode) {
    if (!currentUser) {
      const loginPath = isCustomDomain ? '/login' : `/app/${salonSlug}/login`;
      const digits = salon.phone ? String(salon.phone).replace(/\D/g, '') : '';
      const whatsappUrl = digits
        ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`
        : undefined;

      return (
        <div className="min-h-screen bg-[#0b0d0e]">
          {unitPicker}
          <ClientLanding
            brandName={brandName}
            salonName={salon.name}
            salonAddress={salon.address || undefined}
            logoUrl={logoUrl}
            heroImageUrl={data?.tenant?.heroImageUrl}
            historyText={data?.tenant?.historyText}
            lpSinceYear={data?.tenant?.lpSinceYear}
            primaryColor={primaryColor || '#d5a85c'}
            whatsappUrl={whatsappUrl}
            instagramUrl={salon.instagramUrl ? formatInstagramUrl(salon.instagramUrl) : undefined}
            loginPath={loginPath}
          />
        </div>
      );
    }

    const timeSlots = generateTimeSlots(
      selectedProfessional,
      selectedDate,
      displayService?.duration || 30,
      busySlots
    );

    const brand = primaryColor || '#d5a85c';

    return (
      <div className="min-h-screen bg-[#0b0d0e] px-4 py-8 text-slate-100 transition-colors duration-300 sm:px-6">
        {unitPicker}
        {primaryColor ? <style>{clientBrandStyles(primaryColor)}</style> : null}
        <div className="mx-auto max-w-6xl">
          <ClientTopBar
            currentUser={currentUser}
            brandColor={brand}
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            onLogout={handleLogout}
            salonSlug={salonSlug}
            isCustomDomain={isCustomDomain}
          />

          <BookingHero
            brandName={brandName}
            salonName={salon.name}
            salonAddress={salon.address}
            logoUrl={logoUrl}
            brandColor={brand}
            mode="booking"
          />

          {currentUser ? (
            /* WIZARD DE AGENDAMENTO COMERCIAL (LOGADO) */
            bookingSuccess ? (
              /* CARD DE AGENDAMENTO CONFIRMADO */
              <div className="mx-auto max-w-md animate-fade-in rounded-2xl border border-emerald-500/30 bg-[#1a1816] p-8 text-center shadow-xl">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 shadow-md">
                  <CheckCircle size={32} />
                </div>
                <h2 className="mb-2 text-2xl font-black text-white">Reserva Confirmada!</h2>
                <p className="mb-6 text-sm leading-relaxed text-slate-400">
                  Seu horário foi agendado com sucesso no StyleFlow.
                </p>

                <div className="mb-6 space-y-3 rounded-xl border border-white/10 bg-black/30 p-5 text-left">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="uppercase tracking-wider text-slate-500">Serviço</span>
                    <span className="text-slate-200">{bookingSuccess.service.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="uppercase tracking-wider text-slate-500">Profissional</span>
                    <span className="text-slate-200">{bookingSuccess.professional.user.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="uppercase tracking-wider text-slate-500">Data</span>
                    <span className="text-slate-200">{new Date(bookingSuccess.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="uppercase tracking-wider text-slate-500">Horário</span>
                    <span className="text-sm client-accent-text">{bookingSuccess.time}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs font-bold">
                    <span className="uppercase tracking-wider text-slate-500">Valor</span>
                    <span className="text-sm font-black client-accent-text">R$ {bookingSuccess.service.price.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBookingSuccess(null)}
                  className="w-full cursor-pointer rounded-xl border-none py-3.5 text-sm font-extrabold text-[#111] shadow-lg transition-all active:scale-95"
                  style={{ backgroundColor: brand }}
                >
                  Novo Agendamento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_minmax(240px,280px)]">
                <div className="space-y-3.5">

                  {loyalty ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-[9px] font-bold tracking-[0.14em] text-amber-200/80">
                          <Gift className="h-3.5 w-3.5 text-amber-300" />
                          SEUS CORTES &amp; PRÊMIOS
                        </h3>
                        {loyalty.availableCount > 0 ? (
                          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                            {loyalty.availableCount} disponível{loyalty.availableCount > 1 ? 'is' : ''}
                          </span>
                        ) : null}
                      </div>
                      <p className="mb-3 text-sm font-bold text-white">
                        {loyalty.completedCuts} corte{loyalty.completedCuts === 1 ? '' : 's'}
                        <span className="ml-2 text-[10px] font-medium text-slate-400">
                          ({loyalty.loyaltyResetMode === 'MONTHLY' ? 'reinicia todo mês' : 'acúmulo infinito'})
                        </span>
                      </p>
                      {loyalty.rewards?.length ? (
                        <div className="space-y-2">
                          {loyalty.rewards.map((reward: any) => {
                            const pct = Math.min(
                              100,
                              Math.round((reward.progressInCycle / reward.cutsRequired) * 100),
                            );
                            return (
                              <div key={reward.rewardId} className="rounded-lg border border-slate-700 bg-[#1d2a3e]/80 p-2.5">
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                  <p className="text-[11px] font-bold text-slate-100">{reward.title}</p>
                                  <span className="text-[10px] font-bold text-amber-300">
                                    {reward.progressInCycle}/{reward.cutsRequired}
                                  </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                                </div>
                                {reward.description ? (
                                  <p className="mt-1.5 text-[10px] text-slate-400">{reward.description}</p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">Nenhum prêmio configurado pelo salão ainda.</p>
                      )}
                    </div>
                  ) : null}
                  
                  {/* SELEÇÃO DE SERVIÇO */}
                  <div className="rounded-xl border border-white/10 bg-[#1a1816] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[0.14em] text-slate-400">
                      <span className="client-accent-text">1</span> SELECIONE O SERVIÇO
                    </h3>
                    {loadingBookingData ? (
                      <div className="flex justify-center py-8">
                        <div
                          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                          style={{ borderColor: brand, borderTopColor: 'transparent' }}
                        />
                      </div>
                    ) : services.length === 0 ? (
                      <p className="text-sm font-medium italic text-slate-400">Nenhum serviço disponível no catálogo no momento.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {services.map((s) => {
                          const selected = selectedService?.id === s.id;
                          return (
                          <div
                            key={s.id}
                            onClick={() => { setSelectedService(s); setSelectedTime(''); }}
                            className={`relative cursor-pointer rounded-lg border p-3 text-left transition-colors ${
                              selected
                                ? 'ring-1'
                                : 'border-white/10 bg-black/20 hover:border-white/20'
                            }`}
                            style={selected ? { borderColor: brand, boxShadow: `0 0 0 1px ${brand}40` } : undefined}
                          >
                            {selected && (
                              <Check className="absolute right-2 top-2 h-3 w-3 client-accent-text" />
                            )}
                            <h4 className="text-sm font-bold text-white">{s.name}</h4>
                            <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                              <span className="flex items-center gap-1 text-slate-400">
                                <Clock size={10} />
                                {s.duration} min
                              </span>
                              <span className="client-accent-text">R$ {s.price.toFixed(2)}</span>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SELEÇÃO DE PROFISSIONAL */}
                  <div className="rounded-xl border border-white/10 bg-[#1a1816] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[0.14em] text-slate-400">
                      <span className="client-accent-text">2</span> SELECIONE O PROFISSIONAL
                    </h3>
                    {loadingBookingData ? (
                      <div className="flex justify-center py-8">
                        <div
                          className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                          style={{ borderColor: brand, borderTopColor: 'transparent' }}
                        />
                      </div>
                    ) : professionals.length === 0 ? (
                      <p className="text-sm font-medium italic text-slate-400">Nenhum profissional disponível no momento.</p>
                    ) : (
                      <div className="space-y-3">
                        <select
                          value={selectedProfessional?.id ?? ''}
                          onChange={(e) => {
                            const pro = professionals.find((p) => p.id === e.target.value) ?? null;
                            setSelectedProfessional(pro);
                            setSelectedTime('');
                          }}
                          className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs font-semibold text-white outline-none focus:ring-1"
                          style={{ '--tw-ring-color': brand } as React.CSSProperties}
                        >
                          <option value="" disabled>Selecione um profissional...</option>
                          {professionals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.user.name}
                              {lastProfessionalId === p.id ? ' ★ (seu barbeiro habitual)' : ''}
                              {` — ${p.workStart} às ${p.workEnd}`}
                            </option>
                          ))}
                        </select>

                        {selectedProfessional && lastProfessionalId === selectedProfessional.id && (
                          <p className="flex items-center gap-1.5 text-xs font-bold client-accent-text">
                            <span className="text-base">★</span>
                            Seu último barbeiro — já selecionado para você
                          </p>
                        )}

                        {selectedProfessional && selectedService && (() => {
                          const custom = selectedProfessional.services?.find(
                            (ps: any) => ps.serviceId === selectedService.id
                          );
                          if (!custom || !custom.isActive) return null;
                          const hasCustomPrice = custom.customPrice !== null && custom.customPrice !== selectedService.price;
                          const hasCustomDuration = custom.customDuration !== null && custom.customDuration !== selectedService.duration;
                          if (!hasCustomPrice && !hasCustomDuration) return null;
                          return (
                            <div
                              className="rounded-xl border p-3 text-xs font-bold"
                              style={{ borderColor: `${brand}40`, backgroundColor: `${brand}12`, color: brand }}
                            >
                              Valores personalizados deste profissional:
                              {hasCustomPrice && <span className="ml-2">R$ {custom.customPrice.toFixed(2)}</span>}
                              {hasCustomDuration && <span className="ml-2">⏱️ {custom.customDuration} min</span>}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* SELEÇÃO DE DATA E HORÁRIO */}
                  <BookingDateTimePicker
                    brandColor={primaryColor || '#d5a85c'}
                    openWeekdays={
                      Array.isArray(data?.salon?.openWeekdays) && data.salon.openWeekdays.length
                        ? data.salon.openWeekdays
                        : [1, 2, 3, 4, 5, 6]
                    }
                    closedDayMessage={
                      data?.salon?.closedDayMessage ||
                      'Neste dia o barbeiro está de folga. Escolha outro dia para o corte.'
                    }
                    selectedDate={selectedDate}
                    onSelectDate={(value) => {
                      setSelectedDate(value);
                      setSelectedTime('');
                    }}
                    selectedTime={selectedTime}
                    onSelectTime={setSelectedTime}
                    timeSlots={timeSlots}
                    loadingSlots={loadingSlots}
                    disabled={!selectedProfessional}
                  />

                </div>

                <aside>
                  <div className="rounded-xl border border-white/10 bg-[#1a1816] p-4 lg:sticky lg:top-[4.5rem] lg:z-30">
                    <h3 className="mb-4 border-b border-white/10 pb-3 text-[10px] font-bold uppercase tracking-widest client-accent-text">
                      RESUMO DA RESERVA
                    </h3>
                    
                    {bookingError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold mb-4 leading-relaxed">
                        {bookingError}
                      </div>
                    )}

                    <div className="space-y-3.5 text-sm mb-6">
                      <div className="space-y-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Serviço</span>
                        <span className="block text-right font-medium leading-snug text-slate-200">{displayService ? displayService.name : 'Não selecionado'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Duração</span>
                        <span className="block text-right font-medium text-slate-200">{displayService ? `${displayService.duration} min` : '-'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Profissional</span>
                        <span className="block text-right font-medium leading-snug text-slate-200">{selectedProfessional ? selectedProfessional.user.name : 'Não selecionado'}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Data</span>
                        <span className="block text-right font-medium text-slate-200">
                          {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não selecionada'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Horário</span>
                        <span className="block text-right text-base font-bold text-[var(--brand,#d5a85c)]">{selectedTime || 'Não selecionado'}</span>
                      </div>
                      <div className="space-y-2 border-t border-white/10 pt-3">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cupom</span>
                        <div className="flex gap-2">
                          <input
                            value={couponCode}
                            onChange={(e) => {
                              setCouponCode(e.target.value)
                              setAppliedCoupon(null)
                            }}
                            placeholder="Código"
                            className="h-10 flex-1 rounded-lg border border-white/10 bg-[#0b0d0e] px-3 text-sm text-white outline-none focus:border-[var(--brand,#d5a85c)]"
                          />
                          <button
                            type="button"
                            disabled={couponLoading || !couponCode.trim() || !displayService}
                            onClick={async () => {
                              if (!displayService || !data?.salon?.id) return
                              const token = sessionStorage.getItem('client_token')
                              if (!token) {
                                setBookingError('Entre na conta para aplicar o cupom.')
                                return
                              }
                              setCouponLoading(true)
                              setBookingError(null)
                              try {
                                const res = await fetch(apiUrl('/coupons/validate'), {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    salonId: data.salon.id,
                                    code: couponCode,
                                    servicePrice: displayService.price,
                                  }),
                                })
                                const json = await res.json()
                                if (!res.ok) throw new Error(json.error || 'Cupom inválido')
                                setAppliedCoupon(json)
                              } catch (err) {
                                setAppliedCoupon(null)
                                setBookingError(err instanceof Error ? err.message : 'Cupom inválido')
                              } finally {
                                setCouponLoading(false)
                              }
                            }}
                            className="rounded-lg border border-white/15 px-3 text-xs font-bold uppercase tracking-wide text-[var(--brand,#d5a85c)] disabled:opacity-40"
                          >
                            {couponLoading ? '...' : 'Aplicar'}
                          </button>
                        </div>
                        {appliedCoupon ? (
                          <p className="text-xs text-emerald-400">
                            {appliedCoupon.code}: -{appliedCoupon.percentOff}% (−R$ {appliedCoupon.discountAmount.toFixed(2)})
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1 border-t border-white/10 pt-3">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</span>
                        <span className="block text-right text-xl font-bold client-accent-text">
                          R${' '}
                          {displayService
                            ? (appliedCoupon?.quotedPrice ?? displayService.price).toFixed(2)
                            : '0,00'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleSchedule}
                      disabled={bookingLoading || !selectedService || !selectedProfessional || !selectedDate || !selectedTime}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none py-3.5 px-6 text-sm font-black uppercase tracking-wider text-[#111] shadow-lg transition-all duration-300 active:scale-95 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                      style={{ backgroundColor: brand }}
                    >
                      {bookingLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                          <span>Confirmando...</span>
                        </>
                      ) : (
                        <span>Confirmar Agendamento</span>
                      )}
                    </button>
                  </div>
                </aside>
              </div>
            )
          ) : null}

          <footer className="mt-16 text-center">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Painel STYLEFLOW • Todos os direitos reservados.
            </p>
          </footer>
        </div>
      </div>
    );
  }

  if (!salon.queueAllowClientView) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">{salon.name}</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
            A consulta pública de fila está desativada para este estabelecimento.
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
            Entre em contato direto com o salão para obter informações sobre seu atendimento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d0e] py-10 px-4 transition-colors duration-300">
      {unitPicker}
      {primaryColor && <style>{clientBrandStyles(primaryColor)}</style>}
      <div className="max-w-4xl mx-auto">
        <ClientTopBar
          currentUser={currentUser}
          brandColor={primaryColor || '#d5a85c'}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onLogout={handleLogout}
          salonSlug={salonSlug}
          isCustomDomain={isCustomDomain}
        />

        <DynamicQueueSection
          queues={queues as QueueSession[]}
          brandColor={primaryColor || '#d5a85c'}
          brandName={brandName}
          currentUser={currentUser}
          salonSlug={salonSlug}
          isCustomDomain={isCustomDomain}
          onJoin={(queue) => {
            setActiveQueueSession(queue);
            setIsJoinModalOpen(true);
            setJoinQueueError(null);
          }}
          onLeave={handleLeaveQueue}
        />

        <footer className="mt-16 text-center">
          <p className="text-xs text-slate-500">
            Painel STYLEFLOW • Todos os direitos reservados.
          </p>
        </footer>

      </div>

      {/* MODAL PREMIUM ENTRAR NA FILA */}
      {isJoinModalOpen && activeQueueSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200/50 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            
            {/* HEADER DO MODAL */}
            <div className="p-6 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-gray-150 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-gray-950 dark:text-white">Entrar na Fila</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                  Profissional: {activeQueueSession.professionalName}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsJoinModalOpen(false);
                  setActiveQueueSession(null);
                  setSelectedQueueService(null);
                }}
                className="text-gray-400 hover:text-gray-650 dark:hover:text-white transition-colors cursor-pointer border-none bg-transparent text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* CONTEÚDO DO MODAL */}
            <form onSubmit={handleJoinQueue} className="p-6 space-y-6">
              
              {joinQueueSuccess ? (
                <div className="text-center py-6 animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="font-extrabold text-gray-900 dark:text-white text-lg">Entrada Confirmada!</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Prepare-se, você foi inserido na fila com sucesso.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-3">
                      Selecione o Serviço desejado
                    </label>
                    {displayServices.length === 0 ? (
                      <p className="text-sm font-semibold text-gray-500 italic">Nenhum serviço disponível.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                        {displayServices.map((s: any) => {
                          const isSelected = selectedQueueService?.id === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedQueueService(s)}
                              className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-indigo-50/70 border-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-md shadow-indigo-500/10' 
                                  : 'bg-slate-50/50 hover:bg-slate-100/50 border-gray-200 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 dark:border-slate-700'
                              }`}
                            >
                              <div>
                                  <h5 className="font-bold text-gray-900 dark:text-white text-sm">{s.name}</h5>
                                  <span className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold mt-0.5 block">
                                    Duração: {s.duration || 30} min
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className={`text-sm font-black block ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    R$ {s.price.toFixed(2)}
                                  </span>
                                  {isSelected && (
                                    <span className="inline-flex items-center justify-center w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] mt-1">
                                      <Check size={8} />
                                    </span>
                                  )}
                                </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {joinQueueError && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-200/50 dark:border-red-900/30 rounded-xl text-xs font-bold leading-relaxed flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{joinQueueError}</span>
                    </div>
                  )}

                  {/* BOTÕES DE AÇÃO */}
                  <div className="flex gap-3 pt-3 border-t border-gray-150 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => {
                        setIsJoinModalOpen(false);
                        setActiveQueueSession(null);
                        setSelectedQueueService(null);
                      }}
                      className="flex-1 px-4 py-3 border border-gray-250 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600 text-gray-500 dark:text-slate-350 rounded-xl text-xs font-extrabold transition-colors cursor-pointer bg-transparent"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={joinQueueLoading || !selectedQueueService}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none cursor-pointer border-none"
                    >
                      {joinQueueLoading ? 'Confirmando...' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
