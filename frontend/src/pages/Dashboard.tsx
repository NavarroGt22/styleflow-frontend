import React, { useState, useEffect, useRef } from 'react';
import { Scissors, Clock, DollarSign, Plus, Edit2, Trash2, Search, CheckCircle2, Moon, Sun, X, LogOut, Store, Download, Lock, Package, ShoppingCart, AlertTriangle, Instagram, Play, Copy, ArrowUp, ArrowDown, AlertCircle, Calendar, Users, Sparkles, Cpu, Send, MessageSquare, Bot } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { secureFetch as fetch } from '../utils/api';

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

const formatNotificationMessage = (template: string, clientName: string, position: number, timeStr: string, salonName: string) => {
  if (!template) return '';
  return template
    .replace(/{cliente}/g, clientName)
    .replace(/{posicao}/g, String(position))
    .replace(/{tempo}/g, timeStr)
    .replace(/{estabelecimento}/g, salonName);
};

export function formatPhoneNumber(phone?: string) {
  if (!phone) return 'Sem telefone';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('55') && clean.length > 10) {
    clean = clean.slice(2);
  }
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

const parseInlineBoldAndCode = (text: string) => {
  if (!text) return '';
  const combinedRegex = /(\*\*.*?\*\*|`.*?`)/g;
  const splitted = text.split(combinedRegex);
  
  return splitted.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-100 dark:bg-slate-800 text-rose-500 dark:text-rose-400 px-1.5 py-0.5 rounded font-mono text-xs">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  
  return lines.map((line, idx) => {
    if (line.startsWith('#### ')) {
      return <h4 key={idx} className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white mt-5 mb-2.5 flex items-center gap-2">{parseInlineBoldAndCode(line.replace('#### ', ''))}</h4>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={idx} className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-6 mb-3 pb-1 border-b border-emerald-500/10 flex items-center gap-2">{parseInlineBoldAndCode(line.replace('### ', ''))}</h3>;
    }
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const cleanLine = line.replace(/^\s*[-*]\s+/, '');
      return (
        <ul key={idx} className="list-disc list-inside pl-4 text-gray-700 dark:text-slate-300 space-y-1 mb-1.5">
          <li className="text-sm sm:text-base">{parseInlineBoldAndCode(cleanLine)}</li>
        </ul>
      );
    }
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      return (
        <ol key={idx} className="list-decimal list-inside pl-4 text-gray-700 dark:text-slate-300 space-y-1 mb-1.5">
          <li className="text-sm sm:text-base">{parseInlineBoldAndCode(numMatch[2])}</li>
        </ol>
      );
    }
    if (line.trim() === '---') {
      return <hr key={idx} className="my-6 border-gray-200 dark:border-slate-800" />;
    }
    if (line.startsWith('> ')) {
      return (
        <blockquote key={idx} className="border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-r-xl my-4 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
          {parseInlineBoldAndCode(line.replace('> ', ''))}
        </blockquote>
      );
    }
    if (line.trim().startsWith('|')) {
      if (line.includes('---')) return null;
      const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
      return (
        <div key={idx} className="grid grid-cols-4 gap-2 bg-gray-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-xs sm:text-sm my-1.5 font-medium">
          {cells.map((cell, cIdx) => (
            <div key={cIdx} className={`${cIdx === 0 ? 'font-bold text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400 text-center'}`}>
              {parseInlineBoldAndCode(cell)}
            </div>
          ))}
        </div>
      );
    }
    if (line.trim() === '') return <div key={idx} className="h-2"></div>;
    return <p key={idx} className="text-gray-700 dark:text-slate-300 leading-relaxed mb-2.5 text-sm sm:text-base">{parseInlineBoldAndCode(line)}</p>;
  });
};

function ActiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const start = new Date(startTime).getTime();
    
    const update = () => {
      const diff = Date.now() - start;
      if (diff < 0) {
        setElapsed('00:00');
        return;
      }
      const totalSecs = Math.floor(diff / 1000);
      const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
      const secs = String(totalSecs % 60).padStart(2, '0');
      setElapsed(`${mins}:${secs}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="font-mono text-2xl font-bold tracking-wider text-indigo-600 dark:text-indigo-400 animate-pulse">{elapsed}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { salonSlug } = useParams();

  const localToday = React.useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('user');
      return stored && stored !== 'undefined' ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Erro ao fazer parse do usuário do sessionStorage:', e);
      return {};
    }
  });
  const [isOwner] = useState(user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN');
  const isProfessional = user?.role === 'PROFESSIONAL';

  const [activeTab, setActiveTab] = useState<'services' | 'agenda' | 'financials' | 'team' | 'settings' | 'estoque' | 'queue'>('services');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'expediente' | 'comissao' | 'fila'>('general');
  const [agendaFilter, setAgendaFilter] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>(() => {
    if (user?.role === 'PROFESSIONAL' && user?.professionalProfile) {
      return [{
        id: user.professionalProfile.id,
        name: user.name,
        user: { name: user.name }
      }];
    }
    return [];
  });

  // State for StyleFlow AI Advisor
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [typingAdvice, setTypingAdvice] = useState('');
  const typingTimerRef = useRef<any>(null);
  
  // Alterar Senha do Usuário Logado
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setChangePasswordError('Por favor, preencha todos os campos.');
      return;
    }
    if (newPassword.length < 8) {
      setChangePasswordError('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setChangePasswordLoading(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3333/api/v1/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setChangePasswordSuccess('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setTimeout(() => {
          setIsChangePasswordModalOpen(false);
          setChangePasswordSuccess(null);
        }, 2000);
      } else {
        setChangePasswordError(data.error || 'Erro ao alterar a senha.');
      }
    } catch (err) {
      console.error(err);
      setChangePasswordError('Erro de conexão ao tentar alterar a senha.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newProfessional, setNewProfessional] = useState({ name: '', email: '', phone: '', commissionRate: '50', workStart: '09:00', workEnd: '18:00', password: '' });
  
  // Edição de Profissionais
  const [editingProfessional, setEditingProfessional] = useState<any | null>(null);
  const [editProfessionalForm, setEditProfessionalForm] = useState({
    name: '',
    phone: '',
    commissionRate: '50',
    workStart: '09:00',
    workEnd: '18:00',
    password: ''
  });

  const [salon, setSalon] = useState<any>(() => {
    if (!salonSlug || salonSlug === 'novo') return user?.salons?.[0] || null;
    if (user?.role === 'PROFESSIONAL' && user?.professionalProfile?.salon?.slug === salonSlug) {
      return user.professionalProfile.salon;
    }
    return user?.salons?.find((s: any) => s.slug === salonSlug) || user?.salons?.[0] || null;
  });
  const activeQueueMode = user?.professionalProfile ? (user?.professionalProfile?.queueMode ?? false) : (salon?.queueMode ?? false);
  const [showCreateSalonModal, setShowCreateSalonModal] = useState(() => {
    return isOwner && (!user?.salons?.length || salonSlug === 'novo');
  });
  const [newSalon, setNewSalon] = useState({ name: '', slug: '', phone: '' });

  // Formulário do Salão (Abertura/Fechamento/Contato)
  const [salonForm, setSalonForm] = useState({
    name: salon?.name || '',
    phone: salon?.phone || '',
    address: salon?.address || '',
    openTime: salon?.openTime || '09:00',
    closeTime: salon?.closeTime || '18:00',
    productCommissionEnabled: salon?.productCommissionEnabled ?? false,
    productCommissionRate: String(salon?.productCommissionRate ?? '10'),
    instagramUrl: salon?.instagramUrl || '',
    queueMode: salon?.queueMode ?? false,
    queueAutoAdvance: salon?.queueAutoAdvance ?? false,
    queueAllowClientView: salon?.queueAllowClientView ?? false,
    queueNotifyClient: salon?.queueNotifyClient ?? false,
    queueNotifyAhead: salon?.queueNotifyAhead ?? 2,
    queueAllowSkip: salon?.queueAllowSkip ?? false,
    queueSkipTimeoutMin: salon?.queueSkipTimeoutMin ?? 15,
    whatsappTemplate: salon?.whatsappTemplate || 'Olá {cliente}, seu atendimento no {estabelecimento} está chegando! Você é o {posicao}º da fila com previsão para as {tempo}.',
    whatsappGatewayUrl: salon?.whatsappGatewayUrl || '',
    whatsappGatewayToken: salon?.whatsappGatewayToken || ''
  });

  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    if (salon && !isOwner) {
      if (activeQueueMode && activeTab === 'agenda') {
        setActiveTab('services');
      } else if (!activeQueueMode && activeTab === 'queue') {
        setActiveTab('services');
      }
    }
  }, [activeQueueMode, activeTab, isOwner, salon]);

  const [services, setServices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: '', duration: '', price: '', category: 'Cabelo' });
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para Agendamento (Visão Cliente)
  const [schedulingService, setSchedulingService] = useState<any>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointmentForm, setAppointmentForm] = useState({
    professionalId: '',
    date: '',
    time: ''
  });

  // Estados para Checkout (Finalizar Agendamento)
  const [checkoutApt, setCheckoutApt] = useState<any>(null);
  const [checkoutForm, setCheckoutForm] = useState({ paymentMethod: 'PIX', finalPrice: '' });

  // Estados para Bloqueio de Horário (Dono)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    professionalId: '',
    date: '',
    startTime: '',
    endTime: ''
  });

  // Estados para Ponto Eletrônico (Funcionário e Admin)
  const [timecard, setTimecard] = useState<any>(null);
  const [timecardLoading, setTimecardLoading] = useState(false);
  const [teamTimecards, setTeamTimecards] = useState<any[]>([]);
  const [selectedTimecardDate, setSelectedTimecardDate] = useState(localToday);
  const [timecardNotice, setTimecardNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Estados de Estoque e Venda de Produtos
  const [products, setProducts] = useState<any[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    stockQuantity: '0',
    minStockAlert: '5'
  });

  // Estado para Caixa Rápido (PDV)
  const [posForm, setPosForm] = useState({
    productId: '',
    quantity: '1',
    paymentMethod: 'PIX',
    professionalId: ''
  });

  // Estados de Fila Dinâmica (Queue System)
  const [queueSession, setQueueSession] = useState<any>(null);
  const [selectedQueueProfessionalId, setSelectedQueueProfessionalId] = useState<string>(() => {
    return user?.role === 'PROFESSIONAL' ? (user?.professionalProfile?.id || '') : '';
  });
  
  // Modais de Fila
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [skippingEntryId, setSkippingEntryId] = useState('');
  const [skipReason, setSkipReason] = useState('Cliente Ausente');
  
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderingEntryId, setReorderingEntryId] = useState('');
  const [reorderingNewPosition, setReorderingNewPosition] = useState<number>(1);
  const [reorderReason, setReorderReason] = useState('Ajuste de Prioridade');

  // Walk-in Client states
  const [isAddWalkInModalOpen, setIsAddWalkInModalOpen] = useState(false);
  const [newWalkInName, setNewWalkInName] = useState('');
  const [newWalkInPhone, setNewWalkInPhone] = useState('');
  const [newWalkInServiceId, setNewWalkInServiceId] = useState('');
  const [isWalkInLoading, setIsWalkInLoading] = useState(false);

  // Estado para Carrinho no Checkout de Agendamento
  const [checkoutCart, setCheckoutCart] = useState<Array<{ productId: string; name: string; price: number; quantity: number }>>([]);
  const [checkoutProdId, setCheckoutProdId] = useState('');
  const [checkoutProdQty, setCheckoutProdQty] = useState('1');

  const handleAddToCheckoutCart = () => {
    if (!checkoutProdId) return alert('Selecione um produto.');
    const prod = products.find(p => p.id === checkoutProdId);
    if (!prod) return;
    
    const qty = Number(checkoutProdQty);
    if (qty <= 0) return alert('A quantidade deve ser maior que zero.');
    if (prod.stockQuantity < qty) {
      return alert(`Estoque insuficiente! Apenas ${prod.stockQuantity} unidades disponíveis.`);
    }

    const existing = checkoutCart.find(item => item.productId === checkoutProdId);
    if (existing) {
      if (prod.stockQuantity < existing.quantity + qty) {
        return alert(`Estoque insuficiente! Apenas ${prod.stockQuantity} unidades disponíveis no total.`);
      }
      setCheckoutCart(checkoutCart.map(item => 
        item.productId === checkoutProdId 
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCheckoutCart([...checkoutCart, {
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: qty
      }]);
    }
    
    setCheckoutProdId('');
    setCheckoutProdQty('1');
  };

  const handleRemoveFromCheckoutCart = (productId: string) => {
    setCheckoutCart(checkoutCart.filter(item => item.productId !== productId));
  };

  const fetchProducts = () => {
    if (salon?.id) {
      const token = sessionStorage.getItem('token');
      fetch(`http://localhost:3333/api/v1/products/salon/${salon.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(err => console.error("Erro ao buscar produtos:", err));
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return;

    const token = sessionStorage.getItem('token');
    const price = Number(productForm.price.replace(',', '.'));
    const costPrice = productForm.costPrice ? Number(productForm.costPrice.replace(',', '.')) : null;
    const stockQuantity = Number(productForm.stockQuantity);
    const minStockAlert = Number(productForm.minStockAlert);

    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct 
      ? `http://localhost:3333/api/v1/products/${editingProduct.id}` 
      : 'http://localhost:3333/api/v1/products';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          price,
          costPrice,
          stockQuantity,
          minStockAlert,
          salonId: salon.id
        })
      });

      if (res.ok) {
        alert(editingProduct ? 'Produto atualizado!' : 'Produto cadastrado!');
        setIsProductModalOpen(false);
        setEditingProduct(null);
        setProductForm({ name: '', description: '', price: '', costPrice: '', stockQuantity: '0', minStockAlert: '5' });
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar produto');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar produto');
    }
  };

  const handleToggleProductActive = async (product: any) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isActive: !product.isActive })
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewProductClick = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: '',
      costPrice: '',
      stockQuantity: '0',
      minStockAlert: '5'
    });
    setIsProductModalOpen(true);
  };

  const handleEditProductClick = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: Number(product.price).toFixed(2).replace('.', ','),
      costPrice: product.costPrice ? Number(product.costPrice).toFixed(2).replace('.', ',') : '',
      stockQuantity: String(product.stockQuantity),
      minStockAlert: String(product.minStockAlert)
    });
    setIsProductModalOpen(true);
  };

  const handlePosSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posForm.productId) return alert('Selecione um produto para vender.');

    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3333/api/v1/products/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          salonId: salon.id,
          productId: posForm.productId,
          quantity: Number(posForm.quantity),
          paymentMethod: posForm.paymentMethod,
          professionalId: posForm.professionalId || null
        })
      });

      if (res.ok) {
        alert('Venda registrada com sucesso! 🛒');
        setPosForm({ productId: '', quantity: '1', paymentMethod: 'PIX', professionalId: '' });
        fetchFinancials();
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao processar venda.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor.');
    }
  };


  useEffect(() => {
    if (!sessionStorage.getItem('token') || !user || !user.role) {
      navigate('/login');
      return;
    }

    // Se estiver em /admin/novo e possuir salões, redireciona para o primeiro
    if (salonSlug === 'novo' && user.salons && user.salons.length > 0) {
      navigate(`/admin/${user.salons[0].slug}`);
      return;
    }

    // Se o slug não estiver na URL, redireciona para o salão dele ou novo
    if (!salonSlug) {
      const mySlug = user.professionalProfile?.salon?.slug || user.salons?.[0]?.slug;
      if (mySlug) {
        navigate(`/admin/${mySlug}`);
      } else {
        navigate('/admin/novo');
      }
      return;
    }

    // Tenant authorization check
    if (user.role !== 'SUPER_ADMIN' && salonSlug !== 'novo') {
      const mySalons = user.salons || [];
      const hasAccess = mySalons.some((s: any) => s.slug === salonSlug) || 
                        (user.role === 'PROFESSIONAL' && user.professionalProfile?.salon?.slug === salonSlug);
      
      if (!hasAccess) {
        const fallbackSlug = user.professionalProfile?.salon?.slug || mySalons[0]?.slug;
        if (fallbackSlug) {
          navigate(`/admin/${fallbackSlug}`);
        } else {
          navigate('/admin/novo');
        }
      }
    }
  }, [navigate, user, salonSlug]);

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

  // Busca os serviços reais da API
  useEffect(() => {
    if (salon?.id) {
      fetch(`http://localhost:3333/api/v1/services/${salon.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setServices(data);
        })
        .catch(err => console.error("Erro ao buscar serviços:", err));
    } else if (!isOwner) {
      // Se for cliente, busca o primeiro salão público disponível para podermos testar
      fetch('http://localhost:3333/api/v1/establishments/public')
        .then(res => res.json())
        .then(salons => {
          if (salons && salons.length > 0) {
            const firstSalon = salons[0];
            setSalon(firstSalon); // Configura o salão no estado para ser usado no Agendamento
            return fetch(`http://localhost:3333/api/v1/services/${firstSalon.id}`);
          }
          return null;
        })
        .then(res => res ? res.json() : null)
        .then(data => {
          if (data && Array.isArray(data)) setServices(data);
        })
        .catch(err => console.error("Erro ao buscar vitrine:", err));
    }
  }, [isOwner, salon?.id]);

  // Busca os Agendamentos
  const fetchAppointments = () => {
    if (isOwner && salon?.id) {
      const token = sessionStorage.getItem('token');
      fetch(`http://localhost:3333/api/v1/appointments/salon/${salon.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAppointments(data);
      })
      .catch(err => console.error("Erro ao buscar agenda:", err));
    }
  };

  useEffect(() => {
    if (activeTab === 'agenda') {
      fetchAppointments();
    }
  }, [salon, activeTab, isOwner]);

  // Busca o Financeiro quando a aba for 'financials'
  const fetchFinancials = () => {
    if (isOwner && salon?.id && activeTab === 'financials') {
      const token = sessionStorage.getItem('token');
      fetch(`http://localhost:3333/api/v1/financials/salon/${salon.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error("Erro na API");
        return res.json();
      })
      .then(data => setFinancials(data))
      .catch(err => {
        console.error("Erro ao buscar financeiro:", err);
        setFinancials('error'); // Mostra mensagem de erro
      });
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [salon, activeTab, isOwner]);

  const fetchAiAdvice = (promptType: string, userMessage?: string) => {
    if (!isOwner || !salon?.id) return;
    setAiLoading(true);
    setAiAdvice(null);
    setTypingAdvice('');
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    const token = sessionStorage.getItem('token');
    fetch(`http://localhost:3333/api/v1/financials/salon/${salon.id}/ai-advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ promptType, userMessage })
    })
    .then(res => {
      if (res.status === 402) {
        throw new Error("LOCKED");
      }
      if (!res.ok) throw new Error("Erro ao buscar conselho da IA");
      return res.json();
    })
    .then(data => {
      if (data && data.advice) {
        setAiAdvice(data.advice);
      } else {
        setAiAdvice('Desculpe, não conseguimos processar o conselho da IA agora.');
      }
    })
    .catch(err => {
      console.error("Erro na IA Financeira:", err);
      if (err.message === "LOCKED") {
        setFinancials((prev: any) => prev ? { ...prev, aiAdvisorLocked: true } : { aiAdvisorLocked: true });
      } else {
        setAiAdvice('Desculpe, o assistente StyleFlow está indisponível no momento. Certifique-se de que o servidor backend está ativo.');
      }
    })
    .finally(() => {
      setAiLoading(false);
    });
  };

  // Efeito de Digitação Progressiva (Typing Emulator)
  useEffect(() => {
    if (aiAdvice) {
      let index = 0;
      setTypingAdvice('');
      
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      
      typingTimerRef.current = setInterval(() => {
        setTypingAdvice(prev => {
          if (index < aiAdvice.length) {
            const nextChar = aiAdvice.charAt(index);
            index++;
            return prev + nextChar;
          } else {
            if (typingTimerRef.current) clearInterval(typingTimerRef.current);
            return prev;
          }
        });
      }, 5); // 5ms por caractere para uma velocidade premium e rápida
    }
    
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [aiAdvice]);

  useEffect(() => {
    if (isOwner && salon?.id && (activeTab === 'estoque' || activeTab === 'financials' || activeTab === 'agenda' || activeTab === 'queue')) {
      fetchProducts();
    }
  }, [salon, activeTab, isOwner]);

  // Busca as configurações completas do salão quando monta ou quando o salão ID é definido
  useEffect(() => {
    if (isOwner && salon?.id) {
      const token = sessionStorage.getItem('token');
      fetch(`http://localhost:3333/api/v1/establishments/${salon.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error("Erro ao buscar salão");
        return res.json();
      })
      .then(data => {
        if (data && data.id) {
          setSalon(data);
          const updatedUser = { ...user, salons: [data] };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      })
      .catch(err => console.error("Erro ao buscar detalhes do estabelecimento:", err));
    }
  }, [isOwner, salon?.id]);

  // Sincroniza formulário do salão quando o salão muda
  useEffect(() => {
    if (salon) {
      setSalonForm({
        name: salon.name || '',
        phone: salon.phone || '',
        address: salon.address || '',
        openTime: salon.openTime || '09:00',
        closeTime: salon.closeTime || '18:00',
        productCommissionEnabled: salon.productCommissionEnabled ?? false,
        productCommissionRate: String(salon.productCommissionRate ?? '10'),
        instagramUrl: salon.instagramUrl || '',
        queueMode: salon.queueMode ?? false,
        queueAutoAdvance: salon.queueAutoAdvance ?? false,
        queueAllowClientView: salon.queueAllowClientView ?? false,
        queueNotifyClient: salon.queueNotifyClient ?? false,
        queueNotifyAhead: salon.queueNotifyAhead ?? 2,
        queueAllowSkip: salon.queueAllowSkip ?? false,
        queueSkipTimeoutMin: salon.queueSkipTimeoutMin ?? 15,
        whatsappTemplate: salon.whatsappTemplate || 'Olá {cliente}, seu atendimento no {estabelecimento} está chegando! Você é o {posicao}º da fila com previsão para as {tempo}.',
        whatsappGatewayUrl: salon.whatsappGatewayUrl || '',
        whatsappGatewayToken: salon.whatsappGatewayToken || ''
      });
    }
  }, [salon]);



  // Busca a equipe
  const fetchTeamMembers = () => {
    if (isOwner && salon?.id) {
      fetch(`http://localhost:3333/api/v1/professionals/${salon.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeamMembers(data);
      })
      .catch(err => console.error("Erro ao buscar equipe:", err));
    }
  };

  // Busca a equipe quando a aba for 'team', 'financials' ou 'queue'
  useEffect(() => {
    if (activeTab === 'team' || activeTab === 'financials' || activeTab === 'queue') {
      fetchTeamMembers();
    }
  }, [salon, activeTab, isOwner]);

  // --- CONTROLES DE FILA DINÂMICA (DASHBOARD QUEUE CONTROLS) ---
  const fetchQueueSession = async (professionalId: string) => {
    if (!professionalId || !salon?.id) return;
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/queue/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          professionalId,
          date: localToday
        })
      });
      if (res.ok) {
        const data = await res.json();
        setQueueSession(data);
      } else {
        setQueueSession(null);
      }
    } catch (err) {
      console.error("Erro ao carregar sessão de fila:", err);
    }
  };

  const handleStartNext = async () => {
    if (!queueSession?.id) return;
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/queue/${queueSession.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchQueueSession(selectedQueueProfessionalId);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao chamar próximo cliente.');
      }
    } catch (err) {
      console.error("Erro ao avançar fila:", err);
    }
  };

  const handleCompleteActive = async () => {
    if (!queueSession?.id) return;
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/queue/${queueSession.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchQueueSession(selectedQueueProfessionalId);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao concluir atendimento.');
      }
    } catch (err) {
      console.error("Erro ao concluir atendimento:", err);
    }
  };

  const handleSkipEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skippingEntryId) return;
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/queue/entries/${skippingEntryId}/skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: skipReason
        })
      });
      if (res.ok) {
        setIsSkipModalOpen(false);
        setSkippingEntryId('');
        fetchQueueSession(selectedQueueProfessionalId);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao registrar falta.');
      }
    } catch (err) {
      console.error("Erro ao pular cliente:", err);
    }
  };

  const handleAddWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueSession?.id) return;
    if (!newWalkInName.trim()) return alert('Por favor, informe o nome do cliente.');
    if (!newWalkInServiceId) return alert('Por favor, selecione um serviço.');

    setIsWalkInLoading(true);
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/queue/${queueSession.id}/walkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newWalkInName.trim(),
          phone: newWalkInPhone.trim() || undefined,
          serviceId: newWalkInServiceId
        })
      });
      if (res.ok) {
        setIsAddWalkInModalOpen(false);
        setNewWalkInName('');
        setNewWalkInPhone('');
        setNewWalkInServiceId('');
        fetchQueueSession(selectedQueueProfessionalId);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao adicionar cliente na fila.');
      }
    } catch (err) {
      console.error("Erro ao adicionar cliente presencial:", err);
      alert('Erro de conexão ao servidor.');
    } finally {
      setIsWalkInLoading(false);
    }
  };

  const handleReorderEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderingEntryId || !queueSession?.id) return;
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/queue/${queueSession.id}/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entryId: reorderingEntryId,
          newPosition: reorderingNewPosition,
          reason: reorderReason
        })
      });
      if (res.ok) {
        setIsReorderModalOpen(false);
        setReorderingEntryId('');
        fetchQueueSession(selectedQueueProfessionalId);
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao reordenar fila.');
      }
    } catch (err) {
      console.error("Erro ao reordenar:", err);
    }
  };

  // Efeito para sincronizar sessões quando aba fila for ativa
  useEffect(() => {
    if (activeTab === 'queue') {
      if (selectedQueueProfessionalId) {
        fetchQueueSession(selectedQueueProfessionalId);
      } else if (teamMembers.length > 0) {
        setSelectedQueueProfessionalId(teamMembers[0].id);
      }
    }
  }, [activeTab, selectedQueueProfessionalId, teamMembers]);

  // Efeito para WebSocket live subscription
  useEffect(() => {
    if (activeTab === 'queue' && salon?.id) {
      const ws = new WebSocket(`ws://localhost:3333/ws/queue?salonId=${salon.id}`);
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type || msg.event;
          if (type === 'QUEUE_UPDATED' || type === 'SESSION_OPENED') {
            if (selectedQueueProfessionalId) {
              fetchQueueSession(selectedQueueProfessionalId);
            }
          }
        } catch (err) {
          console.error("Erro ao receber atualização via WS:", err);
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [activeTab, salon?.id, selectedQueueProfessionalId]);

  // --- CONTROLE DE PONTO ELETRÔNICO ---
  const fetchTimecardStatus = () => {
    if (user?.role === 'PROFESSIONAL' || user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN') {
      const token = sessionStorage.getItem('token');
      fetch('http://localhost:3333/api/v1/timecards/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setTimecard(data);
      })
      .catch(err => console.error("Erro ao buscar ponto:", err));
    }
  };

  const fetchTeamTimecards = () => {
    if (isOwner && salon?.id) {
      const token = sessionStorage.getItem('token');
      fetch(`http://localhost:3333/api/v1/timecards/salon/${salon.id}?date=${selectedTimecardDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeamTimecards(data);
      })
      .catch(err => console.error("Erro ao buscar pontos do salão:", err));
    }
  };

  useEffect(() => {
    fetchTimecardStatus();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamTimecards();
      if (isOwner) {
        const interval = setInterval(fetchTeamTimecards, 10000);
        return () => clearInterval(interval);
      }
    }
  }, [salon, activeTab, selectedTimecardDate, isOwner]);

  const handleClockIn = async () => {
    const token = sessionStorage.getItem('token');
    setTimecardLoading(true);
    try {
      const res = await fetch('http://localhost:3333/api/v1/timecards/in', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setTimecardNotice({ message: data.message || "Entrada registrada com sucesso!", type: 'success' });
        setTimeout(() => setTimecardNotice(null), 4000);
        fetchTimecardStatus();
        if (isOwner) fetchTeamTimecards();
      } else {
        setTimecardNotice({ message: data.error || "Erro ao registrar entrada.", type: 'error' });
        setTimeout(() => setTimecardNotice(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setTimecardNotice({ message: "Erro ao conectar com o servidor.", type: 'error' });
      setTimeout(() => setTimecardNotice(null), 4000);
    } finally {
      setTimecardLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!window.confirm("Deseja bater a saída e finalizar o expediente de hoje?")) return;
    const token = sessionStorage.getItem('token');
    setTimecardLoading(true);
    try {
      const res = await fetch('http://localhost:3333/api/v1/timecards/out', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setTimecardNotice({ message: data.message || "Saída registrada com sucesso!", type: 'success' });
        setTimeout(() => setTimecardNotice(null), 4000);
        fetchTimecardStatus();
        if (isOwner) fetchTeamTimecards();
      } else {
        setTimecardNotice({ message: data.error || "Erro ao registrar saída.", type: 'error' });
        setTimeout(() => setTimecardNotice(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setTimecardNotice({ message: "Erro ao conectar com o servidor.", type: 'error' });
      setTimeout(() => setTimecardNotice(null), 4000);
    } finally {
      setTimecardLoading(false);
    }
  };

  const handleToggleQueueMode = async (newMode: boolean) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3333/api/v1/professionals/me/queue-mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ queueMode: newMode })
      });

      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...user };
        if (updatedUser.professionalProfile) {
          updatedUser.professionalProfile.queueMode = newMode;
        }
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        if (newMode) {
          setActiveTab('queue');
        } else {
          setActiveTab('agenda');
        }
      } else {
        alert(data.error || 'Erro ao alterar modelo de agenda.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao tentar alterar o modelo de agenda.');
    }
  };

  const exportTimecardCSV = () => {
    if (!teamTimecards.length) return alert("Nenhum ponto registrado para exportar nesta data!");
    
    // Gerando CSV com cabeçalho no padrão do Excel brasileiro
    let csvContent = "\uFEFF"; // BOM para acentuação correta no Excel brasileiro
    csvContent += "Nome do Funcionário;Data;Intervalos Batidos;Status;Horas Trabalhadas\n";
    
    teamTimecards.forEach(item => {
      const name = item.name;
      const date = selectedTimecardDate;
      let intervalsStr = "Ausente";
      let totalStr = "00:00";
      let status = "Ausente";

      const hasTimecards = item.timecards && item.timecards.length > 0;
      if (hasTimecards) {
        const isWorking = item.timecards.some((tc: any) => !tc.clockOut);
        status = isWorking ? "Trabalhando" : "Concluído";
        
        intervalsStr = item.timecards.map((tc: any) => {
          const tIn = new Date(tc.clockIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const tOut = tc.clockOut 
            ? new Date(tc.clockOut).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : 'Ativo';
          return `${tIn} - ${tOut}`;
        }).join(', ');

        let totalMs = 0;
        item.timecards.forEach((tc: any) => {
          const start = new Date(tc.clockIn).getTime();
          const end = tc.clockOut ? new Date(tc.clockOut).getTime() : new Date().getTime();
          totalMs += (end - start);
        });

        const diffHrs = Math.floor(totalMs / 3600000);
        const diffMins = Math.floor((totalMs % 3600000) / 60000);
        totalStr = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
      }
      
      csvContent += `"${name}";"${date}";"${intervalsStr}";"${status}";"${totalStr}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Folha_de_Ponto_${selectedTimecardDate.replace(/-/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteProfessional = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este profissional da equipe?")) return;
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/professionals/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        alert("Profissional removido com sucesso!");
        fetchTeamMembers();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao remover profissional.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao tentar remover profissional.");
    }
  };


  const handleCreateProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    
    try {
      const res = await fetch('http://localhost:3333/api/v1/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          salonId: salon.id,
          name: newProfessional.name,
          email: newProfessional.email,
          phone: newProfessional.phone,
          commissionRate: Number(newProfessional.commissionRate),
          workStart: newProfessional.workStart,
          workEnd: newProfessional.workEnd,
          password: newProfessional.password || undefined
        })
      });
      
      if (res.ok) {
        setIsTeamModalOpen(false);
        setNewProfessional({ name: '', email: '', phone: '', commissionRate: '50', workStart: '09:00', workEnd: '18:00', password: '' });
        fetchTeamMembers(); // Recarrega reativamente sem precisar trocar de aba
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao adicionar profissional');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditProfessionalClick = (member: any) => {
    setEditingProfessional(member);
    setEditProfessionalForm({
      name: member.user?.name || '',
      phone: member.user?.phone || '',
      commissionRate: String(member.commissionRate || '50'),
      workStart: member.workStart || '09:00',
      workEnd: member.workEnd || '18:00',
      password: ''
    });
  };

  const handleEditProfessionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfessional) return;
    
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/professionals/${editingProfessional.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: editProfessionalForm.name,
          phone: editProfessionalForm.phone,
          commissionRate: Number(editProfessionalForm.commissionRate),
          workStart: editProfessionalForm.workStart,
          workEnd: editProfessionalForm.workEnd,
          password: editProfessionalForm.password || undefined
        })
      });

      if (res.ok) {
        setEditingProfessional(null);
        fetchTeamMembers(); // Recarrega a equipe
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao atualizar profissional');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar profissional');
    }
  };

  const handleUpdateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon?.id) return;
    
    const token = sessionStorage.getItem('token');
    const cleanPhone = salonForm.phone.replace(/\D/g, '');
    
    try {
      const res = await fetch(`http://localhost:3333/api/v1/establishments/${salon.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: salonForm.name,
          phone: cleanPhone,
          address: salonForm.address,
          openTime: salonForm.openTime,
          closeTime: salonForm.closeTime,
          productCommissionEnabled: salonForm.productCommissionEnabled,
          productCommissionRate: Number(salonForm.productCommissionRate),
          instagramUrl: salonForm.instagramUrl || null,
          queueMode: salonForm.queueMode,
          queueAutoAdvance: salonForm.queueAutoAdvance,
          queueAllowClientView: salonForm.queueAllowClientView,
          queueNotifyClient: salonForm.queueNotifyClient,
          queueNotifyAhead: Number(salonForm.queueNotifyAhead),
          queueAllowSkip: salonForm.queueAllowSkip,
          queueSkipTimeoutMin: Number(salonForm.queueSkipTimeoutMin),
          whatsappTemplate: salonForm.whatsappTemplate,
          whatsappGatewayUrl: salonForm.whatsappGatewayUrl || null,
          whatsappGatewayToken: salonForm.whatsappGatewayToken || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedSalon = data.establishment;
        setSalon(updatedSalon);
        
        // Atualiza localStorage
        const updatedUser = { ...user, salons: [updatedSalon] };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        alert('Configurações do salão atualizadas com sucesso!');
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao atualizar configurações do salão');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar configurações do salão');
    }
  };

  const exportFinanceCSV = async () => {
    if (!financials || !salon) return;
    
    // 1. Gera o Excel Premium
    try {
      // Importações dinâmicas para não pegar o bundle inicial
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Fechamento de Caixa');

      // Configurando as colunas
      worksheet.columns = [
        { header: 'Data e Hora', key: 'date', width: 20 },
        { header: 'Descrição do Serviço', key: 'desc', width: 35 },
        { header: 'Profissional', key: 'prof', width: 25 },
        { header: 'Valor (R$)', key: 'val', width: 15 },
        { header: 'Método de Pagto', key: 'method', width: 20 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Comissão Recebida (R$)', key: 'commissionVal', width: 22 },
        { header: 'Beneficiário da Comissão', key: 'commissionReceiver', width: 25 }
      ];

      // Estilizando o cabeçalho (Verde escuro com texto branco e negrito)
      worksheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Adicionando os dados
      financials.recentRecords.forEach((r: any) => {
        let commissionVal = 0;
        let commissionReceiver = 'N/A';

        if (!r.isExpense) {
          if (r.appointment && r.appointment.professional) {
            const prof = r.appointment.professional;
            if (prof.userId !== salon.ownerId) {
              commissionVal = (r.amount * (prof.commissionRate ?? 0)) / 100;
              commissionReceiver = prof.user?.name || 'Profissional';
            } else {
              commissionVal = 0;
              commissionReceiver = 'Dono (Sem repasse)';
            }
          } else if (salon.productCommissionEnabled && r.productSale && r.productSale.professional) {
            const prof = r.productSale.professional;
            if (prof.userId !== salon.ownerId) {
              const rate = Number(salon.productCommissionRate) || 0;
              commissionVal = (r.amount * rate) / 100;
              commissionReceiver = prof.user?.name || 'Profissional';
            } else {
              commissionVal = 0;
              commissionReceiver = 'Dono (Sem repasse)';
            }
          } else {
            commissionReceiver = 'Nenhum';
          }
        }

        worksheet.addRow({
          date: new Date(r.createdAt).toLocaleString('pt-BR'),
          desc: r.description,
          prof: r.appointment?.professional?.user?.name || r.productSale?.professional?.user?.name || 'Sistema/Dono',
          val: r.amount,
          method: r.paymentMethod,
          type: r.isExpense ? 'Despesa' : 'Receita',
          commissionVal: commissionVal,
          commissionReceiver: commissionReceiver
        });
      });

      // Formatando as colunas de Valor e Comissão para Moeda (R$)
      worksheet.getColumn('val').numFmt = '"R$" #,##0.00';
      worksheet.getColumn('commissionVal').numFmt = '"R$" #,##0.00';

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Fechamento_Caixa_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
      
      saveAs(new Blob([buffer]), fileName);

    } catch (err) {
      console.error('Erro ao gerar Excel:', err);
      alert('Erro ao gerar o Excel. Verifique se as bibliotecas foram instaladas.');
      return;
    }

    // 2. Fecha o caixa no backend
    try {
      await fetch(`http://localhost:3333/api/v1/financials/salon/${salon.id}/close`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      });
      // 3. Atualiza a interface
      fetchFinancials();
    } catch (err) {
      console.error('Erro ao fechar o caixa:', err);
    }
  };

  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3333/api/v1/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setAppointments(appointments.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt));
      } else {
        const errData = await res.text();
        alert(`O SERVIDOR RESPONDEU ISSO: ` + errData);
      }
    } catch (err) {
      console.error(err);
      alert(`Falha no JS: ${err}`);
    }
  };

  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    
    const slug = newSalon.slug || newSalon.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cleanPhone = newSalon.phone.replace(/\D/g, ''); // Garante que só vão números
    
    try {
      const res = await fetch('http://localhost:3333/api/v1/establishments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          name: newSalon.name, 
          slug, 
          phone: cleanPhone, 
          email: user.email || `contato@${slug}.com` // Evita o undefined do LocalStorage
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSalon(data);
        setShowCreateSalonModal(false);
        const updatedUser = { ...user, salons: [data] };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        navigate(`/admin/${data.slug}`);
      } else {
        alert(data.error || 'Erro ao criar salão');
      }
    } catch (err) {
      console.error(err);
      alert('Erro na conexão com o servidor');
    }
  };

  const handleEdit = (service: any) => {
    setNewService({
      name: service.name,
      duration: service.duration.toString(),
      price: Number(service.price).toFixed(2).replace('.', ','),
      category: service.description || 'Cabelo'
    });
    setEditingId(service.id);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (service: any) => {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`http://localhost:3333/api/v1/services/${service.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ isActive: !service.isActive })
    });
    if (res.ok) {
      setServices(services.map(s => s.id === service.id ? { ...s, isActive: !service.isActive } : s));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja excluir este serviço?")) return;
    const token = sessionStorage.getItem('token');
    const res = await fetch(`http://localhost:3333/api/v1/services/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.price) return;

    const token = sessionStorage.getItem('token');
    const numericPrice = Number(newService.price.replace(',', '.'));
    const numericDuration = Number(newService.duration.replace(/\D/g, '')) || 30; 

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `http://localhost:3333/api/v1/services/${editingId}` : 'http://localhost:3333/api/v1/services';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: newService.name,
          description: newService.category,
          price: numericPrice,
          duration: numericDuration,
          salonId: salon.id
        })
      });
      
      if (res.ok) {
        const created = await res.json();
        if (editingId) {
          setServices(services.map(s => s.id === editingId ? created : s));
        } else {
          setServices([...services, created]);
        }
        setIsModalOpen(false);
        setEditingId(null);
        setNewService({ name: '', duration: '', price: '', category: 'Cabelo' });
      } else {
        const error = await res.json();
        alert(error.message || 'Erro ao salvar serviço');
      }
    } catch (err) {
      console.error(err);
      alert('Erro na conexão com o servidor');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const openScheduleModal = async (service: any) => {
    setSchedulingService(service);
    
    // Pré-preenche com a data atual e hora atual se estiver no modo fila
    let initialDate = '';
    let initialTime = '';
    if (salon?.queueMode) {
      initialDate = localToday;
      const now = new Date();
      initialTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    // Busca os profissionais do salão
    try {
      const res = await fetch(`http://localhost:3333/api/v1/professionals/${salon.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfessionals(data);
        if (data.length > 0) {
          setAppointmentForm({ 
            professionalId: data[0].id, 
            date: initialDate, 
            time: initialTime 
          });
        } else {
          setAppointmentForm({ 
            professionalId: '', 
            date: initialDate, 
            time: initialTime 
          });
        }
      }
    } catch (err) {
      console.error('Erro ao buscar profissionais:', err);
    }
  };
  
  const timeSlots = React.useMemo(() => {
    const selectedProf = professionals.find(p => p.id === appointmentForm.professionalId);
    if (!selectedProf || !schedulingService) return [];

    let slots = [];
    const [startHour, startMin] = selectedProf.workStart.split(':').map(Number);
    const [endHour, endMin] = selectedProf.workEnd.split(':').map(Number);

    let currentMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;
    const serviceDuration = schedulingService.duration;

    while (currentMins + serviceDuration <= endMins) {
      const hh = String(Math.floor(currentMins / 60)).padStart(2, '0');
      const mm = String(currentMins % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
      currentMins += 30;
    }

    // Se o dia selecionado for hoje, filtramos horários que já passaram
    if (appointmentForm.date === localToday) {
      const now = new Date();
      const currentMinsNow = now.getHours() * 60 + now.getMinutes();
      // Filtra os slots mantendo apenas aqueles com horário no futuro (com tolerância de 5 minutos)
      slots = slots.filter(slot => {
        const [h, m] = slot.split(':').map(Number);
        const slotMins = h * 60 + m;
        return slotMins >= currentMinsNow - 5;
      });
    }

    if (appointmentForm.time && !slots.includes(appointmentForm.time)) {
      slots.push(appointmentForm.time);
      slots.sort();
    }

    return slots;
  }, [appointmentForm.professionalId, professionals, schedulingService, appointmentForm.time, appointmentForm.date, localToday]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentForm.date || !appointmentForm.time || !appointmentForm.professionalId) {
      return alert("Preencha todos os campos!");
    }

    // Monta a data/hora inicial
    const startDateTime = new Date(`${appointmentForm.date}T${appointmentForm.time}:00`);
    
    // Calcula o fim com base na duração do serviço
    const endDateTime = new Date(startDateTime.getTime() + schedulingService.duration * 60000);

    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3333/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          salonId: salon.id,
          professionalId: appointmentForm.professionalId,
          serviceId: schedulingService.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString()
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Agendamento confirmado com sucesso! 🎉");
        setSchedulingService(null);
        setAppointmentForm({ professionalId: professionals[0]?.id || '', date: '', time: '' });
      } else {
        if (data.suggestion) {
          if (window.confirm(`${data.error}\n\n🤖 I.A.: Deseja alterar seu horário automaticamente para as ${data.suggestion}?`)) {
            setAppointmentForm({ ...appointmentForm, time: data.suggestion });
          }
        } else {
          alert(data.error || 'Erro ao agendar.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao tentar agendar.');
    }
  };

  const ensureProfessionalsLoaded = async () => {
    if (professionals.length > 0) return;
    try {
      const res = await fetch(`http://localhost:3333/api/v1/professionals/${salon.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfessionals(data);
        if (data.length > 0 && !blockForm.professionalId) {
          setBlockForm(prev => ({ ...prev, professionalId: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar profissionais:', err);
    }
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.date || !blockForm.startTime || !blockForm.endTime || !blockForm.professionalId) {
      return alert("Preencha todos os campos!");
    }

    const startDateTime = new Date(`${blockForm.date}T${blockForm.startTime}:00`);
    const endDateTime = new Date(`${blockForm.date}T${blockForm.endTime}:00`);

    if (endDateTime <= startDateTime) {
      return alert("O horário de término deve ser posterior ao horário de início!");
    }

    const token = sessionStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3333/api/v1/appointments/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          salonId: salon.id,
          professionalId: blockForm.professionalId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString()
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Horário bloqueado com sucesso! 🔒");
        setIsBlockModalOpen(false);
        setBlockForm({ professionalId: professionals[0]?.id || '', date: '', startTime: '', endTime: '' });
        fetchAppointments();
      } else {
        alert(data.error || 'Erro ao bloquear horário.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao tentar bloquear.');
    }
  };

  const submitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutApt) return;
    
    const token = sessionStorage.getItem('token');
    const numericPrice = Number(checkoutForm.finalPrice.toString().replace(',', '.'));

    try {
      const res = await fetch(`http://localhost:3333/api/v1/appointments/${checkoutApt.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          paymentMethod: checkoutForm.paymentMethod, 
          finalPrice: numericPrice,
          products: checkoutCart.map(item => ({ productId: item.productId, quantity: item.quantity }))
        })
      });
      if (res.ok) {
        setAppointments(appointments.map(apt => apt.id === checkoutApt.id ? { ...apt, status: 'COMPLETED' } : apt));
        alert('Pagamento registrado no caixa com sucesso!');
        setCheckoutApt(null);
        setCheckoutCart([]); // Limpa o carrinho de checkout
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao finalizar agendamento');
      }
    } catch (err) {
      console.error(err);
      alert('Erro na conexão com o servidor');
    }
  };

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto transition-colors duration-300">
      
      {/* HEADER */}
      <header className="flex justify-between items-end mb-10 border-b border-gray-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl text-white shadow-lg shadow-indigo-500/20 hover:scale-110 hover:rotate-12 transition-all duration-300">
              <Scissors size={26} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-md">SaaS</span>
                <span className="text-xs font-bold tracking-wider text-gray-400 dark:text-slate-500">STYLEFLOW</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white transition-colors leading-none mt-1">
                {salon?.name || 'Meu Salão'}
              </h1>
            </div>
          </div>
          <h2 className="text-lg font-medium text-gray-500 dark:text-slate-400 transition-colors mt-2">
            {isOwner ? 'Painel Administrativo' : 'Agendar Corte'}
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2 transition-colors flex items-center flex-wrap gap-2">
            Bem-vindo(a), <span className="font-semibold text-primary dark:text-blue-400">{user.name || 'Visitante'}</span>. 
            {salon && (
              <div className="inline-flex items-center gap-2 mt-1 sm:mt-0">
                {salon.phone && (
                  <a 
                    href={`https://wa.me/55${salon.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs font-bold transition-all duration-300 shadow-sm shadow-emerald-500/30 hover:scale-105"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white rounded-full text-xs font-bold transition-all duration-300 shadow-sm shadow-pink-500/30 hover:scale-105"
                  >
                    <Instagram size={14} />
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            )}
          </p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button 
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title="Alterar Senha"
          >
            <Lock size={20} />
          </button>

          <button onClick={handleLogout} className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2">
            <LogOut size={20} /> <span className="hidden sm:inline font-medium">Sair</span>
          </button>
        </div>
      </header>

      {/* WIDGET DE PONTO ELETRÔNICO */}
      {(user?.role === 'PROFESSIONAL' || user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN') && (
        <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Folha de Ponto Digital</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                  {(!timecard || timecard.status === 'NOT_STARTED') && "Seu expediente de hoje ainda não foi iniciado."}
                  {timecard && timecard.status === 'CLOCKED_IN' && `Trabalhando. Entrada registrada às ${new Date(timecard.timecard.clockIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`}
                  {timecard && timecard.status === 'CLOCKED_OUT' && "Turno concluído. Pronto para iniciar outro intervalo."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                disabled={timecardLoading || (timecard && timecard.status === 'CLOCKED_IN')}
                onClick={handleClockIn}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${
                  !timecard || timecard.status !== 'CLOCKED_IN'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95'
                    : 'bg-gray-100 text-gray-400 dark:bg-slate-700/50 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                Registrar Entrada
              </button>
              <button
                disabled={timecardLoading || !timecard || timecard.status !== 'CLOCKED_IN'}
                onClick={handleClockOut}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${
                  timecard && timecard.status === 'CLOCKED_IN'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20 active:scale-95'
                    : 'bg-gray-100 text-gray-400 dark:bg-slate-700/50 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                Registrar Saída
              </button>
            </div>
          </div>

          {timecardNotice && (
            <div className={`p-3.5 rounded-xl text-xs font-bold border animate-in slide-in-from-top-2 duration-200 flex items-center justify-between gap-3 ${
              timecardNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/30'
                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-rose-100 dark:border-rose-900/30'
            }`}>
              <span className="flex items-center gap-2">
                {timecardNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {timecardNotice.message}
              </span>
              <button onClick={() => setTimecardNotice(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={14} />
              </button>
            </div>
          )}

          {timecard?.timecards && timecard.timecards.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 w-full animate-in fade-in duration-500">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Histórico de Turnos Hoje
              </p>
              <div className="flex flex-wrap gap-2.5">
                {timecard.timecards.map((tc: any, index: number) => {
                  const inStr = new Date(tc.clockIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const outStr = tc.clockOut 
                    ? new Date(tc.clockOut).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : 'Em andamento';
                  const isActive = !tc.clockOut;
                  return (
                    <div 
                      key={tc.id || index}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        isActive 
                          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/20'
                          : 'bg-gray-50/50 dark:bg-slate-800/40 border-gray-200/60 dark:border-slate-700/50 text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-500 animate-ping' : 'bg-gray-400 dark:bg-slate-500'}`}></span>
                      <span className="font-semibold">Turno #{index + 1}:</span>
                      <span>{inStr} às {outStr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {user?.professionalProfile && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-500 rounded-lg">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Modelo de Agenda Individual</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Escolha como deseja que seus clientes realizem os agendamentos.
                  </p>
                </div>
              </div>
              <div className="inline-flex bg-gray-100 dark:bg-slate-700/50 p-1 rounded-xl gap-1 self-start sm:self-auto">
                <button
                  onClick={() => handleToggleQueueMode(false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !activeQueueMode
                      ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Hora Marcada (Fixa)
                </button>
                <button
                  onClick={() => handleToggleQueueMode(true)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeQueueMode
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                      : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Fila (Dinâmica)
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ABAS DO DONO */}
      {(isOwner || user?.role === 'PROFESSIONAL') && (
        <div className="flex gap-4 border-b border-gray-200 dark:border-slate-700 mb-8 mt-4 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('services')}
            className={`pb-3 whitespace-nowrap font-medium transition-colors border-b-2 ${activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Meus Serviços
          </button>
          {(!activeQueueMode || isOwner) && (
            <button 
              onClick={() => setActiveTab('agenda')}
              className={`pb-3 whitespace-nowrap font-medium transition-colors border-b-2 flex gap-2 items-center ${activeTab === 'agenda' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              Agenda
              {appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length > 0 && (
                <span className="bg-primary/10 text-primary text-xs py-0.5 px-2 rounded-full">
                  {appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length}
                </span>
              )}
            </button>
          )}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('financials')}
              className={`pb-3 whitespace-nowrap font-medium transition-colors border-b-2 flex gap-2 items-center ${activeTab === 'financials' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <DollarSign size={18} /> Financeiro
            </button>
          )}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('team')}
              className={`pb-3 whitespace-nowrap font-medium transition-colors border-b-2 flex gap-2 items-center ${activeTab === 'team' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              Equipe
            </button>
          )}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('estoque')}
              className={`pb-3 whitespace-nowrap font-medium transition-colors border-b-2 flex gap-2 items-center ${activeTab === 'estoque' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <Package size={18} /> Estoque
            </button>
          )}
          {(activeQueueMode || isOwner) && (
            <button 
              onClick={() => setActiveTab('queue')}
              className={`pb-3 whitespace-nowrap font-medium transition-colors border-b-2 flex gap-2 items-center ${activeTab === 'queue' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <Clock size={18} /> Fila Dinâmica
            </button>
          )}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('settings')}
              className={`pb-3 whitespace-nowrap font-medium transition-colors border-b-2 flex gap-2 items-center ${activeTab === 'settings' ? 'border-slate-500 text-slate-800 dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <Store size={18} /> Salão
            </button>
          )}
        </div>
      )}

      {activeTab === 'services' && (
        <>
          {/* CONTROLES DA BUSCA */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400 dark:text-slate-500" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar serviço por nome..." 
            className="w-full pl-10 pr-4 py-2 border border-surface-border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm text-gray-900 dark:text-white"
          />
        </div>
        {(isOwner || user?.role === 'PROFESSIONAL') && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary shadow-lg shadow-primary/30 flex-shrink-0">
            <Plus size={20} /> <span className="hidden sm:inline">Novo Serviço</span>
          </button>
        )}
      </div>

      {/* LISTAGEM DE SERVIÇOS REAIS DO BANCO */}
      {services.length === 0 && !showCreateSalonModal ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <Scissors size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhum serviço encontrado</h3>
          {(isOwner || user?.role === 'PROFESSIONAL') && <p className="text-gray-500 dark:text-slate-400">Clique no botão "Novo Serviço" ali em cima para começar a montar o seu catálogo.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="card group flex flex-col justify-between transition-colors">
              <div className="p-6">
                
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-primary-light dark:bg-slate-700 text-primary dark:text-blue-400 rounded-lg">
                    <Scissors size={24} />
                  </div>
                  {(isOwner || user?.role === 'PROFESSIONAL') ? (
                    <button 
                      onClick={() => handleToggleActive(service)}
                      title="Clique para ativar ou inativar"
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                        service.isActive 
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' 
                          : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <CheckCircle2 size={14} /> {service.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  ) : (
                    service.isActive && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={14} /> Disponível
                      </span>
                    )
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{service.name}</h3>
                <p className="text-sm font-medium text-primary dark:text-blue-400 mb-4">{service.description || 'Geral'}</p>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <div className="flex items-center text-gray-600 dark:text-slate-300">
                    <Clock size={16} className="mr-2 opacity-70" />
                    <span className="text-sm">Duração: {service.duration} min</span>
                  </div>
                  <div className="flex items-center text-gray-900 dark:text-white font-semibold">
                    <DollarSign size={16} className="mr-2 opacity-70 text-primary dark:text-blue-400" />
                    <span>R$ {Number(service.price).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800/50 border-t border-surface-border dark:border-slate-700 p-3 flex justify-end gap-2 transition-opacity">
                {(isOwner || user?.role === 'PROFESSIONAL') ? (
                  <>
                    <button onClick={() => handleEdit(service)} className="btn-ghost text-gray-600 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400">
                      <Edit2 size={16} /> <span className="text-sm">Editar</span>
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="btn-ghost text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => openScheduleModal(service)} className="btn-primary w-full text-sm py-1.5 shadow-none group-hover:shadow-md">
                    <Clock size={16} /> Agendar Agora
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* ABA DE AGENDA */}
      {activeTab === 'agenda' && (isOwner || user?.role === 'PROFESSIONAL') && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Agenda do Dia</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Acompanhe quem agendou horário com o seu salão.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await ensureProfessionalsLoaded();
                  setIsBlockModalOpen(true);
                }}
                className="btn-primary py-2 px-4 text-sm font-bold flex items-center gap-1.5"
              >
                <Plus size={16} /> Bloquear Horário
              </button>
              
              <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700">
                <button 
                  onClick={() => setAgendaFilter('PENDING')} 
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${agendaFilter === 'PENDING' ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  Pendentes
                </button>
                <button 
                  onClick={() => setAgendaFilter('COMPLETED')} 
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${agendaFilter === 'COMPLETED' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  Concluídos
                </button>
              </div>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl">
              <Clock className="mx-auto text-gray-300 dark:text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Agenda Livre</h3>
              <p className="text-gray-500 dark:text-slate-400">Ainda não há agendamentos para o seu salão.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300">
                    <th className="p-4">Data/Hora</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Serviço</th>
                    <th className="p-4">Profissional</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {appointments
                .filter(apt => agendaFilter === 'PENDING' ? (apt.status === 'PENDING' || apt.status === 'CONFIRMED' || apt.status === 'BLOCKED') : apt.status === agendaFilter)
                .map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {new Date(apt.startTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </div>
                        <div className="text-sm text-primary dark:text-blue-400 font-bold">
                          {new Date(apt.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-4">
                        {apt.status === 'BLOCKED' ? (
                          <div className="font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1.5 italic">
                            <Lock size={14} /> Horário Bloqueado (Administrativo)
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-gray-900 dark:text-white">{apt.customer?.user?.name || 'Cliente'}</div>
                            <div className="text-sm text-gray-500">{formatPhoneNumber(apt.customer?.user?.phone)}</div>
                          </>
                        )}
                      </td>
                      <td className="p-4">
                        {apt.status === 'BLOCKED' ? (
                          <div className="font-medium text-gray-500 dark:text-slate-400">-</div>
                        ) : (
                          <>
                            <div className="font-medium text-gray-900 dark:text-white">{apt.service?.name}</div>
                            <div className="text-sm text-gray-500">R$ {Number(apt.service?.price).toFixed(2).replace('.', ',')}</div>
                          </>
                        )}
                      </td>
                      <td className="p-4 text-gray-700 dark:text-slate-300">
                        {apt.professional?.user?.name || 'Não informado'}
                      </td>
                      <td className="p-4">
                        {apt.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                            <CheckCircle2 size={12} /> Concluído
                          </span>
                        )}
                        {apt.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                            <Clock size={12} /> Pendente
                          </span>
                        )}
                        {apt.status === 'CONFIRMED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                            <CheckCircle2 size={12} /> Confirmado
                          </span>
                        )}
                        {apt.status === 'BLOCKED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600">
                            <Lock size={12} /> Bloqueado
                          </span>
                        )}
                        {(apt.status === 'CANCELED_BY_SALON' || apt.status === 'CANCELED_BY_CUSTOMER') && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                            <X size={12} /> Cancelado
                          </span>
                        )}
                      </td>
                      <td className="p-4 flex gap-2 justify-end">
                        {apt.status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => updateAppointmentStatus(apt.id, 'CONFIRMED')}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button 
                              onClick={() => { if(window.confirm('Cancelar este agendamento?')) updateAppointmentStatus(apt.id, 'CANCELED_BY_SALON'); }}
                              className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                        {apt.status === 'CONFIRMED' && (
                          <button 
                            onClick={() => {
                              setCheckoutCart([]);
                              setCheckoutApt(apt);
                              setCheckoutForm({ 
                                paymentMethod: 'PIX', 
                                finalPrice: Number(apt.service?.price).toFixed(2).replace('.', ',') 
                              });
                            }}
                            className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                          >
                            Finalizar & Cobrar
                          </button>
                        )}
                        {apt.status === 'BLOCKED' && (
                          <button 
                            onClick={() => { if(window.confirm('Desbloquear este horário?')) updateAppointmentStatus(apt.id, 'CANCELED_BY_SALON'); }}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            Desbloquear
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA FINANCEIRA */}
      {activeTab === 'financials' && isOwner && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Fechamento de Caixa Diário</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Seus lucros de hoje. Ao fechar o salão, baixe o relatório (os dados resetam à meia-noite).</p>
            </div>
            <button 
              onClick={exportFinanceCSV} 
              className="group flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all duration-300 font-bold"
            >
              <Download size={18} className="group-hover:animate-bounce" /> 
              <span>Fechar Caixa & Baixar CSV</span>
            </button>
          </div>

          {financials === 'error' ? (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl text-center font-medium border border-red-200 dark:border-red-800">
              Ocorreu um erro de comunicação com o servidor. O backend precisa ser reiniciado para aplicar as mudanças do banco de dados.<br/>
              Dê um <kbd className="bg-red-100 dark:bg-red-900 px-2 rounded">Ctrl + C</kbd> no terminal do backend e rode <kbd className="bg-red-100 dark:bg-red-900 px-2 rounded">npm run dev</kbd> novamente.
            </div>
          ) : !financials ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Lado Esquerdo: Cards de Resumo e Lançamentos (2/3 da largura) */}
              <div className="lg:col-span-2 space-y-8">
                {/* CARDS DE RESUMO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={64} /></div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Faturamento Total</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {financials.totalRevenue.toFixed(2).replace('.', ',')}</p>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-500"><Scissors size={64} /></div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Comissões (A Pagar)</h3>
                    <p className="text-3xl font-bold text-rose-500">R$ {financials.totalCommissions.toFixed(2).replace('.', ',')}</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-emerald-500/20 shadow-lg relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><CheckCircle2 size={64} /></div>
                    <h3 className="text-sm font-medium text-emerald-100 mb-1">Lucro Líquido (Seu)</h3>
                    <p className="text-3xl font-bold">R$ {financials.netProfit.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>

                {/* HISTÓRICO DE CAIXA */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Últimos Lançamentos</h2>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {financials.recentRecords.length === 0 ? (
                          <tr><td className="p-8 text-center text-gray-500">Nenhum valor em caixa ainda. Conclua agendamentos para gerar receitas!</td></tr>
                        ) : (
                          financials.recentRecords.map((rec: any) => (
                            <tr key={rec.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-gray-900 dark:text-white">{rec.description}</div>
                                {rec.appointment?.professional?.user?.name && (
                                  <span className="block text-xs font-semibold text-primary mt-1">💇 Profissional: {rec.appointment.professional.user.name}</span>
                                )}
                                <div className="text-sm text-gray-500">{new Date(rec.createdAt).toLocaleString('pt-BR')}</div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400">+ R$ {Number(rec.amount).toFixed(2).replace('.', ',')}</div>
                                <div className="text-xs text-gray-400 font-medium">{rec.paymentMethod}</div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Lado Direito: Caixa Rápido (PDV - 1/3 da largura) */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Caixa Rápido (PDV)</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Venda expressa de balcão</p>
                  </div>
                </div>

                <form onSubmit={handlePosSale} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Produto</label>
                    <select
                      required
                      value={posForm.productId}
                      onChange={(e) => setPosForm({ ...posForm, productId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm animate-in fade-in duration-200"
                    >
                      <option value="">Selecione um produto</option>
                      {products.filter(p => p.isActive && p.stockQuantity > 0).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} - R$ {p.price.toFixed(2).replace('.', ',')} ({p.stockQuantity} unid.)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Vendedor / Barbeiro (Opcional)</label>
                    <select
                      value={posForm.professionalId}
                      onChange={(e) => setPosForm({ ...posForm, professionalId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    >
                      <option value="">Sem comissão / Salão</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.user?.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Quantidade</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={posForm.quantity}
                        onChange={(e) => setPosForm({ ...posForm, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Pagamento</label>
                      <select
                        required
                        value={posForm.paymentMethod}
                        onChange={(e) => setPosForm({ ...posForm, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      >
                        <option value="PIX">PIX</option>
                        <option value="CREDIT_CARD">Crédito</option>
                        <option value="DEBIT_CARD">Débito</option>
                        <option value="CASH">Dinheiro</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const selectedProd = products.find(p => p.id === posForm.productId);
                    const subtotal = selectedProd ? selectedProd.price * Number(posForm.quantity) : 0;
                    
                    return (
                      <div className="p-4 bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-gray-100 dark:border-slate-600 mt-4 text-sm space-y-1">
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>Preço unitário:</span>
                          <span>{selectedProd ? `R$ ${selectedProd.price.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}</span>
                        </div>
                        {selectedProd && selectedProd.stockQuantity <= selectedProd.minStockAlert && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 mt-1">
                            <AlertTriangle size={12} className="animate-pulse" />
                            <span>Estoque baixo! Restam apenas {selectedProd.stockQuantity}</span>
                          </div>
                        )}
                        <div className="h-px bg-gray-200 dark:bg-slate-600 my-2"></div>
                        <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base">
                          <span>Subtotal:</span>
                          <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm mt-2 flex items-center justify-center gap-2"
                  >
                    <span>Confirmar Venda Rápida</span>
                  </button>
                </form>
              </div>
            </div>

            {/* STYLEFLOW AI FINANCIAL ADVISOR - GLASSMORPHIC PREMIUM INTERFACE */}
            <div className="mt-12 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(16,185,129,0.06)] dark:shadow-[0_0_40px_rgba(16,185,129,0.12)] animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-100 dark:border-slate-800/80 pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                    <Sparkles size={26} className="text-emerald-500 animate-pulse" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">StyleFlow AI Advisor</h2>
                      <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-500/20 tracking-wider">Premium</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Gênio Financeiro da Beleza — Insights preditivos de caixa, equipe, ponto e giro de estoque.</p>
                  </div>
                </div>
                {financials?.aiAdvisorLocked !== false ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl font-bold">
                    <Lock size={14} />
                    <span>Módulo Desativado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold">
                    <Cpu size={14} className="animate-spin" />
                    <span>Conectado no Modo Inteligente</span>
                  </div>
                )}
              </div>

              {financials?.aiAdvisorLocked !== false ? (
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-50/50 via-emerald-50/5 to-slate-50/50 dark:from-slate-950/20 dark:via-emerald-950/5 dark:to-slate-950/20 backdrop-blur-md rounded-2xl border border-dashed border-emerald-500/30 p-8 flex flex-col items-center justify-center min-h-[350px] transition-all duration-300">
                  {/* Subtle background glows */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
                  
                  {/* Padlock Aura */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.15)] relative z-10 border border-emerald-500/30">
                      <Lock size={36} className="text-emerald-500 dark:text-emerald-450" />
                    </div>
                    <span className="absolute -inset-2 rounded-full border border-emerald-500/20 animate-ping opacity-75"></span>
                  </div>

                  {/* Heading */}
                  <div className="text-center max-w-lg mb-8">
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                      Desbloqueie o Gênio Financeiro do seu Salão
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      O módulo <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">StyleFlow AI Advisor</strong> analisa o seu faturamento real, despesas, comissões de profissionais e giro de estoque para gerar insights preditivos automáticos e campanhas de marketing sob demanda.
                    </p>
                  </div>

                  {/* Feature Badges Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl w-full mb-8">
                    <div className="flex items-start gap-3 p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-gray-150/65 dark:border-slate-800">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">
                        <ArrowUp size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">Prever Faturamento</h4>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Metas e projeções inteligentes de caixa para o próximo mês.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-gray-150/65 dark:border-slate-800">
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                        <ArrowDown size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">Reduzir Custos</h4>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Sugestões de comissões e despesas para otimizar lucros.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-gray-150/65 dark:border-slate-800">
                      <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0">
                        <Package size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">Campanha de Estoque</h4>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Ações imediatas para girar produtos e gerar receita rápida.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-gray-150/65 dark:border-slate-800">
                      <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg shrink-0">
                        <MessageSquare size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">Advisor Inteligente</h4>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Faça qualquer pergunta e tenha aconselhamento em tempo real.</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <a
                    href="https://wa.me/5511999999999?text=Olá!%20Gostaria%20de%20ativar%20o%20módulo%20de%20Inteligência%20Artificial%20StyleFlow%20AI%20Advisor%20no%20meu%20salão!"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/45 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all text-sm flex items-center gap-2"
                  >
                    <Sparkles size={16} className="animate-pulse" />
                    <span>Contratar Módulo IA Premium</span>
                  </a>
                </div>
              ) : (
                <>
                  {/* Botões de Ações Rápidas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
                    <button
                      onClick={() => fetchAiAdvice('forecast')}
                      disabled={aiLoading}
                      className="group flex items-center justify-between p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 hover:from-emerald-500/15 hover:to-emerald-600/10 dark:from-emerald-500/10 dark:to-emerald-500/2 hover:dark:from-emerald-500/15 hover:dark:to-emerald-500/5 text-emerald-700 dark:text-emerald-400 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/35 transition-all duration-300 text-left font-bold disabled:opacity-50"
                    >
                      <div className="space-y-1">
                        <div className="text-sm">Prever Faturamento</div>
                        <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 font-normal">Metas e projeção do próximo mês</div>
                      </div>
                      <ArrowUp size={18} className="group-hover:translate-y-[-2px] group-hover:translate-x-[2px] transition-transform" />
                    </button>

                    <button
                      onClick={() => fetchAiAdvice('costs')}
                      disabled={aiLoading}
                      className="group flex items-center justify-between p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 hover:from-amber-500/15 hover:to-amber-600/10 dark:from-amber-500/10 dark:to-amber-500/2 hover:dark:from-amber-500/15 hover:dark:to-amber-500/5 text-amber-700 dark:text-amber-400 rounded-2xl border border-amber-500/20 hover:border-amber-500/35 transition-all duration-300 text-left font-bold disabled:opacity-50"
                    >
                      <div className="space-y-1">
                        <div className="text-sm">Reduzir Custos</div>
                        <div className="text-[11px] text-amber-600/80 dark:text-amber-400/70 font-normal">Ajuste de comissões e despesas</div>
                      </div>
                      <ArrowDown size={18} className="group-hover:translate-y-[2px] group-hover:translate-x-[2px] transition-transform" />
                    </button>

                    <button
                      onClick={() => fetchAiAdvice('stock_campaign')}
                      disabled={aiLoading}
                      className="group flex items-center justify-between p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-650/5 hover:from-indigo-500/15 hover:to-indigo-600/10 dark:from-indigo-500/10 dark:to-indigo-500/2 hover:dark:from-indigo-500/15 hover:dark:to-indigo-500/5 text-indigo-700 dark:text-indigo-400 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/35 transition-all duration-300 text-left font-bold disabled:opacity-50"
                    >
                      <div className="space-y-1">
                        <div className="text-sm">Campanha de Estoque</div>
                        <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/70 font-normal">Giro rápido de produtos físicos</div>
                      </div>
                      <Package size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>

                  {/* Caixa de Diálogo do Conselheiro */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-gray-100 dark:border-slate-800/80 p-5 sm:p-6 min-h-[160px] flex flex-col justify-between relative overflow-hidden mb-6">
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4 my-auto">
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                          <Sparkles size={16} className="absolute inset-0 m-auto text-emerald-500 animate-pulse" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-gray-800 dark:text-slate-200">Consultando StyleFlow Advisor...</p>
                          <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 animate-pulse">Analisando faturamento bruto, divisão de comissões, ponto de profissionais e estoque de revenda...</p>
                        </div>
                      </div>
                    ) : typingAdvice ? (
                      <div className="prose dark:prose-invert max-w-none animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-500">Aconselhamento Ativo</span>
                        </div>
                        <div className="space-y-3">
                          {renderMarkdown(typingAdvice)}
                        </div>
                        {typingAdvice.length < (aiAdvice || '').length && (
                          <span className="inline-block w-1.5 h-4 bg-emerald-500 ml-1 animate-pulse"></span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-8 my-auto space-y-3">
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full">
                          <Bot size={32} />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-gray-700 dark:text-slate-300">Nenhum conselho solicitado ainda</p>
                          <p className="text-xs text-gray-400 dark:text-slate-400 max-w-md mx-auto mt-1">
                            Use um dos botões rápidos acima ou digite uma pergunta customizada abaixo para receber recomendações instantâneas de lucro, custos e marketing.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Customizado (Input Livre) */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!customQuestion.trim() || aiLoading) return;
                      fetchAiAdvice('custom', customQuestion);
                      setCustomQuestion('');
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <MessageSquare size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        disabled={aiLoading}
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="Pergunte ao Advisor (Ex: Como posso aumentar meu faturamento em 20%?)"
                        className="w-full pl-10 pr-4 py-3 sm:py-3.5 bg-slate-50/50 dark:bg-slate-950/40 border border-gray-200 dark:border-slate-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm transition-all disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={aiLoading || !customQuestion.trim()}
                      className="p-3 sm:p-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </>
              )}
            </div>
            </>
          )}
        </div>
      )}

      {/* ABA DE EQUIPE */}
      {activeTab === 'team' && isOwner && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 mt-4 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Minha Equipe</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie seus barbeiros, funcionários e comissões.</p>
            </div>
            <button onClick={() => setIsTeamModalOpen(true)} className="btn-primary shadow-lg shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-700 border-indigo-600">
              <Plus size={20} /> Novo Profissional
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4">Comissão (%)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {teamMembers.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum profissional cadastrado.</td></tr>
                ) : (
                  teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-4 font-bold text-gray-900 dark:text-white">
                        {member.user?.name} {member.userId === salon.ownerId && '(Dono)'}
                        <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                          ⏰ {member.workStart || '09:00'} - {member.workEnd || '18:00'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-900 dark:text-white">{member.user?.email}</div>
                        <div className="text-xs text-gray-500">{formatPhoneNumber(member.user?.phone)}</div>
                      </td>
                      <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">{member.commissionRate}%</td>
                      <td className="p-4">
                        {member.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                            <CheckCircle2 size={12} /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditProfessionalClick(member)}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/50 transition-all active:scale-95"
                          >
                            <Edit2 size={12} /> Editar
                          </button>
                          {member.userId !== salon.ownerId && (
                            <button 
                              onClick={() => handleDeleteProfessional(member.id)}
                              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/50 transition-all active:scale-95"
                              title="Remover profissional"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* SEÇÃO: CONTROLE DE PRESENÇA (PONTO ELETRÔNICO) */}
          <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="text-indigo-500" size={22} /> Controle de Presença
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Acompanhe as marcações de ponto e assiduidade diária da equipe.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={selectedTimecardDate}
                    onChange={(e) => setSelectedTimecardDate(e.target.value)}
                    className="w-full pl-3 pr-3 py-2 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition-all outline-none"
                  />
                </div>
                <button
                  onClick={exportTimecardCSV}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all active:scale-95 duration-200"
                >
                  <Download size={16} /> Exportar CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Profissional</th>
                    <th className="p-4">Intervalos Batidos (Entrada - Saída)</th>
                    <th className="p-4">Total Horas</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {teamTimecards.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Nenhum profissional com ponto registrado para esta data.
                      </td>
                    </tr>
                  ) : (
                    teamTimecards.map((item: any) => {
                      const hasTimecards = item.timecards && item.timecards.length > 0;
                      const isWorking = hasTimecards && item.timecards.some((tc: any) => !tc.clockOut);
                      const hasCompleted = hasTimecards && !isWorking;
                      
                      let totalHrsStr = '--:--';
                      
                      if (hasTimecards) {
                        let totalMs = 0;
                        item.timecards.forEach((tc: any) => {
                          const start = new Date(tc.clockIn).getTime();
                          const end = tc.clockOut ? new Date(tc.clockOut).getTime() : new Date().getTime();
                          totalMs += (end - start);
                        });
                        const diffHrs = Math.floor(totalMs / 3600000);
                        const diffMins = Math.floor((totalMs % 3600000) / 60000);
                        totalHrsStr = `${String(diffHrs).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}`;
                        if (isWorking) {
                          totalHrsStr += ' (Ativo)';
                        }
                      }
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Jornada: {item.workStart || '09:00'} - {item.workEnd || '18:00'}</div>
                          </td>
                          <td className="p-4">
                            {!hasTimecards ? (
                              <span className="text-xs text-gray-400 italic">Nenhum registro</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-xs md:max-w-md">
                                {item.timecards.map((tc: any, idx: number) => {
                                  const tIn = new Date(tc.clockIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                  const tOut = tc.clockOut 
                                    ? new Date(tc.clockOut).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    : 'Ativo';
                                  const isActive = !tc.clockOut;
                                  return (
                                    <span 
                                      key={tc.id || idx}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                                        isActive 
                                          ? 'bg-amber-50/70 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300 ring-1 ring-amber-400/20'
                                          : 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/10 dark:border-indigo-900/30 dark:text-indigo-400'
                                      }`}
                                    >
                                      {tIn} - {tOut}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{totalHrsStr}</td>
                          <td className="p-4">
                            {isWorking && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse">
                                🟡 Trabalhando
                              </span>
                            )}
                            {hasCompleted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                🟢 Concluído
                              </span>
                            )}
                            {!hasTimecards && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                                🔴 Ausente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA DE ESTOQUE (PRODUTOS) */}
      {activeTab === 'estoque' && isOwner && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                Controle de Estoque 📦
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Gerencie o catálogo de produtos e acompanhe os níveis de estoque em tempo real.
              </p>
            </div>
            <button 
              onClick={handleNewProductClick}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5 transition-all duration-300 font-bold"
            >
              <Plus size={18} /> 
              <span>Novo Produto</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700 text-sm font-semibold text-gray-600 dark:text-slate-300">
                  <th className="p-4">Produto</th>
                  <th className="p-4">Preço Venda</th>
                  <th className="p-4">Preço Custo</th>
                  <th className="p-4">Qtd. Estoque</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Nenhum produto cadastrado no estoque ainda.
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => {
                    const isOutOfStock = prod.stockQuantity === 0;
                    const isLowStock = prod.stockQuantity <= prod.minStockAlert;
                    
                    return (
                      <tr key={prod.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-4 font-bold text-gray-900 dark:text-white">
                          {prod.name}
                          {prod.description && (
                            <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                              {prod.description}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-bold text-gray-900 dark:text-white">
                          R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-4 text-gray-500 dark:text-slate-400">
                          {prod.costPrice ? `R$ ${Number(prod.costPrice).toFixed(2).replace('.', ',')}` : '-'}
                        </td>
                        <td className="p-4 font-mono text-sm text-gray-900 dark:text-white font-bold">
                          {prod.stockQuantity} / {prod.minStockAlert}
                        </td>
                        <td className="p-4">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                              🔴 Sem Estoque
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse">
                              🟡 Estoque Baixo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                              🟢 Em Estoque
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleToggleProductActive(prod)}
                            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                              prod.isActive 
                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100' 
                                : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:bg-gray-200'
                            }`}
                          >
                            {prod.isActive ? 'Ativo' : 'Inativo'}
                          </button>
                          <button 
                            onClick={() => handleEditProductClick(prod)}
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50 transition-all active:scale-95"
                          >
                            <Edit2 size={12} /> Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA DE CONFIGURAÇÕES DO SALÃO */}
      {activeTab === 'settings' && isOwner && salon && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 mt-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Configurações do Salão</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Atualize os dados comerciais e o horário de funcionamento geral do seu salão.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Visualização de Perfil de Vitrine (Mockup Premium) */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{salon.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">@{salon.slug || 'slug-do-salao'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm">
                    <span className="block text-gray-400 font-medium">WhatsApp Comercial</span>
                    <span className="text-gray-800 dark:text-slate-200 font-semibold">
                      {salon.phone ? formatPhoneNumber(salon.phone) : 'Não cadastrado'}
                    </span>
                  </div>

                  <div className="text-sm">
                    <span className="block text-gray-400 font-medium">Endereço</span>
                    <span className="text-gray-800 dark:text-slate-200">
                      {salon.address || 'Não cadastrado'}
                    </span>
                  </div>

                  <div className="text-sm">
                    <span className="block text-gray-400 font-medium">Expediente do Salão</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 mt-1">
                      <Clock size={12} /> {salon.openTime || '09:00'} às {salon.closeTime || '18:00'}
                    </span>
                  </div>
                </div>
              </div>

              {salon.phone && (
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                  <a 
                    href={`https://wa.me/55${salon.phone.replace(/\D/g, '')}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full text-sm text-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 p-3 rounded-xl flex justify-center items-center gap-2 transition-colors font-bold border border-emerald-200 dark:border-emerald-800"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.793 1.457 5.485.002 9.95-4.461 9.953-9.946.002-2.657-1.032-5.155-2.906-7.03C16.615 1.76 14.12 .727 11.46.727 5.973.727 1.507 5.19 1.504 10.677c0 1.682.449 3.322 1.302 4.773L1.879 21.05l5.768-1.512-.1 1.616z" />
                    </svg>
                    <span>Testar Link do WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            {/* Formulário de Configuração */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm md:col-span-2">
              <form onSubmit={handleUpdateSalon} className="space-y-6">
                {/* Abas Internas de Configurações */}
                <div className="flex overflow-x-auto gap-2 p-1.5 bg-gray-50 dark:bg-slate-900/60 rounded-2xl border border-gray-100 dark:border-slate-800/80 mb-8 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('general')}
                    className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 select-none whitespace-nowrap ${
                      settingsSubTab === 'general'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-100'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-slate-800/50 scale-100 active:scale-98'
                    }`}
                  >
                    <Store size={16} />
                    Dados Gerais
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('expediente')}
                    className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 select-none whitespace-nowrap ${
                      settingsSubTab === 'expediente'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-100'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-slate-800/50 scale-100 active:scale-98'
                    }`}
                  >
                    <Clock size={16} />
                    Funcionamento
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('comissao')}
                    className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 select-none whitespace-nowrap ${
                      settingsSubTab === 'comissao'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-100'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-slate-800/50 scale-100 active:scale-98'
                    }`}
                  >
                    <DollarSign size={16} />
                    Comissões
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('fila')}
                    className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-300 select-none whitespace-nowrap ${
                      settingsSubTab === 'fila'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-100'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-slate-800/50 scale-100 active:scale-98'
                    }`}
                  >
                    <Users size={16} />
                    Fila & Agendamento
                  </button>
                </div>

                {settingsSubTab === 'general' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Nome do Salão/Barbearia</label>
                        <input 
                          required 
                          type="text" 
                          value={salonForm.name} 
                          onChange={e => setSalonForm({...salonForm, name: e.target.value})} 
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">WhatsApp Comercial</label>
                        <input 
                          required 
                          type="text" 
                          maxLength={15}
                          value={salonForm.phone} 
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 11) v = v.slice(0, 11);
                            if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
                            if (v.length > 9) v = `${v.slice(0,10)}-${v.slice(10)}`;
                            setSalonForm({...salonForm, phone: v});
                          }} 
                          placeholder="(11) 99999-9999"
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                        />
                        {salonForm.phone && salonForm.phone.replace(/\D/g, '').length >= 10 && (
                          <a 
                            href={`https://wa.me/55${salonForm.phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline hover:scale-105 transition-all duration-200"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.793 1.457 5.485.002 9.95-4.461 9.953-9.946.002-2.657-1.032-5.155-2.906-7.03C16.615 1.76 14.12 .727 11.46.727 5.973.727 1.507 5.19 1.504 10.677c0 1.682.449 3.322 1.302 4.773L1.879 21.05l5.768-1.512-.1 1.616z" />
                            </svg>
                            <span>Testar link do WhatsApp ↗</span>
                          </a>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-indigo-500 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="3" />
                              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                            </svg>
                            Automação de WhatsApp (Opcional)
                          </h4>
                          <span className="text-[9px] font-extrabold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">Automático</span>
                        </div>
                        
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-normal">
                          Conecte sua API de Gateway (Evolution, Z-API, Baileys) para disparar as mensagens 100% de forma automática em segundo plano, sem precisar abrir janelas ou clicar em enviar manualmente!
                        </p>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">URL de Envio do Gateway API</label>
                            <input 
                              type="url" 
                              value={salonForm.whatsappGatewayUrl} 
                              onChange={e => setSalonForm({...salonForm, whatsappGatewayUrl: e.target.value})} 
                              placeholder="https://api.seugateway.com/v1/send-text"
                              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary outline-none" 
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1.5">Token / Chave de Segurança API</label>
                            <input 
                              type="password" 
                              value={salonForm.whatsappGatewayToken} 
                              onChange={e => setSalonForm({...salonForm, whatsappGatewayToken: e.target.value})} 
                              placeholder="Chave secreta ou API token de autenticação"
                              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary outline-none" 
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Instagram (URL ou Usuário)</label>
                        <input 
                          type="text" 
                          value={salonForm.instagramUrl} 
                          onChange={e => setSalonForm({...salonForm, instagramUrl: e.target.value})} 
                          placeholder="https://instagram.com/seu.usuario"
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                        />
                        {salonForm.instagramUrl && (
                          <a 
                            href={formatInstagramUrl(salonForm.instagramUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline hover:scale-105 transition-all duration-200"
                          >
                            <Instagram size={14} className="text-pink-500" />
                            <span>Testar link do Instagram ↗</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">CEP (Buscar Endereço)</label>
                        <input 
                          type="text" 
                          maxLength={9}
                          placeholder="00000-000"
                          onChange={async (e) => {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 8) v = v.slice(0, 8);
                            if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                            
                            e.target.value = v;

                            const rawCep = v.replace(/\D/g, '');
                            if (rawCep.length === 8) {
                              try {
                                const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
                                const addressData = await response.json();
                                if (!addressData.erro) {
                                  const street = addressData.logradouro || '';
                                  const neighborhood = addressData.bairro || '';
                                  const city = addressData.localidade || '';
                                  const state = addressData.uf || '';
                                  
                                  let fullAddr = '';
                                  if (street) fullAddr += street;
                                  if (neighborhood) fullAddr += `, ${neighborhood}`;
                                  if (city) fullAddr += `, ${city} - ${state}`;
                                  
                                  setSalonForm(prev => ({
                                    ...prev,
                                    address: fullAddr
                                  }));
                                }
                              } catch (err) {
                                console.error("Erro ao buscar CEP:", err);
                              }
                            }
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Endereço Comercial</label>
                        <input 
                          type="text" 
                          required
                          value={salonForm.address} 
                          onChange={e => setSalonForm({...salonForm, address: e.target.value})} 
                          placeholder="Rua das Flores, 123 - Bairro Centro"
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {settingsSubTab === 'expediente' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Expediente de Funcionamento do Estabelecimento</span>
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Horário de Abertura</label>
                          <input 
                            required 
                            type="time" 
                            value={salonForm.openTime} 
                            onChange={e => setSalonForm({...salonForm, openTime: e.target.value})} 
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Horário de Fechamento</label>
                          <input 
                            required 
                            type="time" 
                            value={salonForm.closeTime} 
                            onChange={e => setSalonForm({...salonForm, closeTime: e.target.value})} 
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        Este horário define o expediente geral. Clientes só poderão agendar cortes dentro deste intervalo de tempo.
                      </p>
                    </div>
                  </div>
                )}

                {settingsSubTab === 'comissao' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Comissão sobre Vendas de Produtos Físicos</span>
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            id="productCommissionEnabled"
                            checked={salonForm.productCommissionEnabled}
                            onChange={e => setSalonForm({...salonForm, productCommissionEnabled: e.target.checked})}
                            className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <label htmlFor="productCommissionEnabled" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                            Habilitar repasse de comissão de produtos para a equipe
                          </label>
                        </div>
                        {salonForm.productCommissionEnabled && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                              Taxa de Comissão Geral de Produtos (%)
                            </label>
                            <input 
                              type="text" 
                              maxLength={3}
                              value={salonForm.productCommissionRate} 
                              onChange={e => setSalonForm({...salonForm, productCommissionRate: e.target.value.replace(/\D/g, '')})} 
                              className="w-full sm:w-1/3 px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                              placeholder="Ex: 10"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {settingsSubTab === 'fila' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Modo de Funcionamento Principal do Estabelecimento</span>
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-6">
                        Selecione como os agendamentos e a ordem de atendimento dos clientes serão gerenciados no seu salão.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {/* Modo 1: Agenda Comercial */}
                        <div 
                          onClick={() => setSalonForm({...salonForm, queueMode: false})}
                          className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            !salonForm.queueMode 
                              ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-md shadow-indigo-500/5' 
                              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className={`p-2 rounded-lg ${!salonForm.queueMode ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                <Calendar size={20} />
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!salonForm.queueMode ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-slate-600'}`}>
                                {!salonForm.queueMode && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <h5 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Agenda Comercial (Hora Fixa)</h5>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                              Clientes reservam horários fixos. O sistema realiza verificação estrita de choque de horários (anti-clash), bloqueando novos agendamentos no mesmo período.
                            </p>
                          </div>
                        </div>

                        {/* Modo 2: Fila Dinâmica */}
                        <div 
                          onClick={() => setSalonForm({...salonForm, queueMode: true})}
                          className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            salonForm.queueMode 
                              ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-md shadow-indigo-500/5' 
                              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className={`p-2 rounded-lg ${salonForm.queueMode ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                <Users size={20} />
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${salonForm.queueMode ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-slate-600'}`}>
                                {salonForm.queueMode && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <h5 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Fila Dinâmica (Ordem de Chegada)</h5>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                              Clientes agendam um horário preferencial livremente (sem bloqueio de colisão). O sistema gerencia uma fila sequencial reativa no dia por profissional, com estimativas de tempo ao vivo.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {salonForm.queueMode && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                id="queueAutoAdvance"
                                checked={salonForm.queueAutoAdvance}
                                onChange={e => setSalonForm({...salonForm, queueAutoAdvance: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <label htmlFor="queueAutoAdvance" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                                Avanço automático da fila
                              </label>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                id="queueAllowClientView"
                                checked={salonForm.queueAllowClientView}
                                onChange={e => setSalonForm({...salonForm, queueAllowClientView: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <label htmlFor="queueAllowClientView" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                                Permitir consulta pública da fila
                              </label>
                            </div>

                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                id="queueNotifyClient"
                                checked={salonForm.queueNotifyClient}
                                onChange={e => setSalonForm({...salonForm, queueNotifyClient: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <label htmlFor="queueNotifyClient" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                                Notificar cliente por WhatsApp
                              </label>
                            </div>

                            {salonForm.queueNotifyClient && (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 col-span-1 sm:col-span-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Notificar quantas pessoas antes? (Posição)
                                  </label>
                                  <input 
                                    type="number" 
                                    min={1}
                                    max={20}
                                    value={salonForm.queueNotifyAhead} 
                                    onChange={e => setSalonForm({...salonForm, queueNotifyAhead: Number(e.target.value)})} 
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none animate-in fade-in" 
                                  />
                                </div>
                                
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                                      Template de Mensagem do WhatsApp
                                    </label>
                                    <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">Customizável</span>
                                  </div>
                                  <textarea
                                    rows={3}
                                    value={salonForm.whatsappTemplate}
                                    onChange={e => setSalonForm({...salonForm, whatsappTemplate: e.target.value})}
                                    placeholder="Olá {cliente}, seu atendimento no {estabelecimento} está chegando! Você é o {posicao}º da fila com previsão para as {tempo}."
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed"
                                  />
                                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5 leading-normal">
                                    Tags suportadas: <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{`{cliente}`}</code>, <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{`{posicao}`}</code>, <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{`{tempo}`}</code>, <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{`{estabelecimento}`}</code>.
                                  </p>
                                </div>

                                <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2">
                                  <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Testar Disparo Rápido (WhatsApp Web)
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      maxLength={15}
                                      value={testPhone}
                                      onChange={e => {
                                        let v = e.target.value.replace(/\D/g, '');
                                        if (v.length > 11) v = v.slice(0, 11);
                                        if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                                        if (v.length > 9) v = `${v.slice(0, 10)}-${v.slice(10)}`;
                                        setTestPhone(v);
                                      }}
                                      placeholder="(11) 99999-9999"
                                      className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const sanitized = testPhone.replace(/\D/g, '');
                                        if (sanitized.length < 10) return alert("Por favor, digite um celular válido com DDD.");
                                        const msg = formatNotificationMessage(
                                          salonForm.whatsappTemplate || 'Olá {cliente}, seu atendimento no {estabelecimento} está chegando! Você é o {posicao}º da fila com previsão para as {tempo}.',
                                          user?.name || 'Cliente Teste',
                                          3,
                                          '15:30',
                                          salonForm.name || 'Salão Premium'
                                        );
                                        const url = `https://wa.me/55${sanitized}?text=${encodeURIComponent(msg)}`;
                                        window.open(url, '_blank');
                                      }}
                                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1 active:scale-98"
                                    >
                                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.793 1.457 5.485.002 9.95-4.461 9.953-9.946.002-2.657-1.032-5.155-2.906-7.03C16.615 1.76 14.12 .727 11.46.727 5.973.727 1.507 5.19 1.504 10.677c0 1.682.449 3.322 1.302 4.773L1.879 21.05l5.768-1.512-.1 1.616z" />
                                      </svg>
                                      Testar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3 col-span-1 sm:col-span-2">
                              <input 
                                type="checkbox"
                                id="queueAllowSkip"
                                checked={salonForm.queueAllowSkip}
                                onChange={e => setSalonForm({...salonForm, queueAllowSkip: e.target.checked})}
                                className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-600 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <label htmlFor="queueAllowSkip" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                                Permitir pulo automático por ausência (No-show)
                              </label>
                            </div>

                            {salonForm.queueAllowSkip && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-200 col-span-1 sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                  Tempo limite para pulo (minutos)
                                </label>
                                <input 
                                  type="number" 
                                  min={1}
                                  max={120}
                                  value={salonForm.queueSkipTimeoutMin} 
                                  onChange={e => setSalonForm({...salonForm, queueSkipTimeoutMin: Number(e.target.value)})} 
                                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700/80">
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:scale-98 border-indigo-600">
                    Salvar Configurações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (isOwner || user?.role === 'PROFESSIONAL') && salon && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Painel de Fila Dinâmica</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie a fila de clientes do dia por profissional em tempo real.</p>
            </div>
          </div>

          {!activeQueueMode ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm text-center">
              <Clock size={48} className="text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Fila Dinâmica Desativada</h2>
              <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Para utilizar o sistema de fila de atendimento dinâmico (sem hora marcada) com estimativas reativas de tempo e painel público de vitrine de clientes, ative o Modo Fila nas configurações do salão.
              </p>
              <button 
                onClick={() => setActiveTab('settings')} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 border-indigo-600"
              >
                Ir para Configurações do Salão
              </button>
            </div>
          ) : (
            <>
              {/* SELETOR DE PROFISSIONAL E COMPARTILHAMENTO */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col sm:flex-row items-end gap-4 flex-1">
                  <div className="w-full sm:max-w-xs">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">
                      Selecionar Profissional
                    </label>
                    <select
                      value={selectedQueueProfessionalId}
                      onChange={(e) => setSelectedQueueProfessionalId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="" disabled>Selecione um profissional</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name || member.user?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {queueSession && (
                    <button
                      onClick={() => setIsAddWalkInModalOpen(true)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95 transition-all border border-emerald-600 h-[44px]"
                      title="Adicionar Cliente Walk-in diretamente na fila"
                    >
                      <Plus size={16} /> Adicionar na Fila
                    </button>
                  )}
                </div>

                {salon.queueAllowClientView && (
                  <div className="flex-1 max-w-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                        Link Público da Fila
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                        Compartilhe para os clientes acompanharem a posição deles online
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/app/${salon.slug}`;
                        navigator.clipboard.writeText(url);
                        alert('Link copiado para a área de transferência! 📋');
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 active:scale-95 transition-all border-indigo-600"
                    >
                      <Copy size={14} /> Copiar Link
                    </button>
                  </div>
                )}
              </div>

              {/* CONTEÚDO PRINCIPAL DA FILA */}
              {!selectedQueueProfessionalId ? (
                <div className="p-8 text-center text-gray-500 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                  Selecione um profissional da equipe acima para gerenciar a fila.
                </div>
              ) : !queueSession ? (
                <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-gray-150 dark:border-slate-700 shadow-sm flex flex-col items-center animate-in fade-in duration-300">
                  <Clock size={40} className="text-gray-400 dark:text-slate-500 mb-4" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Fila Fechada</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-sm text-center">
                    Não há nenhuma sessão de fila de hoje aberta para este profissional no momento.
                  </p>
                  <button 
                    onClick={() => fetchQueueSession(selectedQueueProfessionalId)} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 border-indigo-600"
                  >
                    Abrir Fila de Hoje
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* CARD DE ATENDIMENTO ATIVO */}
                  <div className="lg:col-span-1 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Atendimento em Andamento</h3>
                    
                    {queueSession.entries.find((e: any) => e.status === 'IN_PROGRESS') ? (
                      (() => {
                        const activeEntry = queueSession.entries.find((e: any) => e.status === 'IN_PROGRESS');
                        return (
                          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                              <Scissors size={150} />
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-white/20 rounded-md">Atendimento Ativo</span>
                            <h2 className="text-2xl font-black mt-4 leading-tight">{activeEntry.appointment?.customer?.user?.name || activeEntry.customerName || 'Cliente'}</h2>
                            <p className="text-xs font-semibold text-white/80 mt-1">{activeEntry.appointment?.service?.name || activeEntry.serviceName || 'Serviço'}</p>
                            
                            <div className="mt-8 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 flex items-center justify-between">
                              <span className="text-xs font-bold text-white/70">Tempo decorrido:</span>
                              <ActiveTimer startTime={activeEntry.actualStart || activeEntry.estimatedStart} />
                            </div>

                            <div className="mt-6 space-y-3">
                              <button 
                                onClick={handleCompleteActive} 
                                className="w-full bg-white hover:bg-slate-50 text-indigo-900 font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-white"
                              >
                                <CheckCircle2 size={18} /> Concluir Atendimento
                              </button>

                              <button 
                                onClick={handleStartNext} 
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl border border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                              >
                                <Play size={18} /> Concluir & Chamar Próximo
                              </button>

                              <button 
                                onClick={() => {
                                  setSkippingEntryId(activeEntry.id);
                                  setIsSkipModalOpen(true);
                                }} 
                                className="w-full bg-rose-600/35 hover:bg-rose-600/50 text-white font-bold py-3 px-4 rounded-xl border border-rose-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                              >
                                <AlertCircle size={18} /> Registrar Ausência (Pular)
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm text-center flex flex-col items-center">
                        <Play size={32} className="text-indigo-500 dark:text-indigo-400 mb-3 animate-bounce" />
                        <h4 className="font-bold text-gray-900 dark:text-white">Nenhum Cliente em Andamento</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-4">
                          Inicie o dia de atendimento chamando o primeiro cliente da lista.
                        </p>
                        {queueSession.entries.filter((e: any) => e.status === 'WAITING').length > 0 && (
                          <button 
                            onClick={handleStartNext} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 border-indigo-600"
                          >
                            <Play size={16} /> Chamar Primeiro Cliente
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* LISTA DE ESPERA (AGUARDANDO) */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Próximos na Fila (Lista de Espera)</h3>
                      <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                        {queueSession.entries.filter((e: any) => e.status === 'WAITING').length} clientes aguardando
                      </span>
                    </div>

                    <div className="space-y-3">
                      {queueSession.entries.filter((e: any) => e.status === 'WAITING').length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm text-center text-gray-500">
                          Nenhum cliente aguardando na fila.
                        </div>
                      ) : (
                        queueSession.entries
                          .filter((e: any) => e.status === 'WAITING')
                          .map((entry: any, index: number, arr: any[]) => {
                            const estTime = new Date(entry.estimatedStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={entry.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700/60 shadow-sm hover:border-indigo-150 dark:hover:border-indigo-900/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center font-bold text-gray-700 dark:text-slate-350">
                                    {index + 1}º
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{entry.appointment?.customer?.user?.name || entry.customerName || 'Cliente'}</h4>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{entry.appointment?.service?.name || entry.serviceName || 'Serviço'} • Duração: {entry.appointment?.service?.duration || entry.serviceDuration || 30} min</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 justify-between sm:justify-end">
                                  <div className="text-left sm:text-right">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 block">Previsão</span>
                                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{estTime}</span>
                                  </div>

                                  {/* BOTÕES DE AÇÃO DE FILA */}
                                  <div className="flex items-center gap-1.5">
                                    {/* WhatsApp Direct Notification */}
                                    {salon?.queueNotifyClient && entry.appointment?.customer?.user?.phone && (
                                      <button
                                        onClick={() => {
                                          const phoneClean = entry.appointment.customer.user.phone.replace(/\D/g, '');
                                          const formattedMsg = formatNotificationMessage(
                                            salon.whatsappTemplate || 'Olá {cliente}, seu atendimento no {estabelecimento} está chegando! Você é o {posicao}º da fila com previsão para as {tempo}.',
                                            entry.appointment.customer.user.name || 'Cliente',
                                            index + 1,
                                            estTime,
                                            salon.name || 'Estabelecimento'
                                          );
                                          const url = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(formattedMsg)}`;
                                          window.open(url, '_blank');
                                        }}
                                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all active:scale-95 flex items-center justify-center"
                                        title="Enviar Notificação no WhatsApp"
                                      >
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.793 1.457 5.485.002 9.95-4.461 9.953-9.946.002-2.657-1.032-5.155-2.906-7.03C16.615 1.76 14.12 .727 11.46.727 5.973.727 1.507 5.19 1.504 10.677c0 1.682.449 3.322 1.302 4.773L1.879 21.05l5.768-1.512-.1 1.616z" />
                                        </svg>
                                      </button>
                                    )}

                                    {/* Subir Posição */}
                                    <button 
                                      disabled={index === 0}
                                      onClick={async () => {
                                        const token = sessionStorage.getItem('token');
                                        try {
                                          const res = await fetch(`http://localhost:3333/api/v1/queue/${queueSession.id}/reorder`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                            body: JSON.stringify({ entryId: entry.id, newPosition: index, reason: 'Ajuste rápido para cima' })
                                          });
                                          if (!res.ok) {
                                            const err = await res.json();
                                            alert(err.error || 'Erro ao reordenar fila.');
                                          } else {
                                            fetchQueueSession(selectedQueueProfessionalId);
                                          }
                                        } catch (err) {
                                          console.error("Erro ao reordenar para cima:", err);
                                          alert('Erro de conexão ao servidor.');
                                        }
                                      }}
                                      className={`p-1.5 rounded-lg border transition-all ${
                                        index === 0 
                                          ? 'text-gray-300 dark:text-slate-700 border-gray-200/40 dark:border-slate-800 cursor-not-allowed'
                                          : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40 active:scale-95'
                                      }`}
                                      title="Subir Posição"
                                    >
                                      <ArrowUp size={14} />
                                    </button>

                                    {/* Descer Posição */}
                                    <button 
                                      disabled={index === arr.length - 1}
                                      onClick={async () => {
                                        const token = sessionStorage.getItem('token');
                                        try {
                                          const res = await fetch(`http://localhost:3333/api/v1/queue/${queueSession.id}/reorder`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                            body: JSON.stringify({ entryId: entry.id, newPosition: index + 2, reason: 'Ajuste rápido para baixo' })
                                          });
                                          if (!res.ok) {
                                            const err = await res.json();
                                            alert(err.error || 'Erro ao reordenar fila.');
                                          } else {
                                            fetchQueueSession(selectedQueueProfessionalId);
                                          }
                                        } catch (err) {
                                          console.error("Erro ao reordenar para baixo:", err);
                                          alert('Erro de conexão ao servidor.');
                                        }
                                      }}
                                      className={`p-1.5 rounded-lg border transition-all ${
                                        index === arr.length - 1
                                          ? 'text-gray-300 dark:text-slate-700 border-gray-200/40 dark:border-slate-800 cursor-not-allowed'
                                          : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40 active:scale-95'
                                      }`}
                                      title="Descer Posição"
                                    >
                                      <ArrowDown size={14} />
                                    </button>

                                    {/* Reordenar Posição Customizada */}
                                    <button 
                                      onClick={() => {
                                        setReorderingEntryId(entry.id);
                                        setReorderingNewPosition(index + 1);
                                        setReorderReason('Prioridade Preferencial');
                                        setIsReorderModalOpen(true);
                                      }}
                                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                                    >
                                      Reordenar
                                    </button>

                                    {/* Pular / Falta */}
                                    <button 
                                      onClick={() => {
                                        setSkippingEntryId(entry.id);
                                        setIsSkipModalOpen(true);
                                      }}
                                      className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                                    >
                                      Ausente
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL: ALTERAR SENHA */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/55 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-150/50 dark:border-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl">
                  <Lock size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alterar Minha Senha</h2>
              </div>
              <button 
                onClick={() => {
                  setIsChangePasswordModalOpen(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setChangePasswordError(null);
                  setChangePasswordSuccess(null);
                }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {changePasswordError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-sm font-medium flex items-center gap-2 animate-in shake duration-300">
                  <AlertCircle size={16} />
                  <span>{changePasswordError}</span>
                </div>
              )}

              {changePasswordSuccess && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{changePasswordSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Senha Atual</label>
                <input 
                  type="password" 
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-medium text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Nova Senha</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-medium text-sm"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={changePasswordLoading}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {changePasswordLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR PROFISSIONAL */}
      {isTeamModalOpen && isOwner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Adicionar Profissional</h2>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProfessional} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome Completo</label>
                <input required value={newProfessional.name} onChange={e => setNewProfessional({...newProfessional, name: e.target.value})} type="text" className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nome do barbeiro" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-mail (usado para login)</label>
                <input required value={newProfessional.email} onChange={e => setNewProfessional({...newProfessional, email: e.target.value})} type="email" className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="barbeiro@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Senha do Profissional (Opcional - padrão: SenhaTemporaria123)</label>
                <input 
                  value={newProfessional.password} 
                  onChange={e => setNewProfessional({...newProfessional, password: e.target.value})} 
                  type="password" 
                  minLength={8}
                  className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="Min. 8 caracteres" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input 
                  value={newProfessional.phone} 
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.slice(0, 11);
                    if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
                    if (v.length > 9) v = `${v.slice(0,10)}-${v.slice(10)}`;
                    setNewProfessional({...newProfessional, phone: v});
                  }} 
                  type="text" 
                  maxLength={15}
                  className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="(11) 99999-9999" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Taxa de Comissão (%)</label>
                <input required value={newProfessional.commissionRate} onChange={e => setNewProfessional({...newProfessional, commissionRate: e.target.value.replace(/\D/g, '')})} type="text" maxLength={3} className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: 50" />
                <p className="text-xs text-gray-500 mt-1">Porcentagem que ele recebe por cada corte concluído.</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Início do Expediente</label>
                  <input required value={newProfessional.workStart} onChange={e => setNewProfessional({...newProfessional, workStart: e.target.value})} type="time" className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fim do Expediente</label>
                  <input required value={newProfessional.workEnd} onChange={e => setNewProfessional({...newProfessional, workEnd: e.target.value})} type="time" className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              
              <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold shadow-md transition-colors border-indigo-600">Cadastrar Profissional</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PROFISSIONAL */}
      {editingProfessional && isOwner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Profissional</h2>
              <button onClick={() => setEditingProfessional(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditProfessionalSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome Completo</label>
                <input required value={editProfessionalForm.name} onChange={e => setEditProfessionalForm({...editProfessionalForm, name: e.target.value})} type="text" className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input 
                  value={editProfessionalForm.phone} 
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.slice(0, 11);
                    if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
                    if (v.length > 9) v = `${v.slice(0,10)}-${v.slice(10)}`;
                    setEditProfessionalForm({...editProfessionalForm, phone: v});
                  }} 
                  type="text" 
                  maxLength={15}
                  className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="(11) 99999-9999" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nova Senha (Deixe em branco para não alterar)</label>
                <input 
                  value={editProfessionalForm.password} 
                  onChange={e => setEditProfessionalForm({...editProfessionalForm, password: e.target.value})} 
                  type="password" 
                  minLength={8}
                  className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="Min. 8 caracteres" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Taxa de Comissão (%)</label>
                <input required value={editProfessionalForm.commissionRate} onChange={e => setEditProfessionalForm({...editProfessionalForm, commissionRate: e.target.value.replace(/\D/g, '')})} type="text" maxLength={3} className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                <p className="text-xs text-gray-500 mt-1">Aumente ou diminua a taxa de comissão deste profissional.</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Início do Expediente</label>
                  <input required value={editProfessionalForm.workStart} onChange={e => setEditProfessionalForm({...editProfessionalForm, workStart: e.target.value})} type="time" className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fim do Expediente</label>
                  <input required value={editProfessionalForm.workEnd} onChange={e => setEditProfessionalForm({...editProfessionalForm, workEnd: e.target.value})} type="time" className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              
              <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                <button type="button" onClick={() => setEditingProfessional(null)} className="px-4 py-2 font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold shadow-md transition-colors border-indigo-600">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR/EDITAR SERVIÇO */}
      {isModalOpen && (isOwner || user?.role === 'PROFESSIONAL') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome do Serviço</label>
                <input required value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Corte Infantil" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Categoria do Serviço</label>
                <select
                  value={['Cabelo', 'Sobrancelha', 'Coloração', 'Barba', 'Unha', 'Maquiagem', 'Depilação', 'Estética'].includes(newService.category) ? newService.category : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setNewService({ ...newService, category: '' });
                    } else {
                      setNewService({ ...newService, category: val });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer font-semibold"
                >
                  <option value="Cabelo">Cabelo</option>
                  <option value="Sobrancelha">Sobrancelha</option>
                  <option value="Coloração">Coloração</option>
                  <option value="Barba">Barba</option>
                  <option value="Unha">Unha</option>
                  <option value="Maquiagem">Maquiagem</option>
                  <option value="Depilação">Depilação</option>
                  <option value="Estética">Estética</option>
                  <option value="custom">Outra Categoria (Personalizada)...</option>
                </select>
                
                {!['Cabelo', 'Sobrancelha', 'Coloração', 'Barba', 'Unha', 'Maquiagem', 'Depilação', 'Estética'].includes(newService.category) && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <input
                      required
                      value={newService.category}
                      onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Digite a categoria personalizada (ex: Podologia)"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Preço (R$)</label>
                  <input required value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="0.00" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Duração (Minutos)</label>
                  <input required value={newService.duration} onChange={e => setNewService({...newService, duration: e.target.value})} type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: 40" />
                </div>
              </div>
              
              <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="px-4 py-2 font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="btn-primary">{editingId ? 'Salvar Alterações' : 'Criar Serviço'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGENDAR SERVIÇO (Cliente) */}
      {schedulingService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Agendar: {schedulingService.name}</h2>
              <button onClick={() => setSchedulingService(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Escolha o Profissional</label>
                <select 
                  required
                  value={appointmentForm.professionalId}
                  onChange={(e) => setAppointmentForm({...appointmentForm, professionalId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="" disabled>Selecione...</option>
                  {professionals.map(prof => (
                    <option key={prof.id} value={prof.id}>{prof.user?.name || 'Profissional'}</option>
                  ))}
                </select>
                {professionals.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">Este salão ainda não possui profissionais cadastrados.</p>
                )}
              </div>
              
              {salon?.queueMode ? (
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                    <Clock size={18} className="animate-pulse" />
                    <span className="font-bold text-sm">Fila Dinâmica Ativada</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed font-medium">
                    O estabelecimento está funcionando no modo por ordem de chegada (sem horário marcado). Ao confirmar, você entrará na lista de espera de hoje. Sua posição e tempo previsto serão calculados em tempo real.
                  </p>
                </div>
              ) : (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Data</label>
                    <input 
                      required 
                      type="date" 
                      min={localToday} // Não deixa agendar no passado
                      value={appointmentForm.date}
                      onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Horário</label>
                    <select 
                      required 
                      value={appointmentForm.time}
                      onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                    >
                      <option value="" disabled>Selecione...</option>
                      {timeSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl flex justify-between items-center border border-gray-100 dark:border-slate-600 mt-2">
                <span className="text-sm text-gray-600 dark:text-slate-300">Total a pagar no local:</span>
                <span className="text-lg font-bold text-primary dark:text-blue-400">R$ {Number(schedulingService.price).toFixed(2).replace('.', ',')}</span>
              </div>
              
              <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-700">
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setSchedulingService(null)} className="px-4 py-2 font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                  <button type="submit" disabled={professionals.length === 0} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">Confirmar Agendamento</button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  {salon?.phone && (
                    <a 
                      href={`https://wa.me/55${salon.phone.replace(/\D/g, '')}?text=Olá! Gostaria de saber se há alguma desistência ou lista de espera para um encaixe.`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 text-xs text-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 p-2.5 rounded-lg flex justify-center items-center gap-2 transition-colors font-semibold border border-emerald-200 dark:border-emerald-800"
                    >
                      WhatsApp Suporte/Lista
                    </a>
                  )}
                  {salon?.instagramUrl && (
                    <a 
                      href={formatInstagramUrl(salon.instagramUrl)}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 text-xs text-center text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/20 hover:bg-pink-100 dark:hover:bg-pink-900/20 p-2.5 rounded-lg flex justify-center items-center gap-2 transition-colors font-semibold border border-pink-200 dark:border-pink-900/30"
                    >
                      <Instagram size={14} />
                      Visite nosso Instagram
                    </a>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL OBRIGATÓRIO: CRIAR SALÃO */}
      {showCreateSalonModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 text-primary mx-auto rounded-full flex items-center justify-center mb-6">
              <Store size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Configure seu Salão</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-8">
              Para começar a cadastrar serviços, precisamos saber o nome do seu estabelecimento.
            </p>

            <form onSubmit={handleCreateSalon} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome da Barbearia/Salão</label>
                <input required value={newSalon.name} onChange={e => setNewSalon({...newSalon, name: e.target.value})} type="text" className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Barbearia do João" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">WhatsApp / Telefone</label>
                <input 
                  required 
                  value={newSalon.phone} 
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.slice(0, 11);
                    if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
                    if (v.length > 9) v = `${v.slice(0,10)}-${v.slice(10)}`;
                    setNewSalon({...newSalon, phone: v});
                  }} 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                  placeholder="(11) 99999-9999" 
                  maxLength={15} 
                />
              </div>
              
              <button type="submit" className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/30 mt-6">
                Iniciar meu Negócio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT DE AGENDAMENTO */}
      {checkoutApt && (() => {
        const cartTotal = checkoutCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const servicePrice = Number(checkoutForm.finalPrice.replace(',', '.')) || 0;
        const grandTotal = servicePrice + cartTotal;
        const activeInStockProducts = products.filter(p => p.isActive && p.stockQuantity > 0);

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/20">
                <div>
                  <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-400">Finalizar & Cobrar</h2>
                  <p className="text-xs text-emerald-700 dark:text-emerald-500 font-medium">Checkout de Agendamento</p>
                </div>
                <button 
                  onClick={() => { setCheckoutApt(null); setCheckoutCart([]); }} 
                  className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={submitCheckout} className="p-6 space-y-5">
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Cliente</p>
                      <p className="font-bold text-gray-900 dark:text-white">{checkoutApt.customer?.user?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">Serviço Original</p>
                      <p className="font-medium text-gray-900 dark:text-white">{checkoutApt.service?.name}</p>
                    </div>
                  </div>
                </div>

                {/* ADICIONAR PRODUTOS AO CARRINHO */}
                <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/20 dark:bg-slate-800/20">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                    <ShoppingCart size={16} className="text-emerald-500" />
                    Produtos Adicionais
                  </h3>
                  
                  {activeInStockProducts.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">Nenhum produto ativo em estoque.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <select 
                            value={checkoutProdId}
                            onChange={(e) => setCheckoutProdId(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            <option value="">-- Selecione o Produto --</option>
                            {activeInStockProducts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} - R$ {p.price.toFixed(2)} ({p.stockQuantity} unid.)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-20">
                          <input 
                            type="number"
                            min="1"
                            value={checkoutProdQty}
                            onChange={(e) => setCheckoutProdQty(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={handleAddToCheckoutCart}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors active:scale-95"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PRODUTOS JÁ ADICIONADOS */}
                  {checkoutCart.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-32 overflow-y-auto pr-1">
                      {checkoutCart.map(item => (
                        <div key={item.productId} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-100 dark:border-slate-700 text-xs shadow-sm">
                          <div className="font-semibold text-gray-800 dark:text-slate-200">
                            {item.name} <span className="text-gray-400 font-normal">x{item.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                            <button 
                              type="button"
                              onClick={() => handleRemoveFromCheckoutCart(item.productId)}
                              className="text-rose-500 hover:text-rose-700 transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Forma de Pagamento</label>
                    <select 
                      required
                      value={checkoutForm.paymentMethod}
                      onChange={(e) => setCheckoutForm({...checkoutForm, paymentMethod: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    >
                      <option value="PIX">PIX</option>
                      <option value="CREDIT_CARD">Cartão de Crédito</option>
                      <option value="DEBIT_CARD">Cartão de Débito</option>
                      <option value="CASH">Dinheiro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Valor do Serviço (R$)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <DollarSign size={14} className="text-gray-400" />
                      </div>
                      <input 
                        required 
                        type="text" 
                        value={checkoutForm.finalPrice}
                        onChange={(e) => setCheckoutForm({...checkoutForm, finalPrice: e.target.value.replace(/[^0-9,]/g, '')})}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                      />
                    </div>
                  </div>
                </div>

                {/* RESUMO TOTAL DA COMPRA */}
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-slate-400">
                    <span>Serviço:</span>
                    <span>R$ {servicePrice.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-slate-400">
                    <span>Produtos:</span>
                    <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="h-px bg-emerald-100 dark:bg-emerald-900/50 my-2"></div>
                  <div className="flex justify-between font-black text-emerald-800 dark:text-emerald-400 text-lg">
                    <span>Total Geral:</span>
                    <span>R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
                
                <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                  <button 
                    type="button" 
                    onClick={() => { setCheckoutApt(null); setCheckoutCart([]); }} 
                    className="px-4 py-2 font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold shadow-md transition-colors text-sm"
                  >
                    Confirmar Recebimento
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: REGISTRAR FALTA / PULAR CLIENTE */}
      {isSkipModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-950/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle size={20} className="text-rose-500" /> Registrar Falta / Pular
              </h2>
              <button 
                onClick={() => { setIsSkipModalOpen(false); setSkippingEntryId(''); }} 
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSkipEntrySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                  Motivo da Ausência / Cancelamento
                </label>
                <input
                  type="text"
                  required
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none text-sm font-medium"
                  placeholder="Ex: Cliente não compareceu após tolerância"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Cliente Ausente', 'Desistência', 'Atraso tolerância'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSkipReason(r)}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-gray-600 dark:text-slate-350 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => { setIsSkipModalOpen(false); setSkippingEntryId(''); }} 
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md transition-colors active:scale-95 border-rose-500"
                >
                  Confirmar Falta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR CLIENTE WALK-IN NA FILA */}
      {isAddWalkInModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus size={20} className="text-emerald-500 animate-pulse" /> Adicionar na Fila (Presencial)
              </h2>
              <button 
                onClick={() => { setIsAddWalkInModalOpen(false); setNewWalkInName(''); setNewWalkInPhone(''); setNewWalkInServiceId(''); }} 
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                disabled={isWalkInLoading}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddWalkInSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                  Nome do Cliente <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isWalkInLoading}
                  value={newWalkInName}
                  onChange={(e) => setNewWalkInName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                  WhatsApp / Celular (Opcional)
                </label>
                <input
                  type="text"
                  disabled={isWalkInLoading}
                  value={newWalkInPhone}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.slice(0, 11);
                    if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
                    if (v.length > 9) v = `${v.slice(0,10)}-${v.slice(10)}`;
                    setNewWalkInPhone(v);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"
                  placeholder="Ex: (11) 99999-9999"
                />
                <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-1 block">
                  Permite que o cliente receba avisos automáticos se habilitado no salão.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                  Serviço Desejado <span className="text-rose-500">*</span>
                </label>
                {(() => {
                  const walkInDisplayServices = (queueSession?.professional?.services && queueSession.professional.services.length > 0)
                    ? queueSession.professional.services
                    : services;
                  return (
                    <select
                      required
                      disabled={isWalkInLoading}
                      value={newWalkInServiceId}
                      onChange={(e) => setNewWalkInServiceId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-semibold cursor-pointer"
                    >
                      <option value="" disabled>Selecione um serviço</option>
                      {walkInDisplayServices.filter((s: any) => s.isActive !== false).map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} - R$ {Number(s.price).toFixed(2).replace('.', ',')} ({s.duration} min)
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => { setIsAddWalkInModalOpen(false); setNewWalkInName(''); setNewWalkInPhone(''); setNewWalkInServiceId(''); }} 
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  disabled={isWalkInLoading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isWalkInLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md transition-colors active:scale-95 border-emerald-600 flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isWalkInLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Adicionando...</span>
                    </>
                  ) : (
                    <span>Adicionar na Fila</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REORDENAR FILA (REORDER) */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-950/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-indigo-500" /> Reordenar Cliente na Fila
              </h2>
              <button 
                onClick={() => { setIsReorderModalOpen(false); setReorderingEntryId(''); }} 
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReorderEntrySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                  Nova Posição na Fila
                </label>
                <select
                  value={reorderingNewPosition}
                  onChange={(e) => setReorderingNewPosition(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                >
                  {Array.from(
                    { length: queueSession?.entries.filter((e: any) => e.status === 'WAITING').length || 1 },
                    (_, idx) => idx + 1
                  ).map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}º da Fila
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                  Motivo da Reordenação
                </label>
                <input
                  type="text"
                  required
                  value={reorderReason}
                  onChange={(e) => setReorderReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  placeholder="Ex: Preferencial / Prioridade de atendimento"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Prioridade Preferencial', 'Ajuste de Fluxo', 'Atraso Justificado'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReorderReason(r)}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-gray-600 dark:text-slate-350 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => { setIsReorderModalOpen(false); setReorderingEntryId(''); }} 
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md transition-colors active:scale-95 border-indigo-600"
                >
                  Confirmar Reordenação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BLOQUEIO DE HORÁRIO ADMINISTRATIVO */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock size={20} className="text-primary" /> Bloquear Horário
              </h2>
              <button 
                onClick={() => setIsBlockModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleBlockSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Profissional
                </label>
                <select
                  required
                  value={blockForm.professionalId}
                  onChange={(e) => setBlockForm({ ...blockForm, professionalId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="" disabled>Selecione um profissional</option>
                  {professionals.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.user?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Data do Bloqueio
                </label>
                <input
                  required
                  type="date"
                  min={localToday}
                  value={blockForm.date}
                  onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Horário Início
                  </label>
                  <input
                    required
                    type="time"
                    value={blockForm.startTime}
                    onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Horário Término
                  </label>
                  <input
                    required
                    type="time"
                    value={blockForm.endTime}
                    onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => setIsBlockModalOpen(false)} 
                  className="px-4 py-2 font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/95 text-white px-5 py-2 rounded-lg font-bold shadow-md transition-colors"
                >
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR PRODUTO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package size={20} className="text-amber-500" />
                {editingProduct ? 'Editar Produto' : 'Cadastrar Produto'}
              </h2>
              <button 
                onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Nome do Produto *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Pomada Efeito Matte"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Descrição / Detalhes
                </label>
                <textarea
                  placeholder="Ex: Fixação forte de longa duração"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="29,90"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="12,50"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Qtd. em Estoque
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.stockQuantity}
                    onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Alerta Estoque Baixo
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.minStockAlert}
                    onChange={(e) => setProductForm({ ...productForm, minStockAlert: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }} 
                  className="px-4 py-2 font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg font-bold shadow-md transition-colors"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
