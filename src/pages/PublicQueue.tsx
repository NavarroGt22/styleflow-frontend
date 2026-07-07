import { useState, useEffect, useRef } from 'react';
import { toast } from '../lib/toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Scissors, Clock, Users, AlertCircle, Instagram, Calendar, Check, CheckCircle, Sun, Moon } from 'lucide-react';
import { secureFetch as fetch } from '../utils/api';
import { useTenantBranding, type TenantBranding } from '../hooks/useTenant';
import { apiUrl, wsUrl } from '../config/api';
import { isCustomDomainHost } from '../config/domains';
import { computeQueueWaitMinutes } from '../lib/queue-wait';
import { QueueActiveTimer } from '../components/QueueActiveTimer';

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

export default function PublicQueue() {
  const todayStr = new Date().toISOString().split('T')[0];
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-slate-900', 'text-white');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-slate-900', 'text-white');
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
    try {
      const stored = sessionStorage.getItem('client_user');
      const token = sessionStorage.getItem('client_token');
      if (stored && token) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
      }
    } catch (err) {
      console.error('Erro ao ler dados do cliente logado:', err);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('client_token');
    sessionStorage.removeItem('client_user');
    sessionStorage.removeItem('client_refreshToken');
    setCurrentUser(null);
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
          'X-Custom-Host': window.location.host
        }
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Fila pública ou estabelecimento não disponível.');
        }
        throw new Error('Erro ao carregar a fila de atendimento.');
      }
      const json = await res.json();
      setData(json);
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

    const payload = {
      salonId: data.salon.id,
      professionalId: selectedProfessional.id,
      serviceId: selectedService.id,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    };

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
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-bold text-gray-500 dark:text-slate-400 animate-pulse">Carregando painel...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-red-100 dark:border-red-900/30 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Painel Indisponível</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
            {error || 'Não foi possível encontrar a fila de atendimento para este estabelecimento.'}
          </p>
          <button
            onClick={() => { setLoading(true); fetchPublicQueue(); }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border-indigo-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
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
            navigate(`/${next}`);
          } else {
            navigate(`/app/${next}`);
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
    const timeSlots = generateTimeSlots(
      selectedProfessional,
      selectedDate,
      displayService?.duration || 30,
      busySlots
    );

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 transition-colors duration-300">
        {unitPicker}
        {primaryColor && (
          <style>{`
            :root {
              --brand-primary: ${primaryColor};
            }
            .bg-indigo-600 {
              background-color: var(--brand-primary) !important;
            }
            .text-indigo-600 {
              color: var(--brand-primary) !important;
            }
            .border-indigo-600 {
              border-color: var(--brand-primary) !important;
            }
            .bg-indigo-50 {
              background-color: var(--brand-primary)15 !important;
            }
            .text-indigo-500 {
              color: var(--brand-primary) !important;
            }
            .bg-indigo-500 {
              background-color: var(--brand-primary) !important;
            }
            .bg-indigo-50\\/50 {
              background-color: var(--brand-primary)10 !important;
            }
            .focus\\:ring-indigo-500:focus {
              --tw-ring-color: var(--brand-primary) !important;
            }
            .hover\\:bg-indigo-700:hover {
              filter: brightness(0.9) !important;
            }
          `}</style>
        )}
        <div className="max-w-5xl mx-auto">
          
          {/* BARRA DE LOGIN DO CLIENTE */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 px-6 py-3.5 rounded-2xl border border-gray-150/60 dark:border-slate-700/60 shadow-sm mb-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></span>
              <span className="text-xs font-extrabold text-gray-500 dark:text-slate-400">
                {currentUser ? `Cliente: ${currentUser.name}` : 'Acesso de Visitante'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all cursor-pointer border-none flex items-center justify-center"
                title="Mudar Tema"
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {currentUser ? (
                <button 
                  onClick={handleLogout}
                  className="text-xs font-black uppercase tracking-wider text-red-500 hover:text-red-650 dark:text-red-400 dark:hover:text-red-300 transition-all cursor-pointer border-none bg-transparent"
                >
                  Sair
                </button>
              ) : (
                <Link 
                  to={isCustomDomain ? `/login` : `/app/${salonSlug}/login`}
                  className="text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-all"
                >
                  Entrar / Cadastrar
                </Link>
              )}
            </div>
          </div>

          {/* HEADER DO ESTABELECIMENTO */}
          <header className="flex flex-col items-center justify-center text-center mb-8 pb-6 border-b border-gray-200 dark:border-slate-800">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-20 h-20 object-cover rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none mb-4 hover:scale-105 transition-all duration-300" />
            ) : (
              <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl text-white shadow-xl shadow-indigo-500/20 mb-4 hover:scale-105 transition-all duration-300">
                <Scissors size={32} />
              </div>
            )}
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-md mb-2">
              {brandName ? brandName.toUpperCase() : 'STYLEFLOW'} • AGENDA ONLINE
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white transition-colors">
              {salon.name}
            </h1>
            <p className="text-sm text-gray-550 dark:text-slate-400 mt-2">
              Escolha seu serviço, profissional e reserve seu horário em poucos cliques.
            </p>
          </header>

          {currentUser ? (
            /* WIZARD DE AGENDAMENTO COMERCIAL (LOGADO) */
            bookingSuccess ? (
              /* CARD DE AGENDAMENTO CONFIRMADO */
              <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center shadow-xl animate-fade-in">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-500/10">
                  <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Reserva Confirmada!</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  Seu horário foi agendado com sucesso no StyleFlow.
                </p>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl text-left border border-gray-150 dark:border-slate-700/60 mb-6 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider">Serviço</span>
                    <span className="text-gray-800 dark:text-slate-200">{bookingSuccess.service.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider">Profissional</span>
                    <span className="text-gray-800 dark:text-slate-200">{bookingSuccess.professional.user.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider">Data</span>
                    <span className="text-gray-800 dark:text-slate-200">{new Date(bookingSuccess.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider">Horário</span>
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm">{bookingSuccess.time}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold border-t border-gray-200 dark:border-slate-700 pt-3">
                    <span className="text-gray-400 dark:text-slate-500 uppercase tracking-wider">Valor</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">R$ {bookingSuccess.service.price.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setBookingSuccess(null)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border-none cursor-pointer"
                >
                  Novo Agendamento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                {/* COLUNA ESQUERDA - FORMULÁRIO */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* SELEÇÃO DE SERVIÇO */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-150/60 dark:border-slate-700/60 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md flex items-center justify-center font-bold text-xs">1</span>
                      Selecione o Serviço
                    </h3>
                    {loadingBookingData ? (
                      <div className="py-8 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div></div>
                    ) : services.length === 0 ? (
                      <p className="text-sm text-gray-550 dark:text-slate-400 font-medium italic">Nenhum serviço disponível no catálogo no momento.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {services.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => { setSelectedService(s); setSelectedTime(''); }}
                            className={`p-4 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                              selectedService?.id === s.id
                                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                                : 'border-gray-200 dark:border-slate-700 bg-transparent hover:border-indigo-300 dark:hover:border-indigo-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">{s.name}</h4>
                                {selectedService?.id === s.id && (
                                  <span className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                                    <Check size={10} strokeWidth={3} />
                                  </span>
                                )}
                              </div>
                              {s.description && (
                                <p className="text-[11px] text-gray-550 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">{s.description}</p>
                              )}
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/60 text-xs font-bold">
                              <span className="text-gray-400 dark:text-slate-550 flex items-center gap-1">
                                <Clock size={12} className="text-indigo-500" />
                                {s.duration} min
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400">R$ {s.price.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SELEÇÃO DE PROFISSIONAL */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-150/60 dark:border-slate-700/60 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md flex items-center justify-center font-bold text-xs">2</span>
                      Selecione o Profissional
                    </h3>
                    {loadingBookingData ? (
                      <div className="py-8 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div></div>
                    ) : professionals.length === 0 ? (
                      <p className="text-sm text-gray-550 dark:text-slate-400 font-medium italic">Nenhum profissional disponível no momento.</p>
                    ) : (
                      <div className="space-y-3">
                        <select
                          value={selectedProfessional?.id ?? ''}
                          onChange={(e) => {
                            const pro = professionals.find((p) => p.id === e.target.value) ?? null;
                            setSelectedProfessional(pro);
                            setSelectedTime('');
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-semibold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
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
                            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-950/30 text-xs text-indigo-700 dark:text-indigo-300 font-bold">
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
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-150/60 dark:border-slate-700/60 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md flex items-center justify-center font-bold text-xs">3</span>
                      Data e Horário
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1.5">Escolha a Data</label>
                        <input
                          type="date"
                          min={todayStr}
                          value={selectedDate}
                          onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                          disabled={!selectedProfessional}
                          className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                        />
                        {!selectedProfessional && (
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-1.5">Selecione o profissional primeiro para ativar o calendário.</p>
                        )}
                      </div>

                      {selectedProfessional && selectedDate && (
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">Horários Disponíveis</label>
                          {loadingSlots ? (
                            <div className="py-6 flex justify-center"><div className="w-6 h-6 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div></div>
                          ) : timeSlots.length === 0 ? (
                            <p className="text-sm text-gray-550 dark:text-slate-400 italic">Fora do horário de expediente deste profissional.</p>
                          ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                              {timeSlots.map((slot: any) => (
                                <button
                                  key={slot.time}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all border ${
                                    !slot.available
                                      ? 'bg-gray-100 dark:bg-slate-900 border-gray-200 dark:border-slate-850 text-gray-400 dark:text-slate-600 cursor-not-allowed line-through'
                                      : selectedTime === slot.time
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-500/25 scale-105 active:scale-95'
                                      : 'bg-white dark:bg-slate-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-900/60 active:scale-95'
                                  }`}
                                >
                                  {slot.time}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* COLUNA DIREITA - RESUMO E CONFIRMAÇÃO */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-150/60 dark:border-slate-700/60 shadow-md sticky top-6">
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-slate-700/60">
                      Resumo da Reserva
                    </h3>
                    
                    {bookingError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-bold mb-4 leading-relaxed">
                        {bookingError}
                      </div>
                    )}

                    <div className="space-y-4 text-xs font-bold mb-6">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-gray-400 dark:text-slate-550 uppercase tracking-wider shrink-0">Serviço</span>
                        <span className="text-gray-800 dark:text-slate-200 text-right">{displayService ? displayService.name : 'Não selecionado'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-gray-400 dark:text-slate-550 uppercase tracking-wider shrink-0">Duração</span>
                        <span className="text-gray-800 dark:text-slate-200 text-right">{displayService ? `${displayService.duration} min` : '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-gray-400 dark:text-slate-550 uppercase tracking-wider shrink-0">Profissional</span>
                        <span className="text-gray-800 dark:text-slate-200 text-right">{selectedProfessional ? selectedProfessional.user.name : 'Não selecionado'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-gray-400 dark:text-slate-550 uppercase tracking-wider shrink-0">Data</span>
                        <span className="text-gray-800 dark:text-slate-200 text-right">
                          {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não selecionada'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-gray-400 dark:text-slate-550 uppercase tracking-wider shrink-0">Horário</span>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black">{selectedTime || 'Não selecionado'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-4 border-t border-gray-100 dark:border-slate-700/60 pt-4 text-sm">
                        <span className="text-gray-900 dark:text-white uppercase tracking-wider">Total</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black text-lg">
                          R$ {displayService ? displayService.price.toFixed(2) : '0,00'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleSchedule}
                      disabled={bookingLoading || !selectedService || !selectedProfessional || !selectedDate || !selectedTime}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none flex items-center justify-center gap-2 border-none cursor-pointer"
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
                </div>
              </div>
            )
          ) : (
            /* CARD DE LOGIN (VISITANTE) */
            <div className="max-w-md mx-auto">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-150/60 dark:border-slate-700/60 text-center shadow-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all duration-300">
                  <Calendar size={32} />
                </div>
                
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-md mb-3 inline-block">
                  AGENDA ONLINE
                </span>

                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{salon.name}</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  Este estabelecimento atende exclusivamente através de agendamento de horário tradicional (Agenda Comercial).
                </p>

                <Link 
                  to={`/app/${salonSlug}/login`}
                  className="w-full inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 active:scale-95 mb-4"
                >
                  Fazer meu Agendamento
                </Link>

                {(salon.phone || salon.instagramUrl) && (
                  <div className="border-t border-gray-100 dark:border-slate-700/60 pt-6 mt-6">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
                      Outras formas de contato:
                    </p>
                    <div className="flex flex-col gap-2">
                      {salon.phone && (
                        <a 
                          href={`https://wa.me/55${salon.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-sm"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.793 1.457 5.485.002 9.95-4.461 9.953-9.946.002-2.657-1.032-5.155-2.906-7.03C16.615 1.76 14.12 .727 11.46.727 5.973.727 1.507 5.19 1.504 10.677c0 1.682.449 3.322 1.302 4.773L1.879 21.05l5.768-1.512-.1 1.616z" />
                          </svg>
                          <span>Reservar pelo WhatsApp</span>
                        </a>
                      )}
                      {salon.instagramUrl && (
                        <a 
                          href={formatInstagramUrl(salon.instagramUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition-all duration-300"
                        >
                          <Instagram size={14} />
                          <span>Visitar Instagram</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 transition-colors duration-300">
      {unitPicker}
      {primaryColor && (
        <style>{`
          :root {
            --brand-primary: ${primaryColor};
          }
          .bg-indigo-600 {
            background-color: var(--brand-primary) !important;
          }
          .text-indigo-600 {
            color: var(--brand-primary) !important;
          }
          .border-indigo-600 {
            border-color: var(--brand-primary) !important;
          }
          .bg-indigo-50 {
            background-color: var(--brand-primary)15 !important;
          }
          .text-indigo-500 {
            color: var(--brand-primary) !important;
          }
          .bg-indigo-5050 {
            background-color: var(--brand-primary)10 !important;
          }
          .bg-indigo-50\\/50 {
            background-color: var(--brand-primary)10 !important;
          }
          .bg-indigo-500 {
            background-color: var(--brand-primary) !important;
          }
          .focus\\:ring-indigo-500:focus {
            --tw-ring-color: var(--brand-primary) !important;
          }
          .hover\\:bg-indigo-700:hover {
            filter: brightness(0.9) !important;
          }
        `}</style>
      )}
      <div className="max-w-4xl mx-auto">
        
        {/* BARRA DE LOGIN DO CLIENTE */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 px-6 py-3.5 rounded-2xl border border-gray-150/60 dark:border-slate-700 shadow-sm mb-6 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></span>
            <span className="text-xs font-extrabold text-gray-500 dark:text-slate-400">
              {currentUser ? `Cliente: ${currentUser.name}` : 'Acesso de Visitante'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all cursor-pointer border-none flex items-center justify-center"
              title="Mudar Tema"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {currentUser ? (
              <button 
                onClick={handleLogout}
                className="text-xs font-black uppercase tracking-wider text-red-500 hover:text-red-650 dark:text-red-400 dark:hover:text-red-300 transition-all cursor-pointer border-none bg-transparent"
              >
                Sair
              </button>
            ) : (
              <Link 
                to={isCustomDomain ? `/login` : `/app/${salonSlug}/login`}
                className="text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-all"
              >
                Entrar / Cadastrar
              </Link>
            )}
          </div>
        </div>

        {/* HEADER */}
        <header className="flex flex-col items-center justify-center text-center mb-10 pb-6 border-b border-gray-200 dark:border-slate-800">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="w-20 h-20 object-cover rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none mb-4 hover:scale-105 transition-all duration-300" />
          ) : (
            <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl text-white shadow-xl shadow-indigo-500/20 mb-4 hover:scale-105 hover:rotate-6 transition-all duration-300">
              <Scissors size={32} />
            </div>
          )}
          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-md mb-2">
            {brandName ? brandName.toUpperCase() : 'STYLEFLOW'} • FILA DINÂMICA
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white transition-colors">
            {salon.name}
          </h1>
          <p className="text-sm text-gray-555 dark:text-slate-400 mt-2">
            Acompanhe a fila de hoje em tempo real. Os tempos são estimados de forma inteligente.
          </p>

          {(salon.phone || salon.instagramUrl) && (
            <div className="flex items-center justify-center gap-3 mt-5 flex-wrap animate-fade-in">
              {salon.phone && (
                <a 
                  href={`https://wa.me/55${salon.phone.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-extrabold transition-all duration-300 shadow-sm shadow-emerald-500/30 hover:scale-105 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.793 1.457 5.485.002 9.95-4.461 9.953-9.946.002-2.657-1.032-5.155-2.906-7.03C16.615 1.76 14.12 .727 11.46.727 5.973.727 1.507 5.19 1.504 10.677c0 1.682.449 3.322 1.302 4.773L1.879 21.05l5.768-1.512-.1 1.616z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
              )}
              {salon.instagramUrl && (
                <a 
                  href={formatInstagramUrl(salon.instagramUrl)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white rounded-full text-xs font-extrabold transition-all duration-300 shadow-sm shadow-pink-500/30 hover:scale-105 active:scale-95"
                >
                  <Instagram size={14} />
                  <span>Instagram</span>
                </a>
              )}
            </div>
          )}
        </header>

        {/* LISTA DE FILAS POR PROFISSIONAL */}
        <div className="space-y-8">
          {queues.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center border border-gray-150 dark:border-slate-700 shadow-sm">
              <Users size={40} className="text-gray-450 dark:text-slate-550 mx-auto mb-4" />
              <h3 className="font-bold text-gray-950 dark:text-white">Nenhuma fila aberta hoje</h3>
              <p className="text-sm text-gray-550 dark:text-slate-400 mt-1">
                Os barbeiros ainda não iniciaram os atendimentos por fila hoje.
              </p>
            </div>
          ) : (
            queues.map((q: any) => {
              const inProgressEntry = q.entries.find((e: any) => e.status === 'IN_PROGRESS');
              const waitingEntries = q.entries.filter((e: any) => e.status === 'WAITING');
              const userEntry = currentUser ? q.entries.find((e: any) => e.userId === currentUser.id && ['IN_PROGRESS', 'WAITING'].includes(e.status)) : null;

              const totalWaitMinutes = computeQueueWaitMinutes({
                waitingEntries,
                inProgressEntry,
                queueServices: q.services,
                userEntry,
              });

              return (
                <div key={q.sessionId} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
                  {/* CABEÇALHO DO PROFISSIONAL */}
                  <div className="p-6 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{q.professionalName}</h2>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-slate-400 font-medium">
                        <Users size={14} className="text-indigo-500" />
                        <span>{waitingEntries.length} {waitingEntries.length === 1 ? 'cliente aguardando' : 'clientes aguardando'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      <div className="px-4 py-2 bg-white dark:bg-slate-700 rounded-xl border border-gray-200/60 dark:border-slate-600 flex items-center gap-2 text-xs font-bold text-gray-750 dark:text-slate-200">
                        <Clock size={14} className="text-indigo-500" />
                        <span>Espera estimada: ~{totalWaitMinutes} min</span>
                      </div>

                      {/* Botão de Entrar/Sair da Fila */}
                      {userEntry ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            userEntry.status === 'IN_PROGRESS' 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                              : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 animate-pulse'
                          }`}>
                            {userEntry.status === 'IN_PROGRESS' 
                              ? 'Sua Vez!' 
                              : `${waitingEntries.findIndex((e: any) => e.userId === currentUser.id) + 1}º da Fila`}
                          </span>
                          <button
                            onClick={() => handleLeaveQueue(q.sessionId)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-650 text-white rounded-xl text-xs font-extrabold transition-all duration-300 shadow-sm shadow-red-500/30 hover:scale-105 active:scale-95 cursor-pointer border-none"
                          >
                            Sair da Fila
                          </button>
                        </div>
                      ) : (
                        currentUser ? (
                          <button
                            onClick={() => {
                              setActiveQueueSession(q);
                              setIsJoinModalOpen(true);
                              setJoinQueueError(null);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 cursor-pointer border-none"
                          >
                            Entrar na Fila
                          </button>
                        ) : (
                          <Link
                            to={isCustomDomain ? `/login` : `/app/${salonSlug}/login`}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 text-center flex items-center justify-center decoration-none no-underline"
                          >
                            Entrar na Fila
                          </Link>
                        )
                      )}
                    </div>
                  </div>

                  {/* ELEMENTOS DA FILA */}
                  <div className="p-6 space-y-6">
                    {/* CLIENTE ATUAL (EM PROGRESSO) */}
                    {inProgressEntry ? (
                      <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/10 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm tracking-wide shadow-md shadow-indigo-600/10">
                            ATUAL
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Atendimento em Andamento</span>
                            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg mt-0.5">
                              {inProgressEntry.customerName}
                              {currentUser && inProgressEntry.userId === currentUser.id && (
                                <span className="ml-2 px-2 py-0.5 text-[9px] bg-emerald-500 text-white rounded-md uppercase font-black tracking-wider">Você</span>
                              )}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-0.5">{inProgressEntry.serviceName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800/90 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                          <span className="text-xs font-bold text-gray-400 dark:text-slate-500">Cronômetro:</span>
                          <QueueActiveTimer entry={inProgressEntry} />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-center text-sm font-medium text-gray-500 dark:text-slate-400">
                        Nenhum atendimento ativo no momento.
                      </div>
                    )}

                    {/* LISTA DE ESPERA */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        Próximos na Fila
                      </h4>

                      {waitingEntries.length === 0 ? (
                        <p className="text-sm font-medium text-gray-550 dark:text-slate-400 italic pl-3">A fila está vazia. Seja o próximo!</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {waitingEntries.map((entry: any, index: number) => {
                            const estTime = new Date(entry.estimatedStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            const isMe = currentUser && entry.userId === currentUser.id;
                            return (
                              <div key={entry.id} className={`p-4 bg-white dark:bg-slate-800 border rounded-xl flex items-center justify-between hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-colors shadow-sm ${
                                isMe ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-100 dark:border-slate-700'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    isMe ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                                  }`}>
                                    {index + 1}º
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                      {entry.customerName}
                                      {isMe && (
                                        <span className="px-2 py-0.5 text-[9px] bg-indigo-600 text-white rounded-md uppercase font-black tracking-wider animate-pulse">Você</span>
                                      )}
                                    </h5>
                                    <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 mt-0.5">{entry.serviceName}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                    isMe 
                                      ? 'bg-indigo-600 text-white border-indigo-600' 
                                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
                                  }`}>
                                    Previsão: {estTime}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM METRICS */}
        <footer className="mt-16 text-center">
          <p className="text-xs text-gray-400 dark:text-slate-500">
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
