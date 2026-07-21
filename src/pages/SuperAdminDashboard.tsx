import { useEffect, useState } from 'react';
import { toast } from '../lib/toast';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  DollarSign,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Users,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { apiUrl } from '../config/api';
import { BASE_DOMAIN } from '../config/env';
import {
  clientPublicUrl,
  ownerAdminUrl,
  resolveAdminLink,
  resolveClientLink,
} from '../config/platform-urls';
import {
  TENANT_LEVEL_COLORS,
  TENANT_LEVEL_FEES,
  TENANT_LEVEL_LABELS,
  type TenantLevel,
} from '../config/tenant-plans';

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  level: keyof typeof TENANT_LEVEL_LABELS;
  monthlyFee: number;
  clientDomain: string | null;
  adminDomain: string | null;
  isActive: boolean;
  salonsCount: number;
  primarySalonSlug: string | null;
  owner: { name: string; email: string } | null;
  billing: {
    currentDue: number;
    currentPaid: number;
    currentStatus: string;
    dueDate: string | null;
    adminLocked: boolean;
    totalDue: number;
    totalPaid: number;
    balance: number;
  };
};

type UpcomingDue = {
  tenantId: string;
  name: string;
  dueDate: string;
  status: string;
  balance: number;
  adminLocked: boolean;
};

type DashboardData = {
  summary: {
    totalTenants: number;
    activeTenants: number;
    totalDueAll: number;
    totalPaidAll: number;
    totalBalance: number;
    lockedTenants?: number;
  };
  tenants: TenantRow[];
  periodMonth: string;
  upcomingDue?: UpcomingDue[];
};

function defaultDueDateInput() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-05`;
}

const emptyForm = {
  name: '',
  slug: '',
  customDomain: '',
  clientDomain: '',
  adminDomain: '',
  level: 'BASIC' as TenantLevel,
  monthlyFee: '',
  dueDate: defaultDueDateInput(),
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  ownerPhone: '',
  salonName: '',
  salonSlug: '',
  salonPhone: '',
  copyFromTenantId: '',
  primaryColor: '#4f46e5',
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBr(iso: string | null | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function billingStatusBadge(status: string, locked?: boolean) {
  if (locked || status === 'OVERDUE') {
    return 'bg-red-500/20 text-red-400';
  }
  if (status === 'PAID') return 'bg-emerald-500/20 text-emerald-400';
  if (status === 'PARTIAL') return 'bg-amber-500/20 text-amber-400';
  return 'bg-slate-700 text-slate-300';
}

function billingStatusLabel(status: string, locked?: boolean) {
  if (locked || status === 'OVERDUE') return 'ATRASADO';
  if (status === 'PAID') return 'PAGO';
  if (status === 'PARTIAL') return 'PARCIAL';
  return 'PENDENTE';
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [copySources, setCopySources] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [paymentModal, setPaymentModal] = useState<TenantRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState(defaultDueDateInput());
  const [planModal, setPlanModal] = useState<TenantRow | null>(null);
  const [planLevel, setPlanLevel] = useState<TenantLevel>('BASIC');
  const [planMonthlyFee, setPlanMonthlyFee] = useState('');
  const [planDueDate, setPlanDueDate] = useState(defaultDueDateInput());
  const [savingPlan, setSavingPlan] = useState(false);

  const token = sessionStorage.getItem('token');
  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigate('/login');
    }
  }, [navigate, user?.role]);

  const authHeaders = (): HeadersInit => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/admin/dashboard'), { headers: authHeaders() });
      if (!res.ok) throw new Error('Falha ao carregar dashboard');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadCopySources = async () => {
    const res = await fetch(apiUrl('/admin/tenants/copy-sources'), { headers: authHeaders() });
    if (res.ok) setCopySources(await res.json());
  };

  useEffect(() => {
    loadDashboard();
    loadCopySources();
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  const autoFillDomains = (slug: string) => {
    const s = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm((prev) => ({
      ...prev,
      slug: s,
      clientDomain: '',
      adminDomain: '',
      salonSlug: prev.salonSlug || s,
    }));
  };

  const linkSlug = (tenant: TenantRow) => tenant.primarySalonSlug || tenant.slug;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...form,
        customDomain: form.customDomain || null,
        clientDomain: form.clientDomain || null,
        adminDomain: form.adminDomain || null,
        monthlyFee: form.monthlyFee ? Number(form.monthlyFee) : undefined,
        dueDate: form.dueDate || undefined,
        copyFromTenantId: form.copyFromTenantId || undefined,
        salonSlug: form.salonSlug || form.slug,
        salonPhone: form.salonPhone.replace(/\D/g, ''),
        ownerPhone: form.ownerPhone.replace(/\D/g, '') || undefined,
      };

      const res = await fetch(apiUrl('/admin/tenants'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao criar barbearia');

      setShowCreate(false);
      setForm(emptyForm);
      await loadDashboard();
      await loadCopySources();
    } catch (err: any) {
      toast.info(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;
    const amount = Number(paymentAmount.replace(',', '.'));
    if (!amount || amount <= 0) return;

    try {
      const res = await fetch(apiUrl(`/admin/tenants/${paymentModal.id}/payments`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          amountPaid: amount,
          notes: paymentNotes || undefined,
          dueDate: paymentDueDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao registrar pagamento');

      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentNotes('');
      await loadDashboard();
    } catch (err: any) {
      toast.info(err.message);
    }
  };

  const handleConfirmPaid = async (tenant: TenantRow) => {
    try {
      const res = await fetch(apiUrl(`/admin/tenants/${tenant.id}/confirm-payment`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          dueDate: tenant.billing.dueDate || undefined,
          notes: 'Confirmado como pago no Super Admin',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao confirmar pagamento');
      toast.info('Pagamento confirmado — painel liberado.');
      await loadDashboard();
    } catch (err: any) {
      toast.info(err.message);
    }
  };

  const toggleActive = async (tenant: TenantRow) => {
    const res = await fetch(apiUrl(`/admin/tenants/${tenant.id}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    if (res.ok) loadDashboard();
  };

  const openPlanModal = (tenant: TenantRow) => {
    setPlanModal(tenant);
    setPlanLevel(tenant.level as TenantLevel);
    setPlanMonthlyFee(String(tenant.monthlyFee));
    setPlanDueDate(tenant.billing.dueDate || defaultDueDateInput());
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planModal) return;
    setSavingPlan(true);
    try {
      const res = await fetch(apiUrl(`/admin/tenants/${planModal.id}`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          level: planLevel,
          monthlyFee: Number(planMonthlyFee.replace(',', '.')),
          dueDate: planDueDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar plano');
      setPlanModal(null);
      await loadDashboard();
    } catch (err: any) {
      toast.info(err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Carregando painel master...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold">StyleFlow Master</h1>
              <p className="text-xs text-slate-400">SUPER_ADMIN — {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboard}
              className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800"
              title="Atualizar"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold"
            >
              <Plus size={16} /> Criar barbearia
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/30 rounded-lg text-sm">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm">{error}</div>}

        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                  <Building2 size={14} /> Barbearias
                </div>
                <p className="text-3xl font-black">{data.summary.activeTenants}<span className="text-lg text-slate-500 font-normal">/{data.summary.totalTenants}</span></p>
                <p className="text-xs text-slate-500 mt-1">ativas no sistema</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                  <DollarSign size={14} /> A receber (total)
                </div>
                <p className="text-3xl font-black text-amber-400">{formatMoney(data.summary.totalBalance)}</p>
                <p className="text-xs text-slate-500 mt-1">período {data.periodMonth} · só contas ativas</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                  <DollarSign size={14} /> Faturado
                </div>
                <p className="text-3xl font-black text-emerald-400">{formatMoney(data.summary.totalPaidAll)}</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                  <Users size={14} /> Contratos
                </div>
                <p className="text-3xl font-black">{formatMoney(data.summary.totalDueAll)}</p>
                <p className="text-xs text-slate-500 mt-1">valor total contratado</p>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                  <Lock size={14} /> Painéis bloqueados
                </div>
                <p className="text-3xl font-black text-red-400">{data.summary.lockedTenants ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">após vencimento sem pagamento</p>
              </div>
            </div>

            {(data.upcomingDue?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={18} className="text-indigo-400" />
                  <div>
                    <h2 className="font-bold">Próximos vencimentos</h2>
                    <p className="text-xs text-slate-500">No dia seguinte ao vencimento, sem marcar pago, o painel do dono trava</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {data.upcomingDue!.map((item) => (
                    <li
                      key={item.tenantId}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-800"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          Vence {formatDateBr(item.dueDate)} · {formatMoney(item.balance)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${billingStatusBadge(item.status, item.adminLocked)}`}>
                          {billingStatusLabel(item.status, item.adminLocked)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const t = data.tenants.find((x) => x.id === item.tenantId);
                            if (t) handleConfirmPaid(t);
                          }}
                          className="text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                        >
                          Marcar pago
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="font-bold">Barbearias cadastradas</h2>
                <p className="text-xs text-slate-500">Planos, vencimento e cobrança da plataforma</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-800">
                      <th className="px-5 py-3 font-medium">Barbearia</th>
                      <th className="px-5 py-3 font-medium">Plano</th>
                      <th className="px-5 py-3 font-medium">Mensal</th>
                      <th className="px-5 py-3 font-medium">Vencimento</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Mês atual</th>
                      <th className="px-5 py-3 font-medium">Saldo</th>
                      <th className="px-5 py-3 font-medium">Links</th>
                      <th className="px-5 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tenants.map((t) => (
                      <tr key={t.id} className="border-b border-slate-800/80 hover:bg-slate-800/30">
                        <td className="px-5 py-4">
                          <p className="font-semibold">{t.name}</p>
                          {!t.isActive && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                              Inativa
                            </span>
                          )}
                          {t.billing.adminLocked && (
                            <span className="inline-block mt-1 ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                              Painel travado
                            </span>
                          )}
                          <p className="text-xs text-slate-500">{t.owner?.email}</p>
                          <p className="text-xs text-slate-600">{t.salonsCount} unidade(s)</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${TENANT_LEVEL_COLORS[t.level]}`}>
                            {TENANT_LEVEL_LABELS[t.level]}
                          </span>
                        </td>
                        <td className="px-5 py-4">{formatMoney(t.monthlyFee)}</td>
                        <td className="px-5 py-4 whitespace-nowrap">{formatDateBr(t.billing.dueDate)}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${billingStatusBadge(t.billing.currentStatus, t.billing.adminLocked)}`}>
                            {billingStatusLabel(t.billing.currentStatus, t.billing.adminLocked)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-amber-400">{formatMoney(t.billing.currentDue)}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-emerald-400">{formatMoney(t.billing.currentPaid)}</span>
                        </td>
                        <td className="px-5 py-4 text-amber-400">
                          {t.isActive ? formatMoney(t.billing.balance) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-5 py-4 text-xs space-y-1">
                          <a href={resolveClientLink(linkSlug(t), t.clientDomain)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 hover:underline">
                            Cliente <ExternalLink size={10} />
                          </a>
                          <a
                            href={resolveAdminLink(linkSlug(t), t.adminDomain)}
                            target="_blank"
                            rel="noreferrer"
                            title={ownerAdminUrl(linkSlug(t))}
                            className="flex items-center gap-1 text-violet-400 hover:underline"
                          >
                            Admin (dono) <ExternalLink size={10} />
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            {t.monthlyFee > 0 && t.billing.currentStatus !== 'PAID' && (
                              <button
                                onClick={() => handleConfirmPaid(t)}
                                className="text-xs px-2 py-1 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40 font-bold"
                              >
                                Marcar como pago
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setPaymentModal(t);
                                setPaymentAmount(String(Math.max(0, t.billing.currentDue - t.billing.currentPaid) || t.monthlyFee));
                                setPaymentDueDate(t.billing.dueDate || defaultDueDateInput());
                              }}
                              className="text-xs px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                            >
                              Registrar pagamento
                            </button>
                            <button
                              onClick={() => openPlanModal(t)}
                              className="text-xs px-2 py-1 rounded bg-violet-600/20 text-violet-400 hover:bg-violet-600/30"
                            >
                              Alterar plano
                            </button>
                            <button
                              onClick={() => toggleActive(t)}
                              className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                            >
                              {t.isActive ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 my-8">
            <h2 className="text-xl font-bold mb-1">Criar barbearia</h2>
            <p className="text-sm text-slate-400 mb-6">Conta, domínios, dono e primeira unidade</p>

            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-slate-400">Copiar configuração de</label>
                <select
                  value={form.copyFromTenantId}
                  onChange={(e) => setForm({ ...form, copyFromTenantId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
                >
                  <option value="">— Nenhuma —</option>
                  {copySources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Nome da conta *</label>
                <input required value={form.name} onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  setForm({ ...form, name, slug: form.slug || slug });
                  if (!form.clientDomain) autoFillDomains(slug);
                }} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Slug / subdomínio *</label>
                <input required value={form.slug} onChange={(e) => { autoFillDomains(e.target.value); }} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
                <p className="text-[10px] text-slate-600 mt-0.5">{form.slug}.{BASE_DOMAIN}</p>
              </div>

              <div>
                <label className="text-xs text-slate-400">Domínio cliente (opcional — só com domínio próprio)</label>
                <input value={form.clientDomain} onChange={(e) => setForm({ ...form, clientDomain: e.target.value })} placeholder="app.suabarbearia.com.br" className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
                {form.slug && (
                  <p className="text-[10px] text-slate-500 mt-0.5">Na Vercel (sem domínio próprio): {clientPublicUrl(form.salonSlug || form.slug)}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400">Domínio admin (opcional)</label>
                <input value={form.adminDomain} onChange={(e) => setForm({ ...form, adminDomain: e.target.value })} placeholder="admin.suabarbearia.com.br" className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
                {form.slug && (
                  <p className="text-[10px] text-slate-500 mt-0.5">Na Vercel: {ownerAdminUrl(form.salonSlug || form.slug)}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400">Domínio raiz (opcional)</label>
                <input value={form.customDomain} onChange={(e) => setForm({ ...form, customDomain: e.target.value })} placeholder="barbearia1.com" className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Plano *</label>
                <select value={form.level} onChange={(e) => {
                  const level = e.target.value as TenantLevel;
                  setForm({ ...form, level, monthlyFee: String(TENANT_LEVEL_FEES[level]) });
                }} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
                  {Object.entries(TENANT_LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v} — {formatMoney(TENANT_LEVEL_FEES[k as keyof typeof TENANT_LEVEL_FEES])}/mês</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Mensalidade (R$)</label>
                <input value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Vencimento do 1º pagamento</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">No dia seguinte, sem marcar pago, o painel do dono trava.</p>
              </div>

              <div className="md:col-span-2 border-t border-slate-800 pt-4 mt-2">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Dono (OWNER)</p>
              </div>
              <div>
                <label className="text-xs text-slate-400">Nome do dono *</label>
                <input required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-400">E-mail *</label>
                <input required type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Senha inicial *</label>
                <input required type="password" minLength={8} value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Telefone dono</label>
                <input value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>

              <div className="md:col-span-2 border-t border-slate-800 pt-4 mt-2">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Primeira unidade</p>
              </div>
              <div>
                <label className="text-xs text-slate-400">Nome da unidade *</label>
                <input required value={form.salonName} onChange={(e) => setForm({ ...form, salonName: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Slug da unidade</label>
                <input value={form.salonSlug} onChange={(e) => setForm({ ...form, salonSlug: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-400">Telefone da unidade *</label>
                <input required value={form.salonPhone} onChange={(e) => setForm({ ...form, salonPhone: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>

              <div className="md:col-span-2 flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg border border-slate-700">Cancelar</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 rounded-lg bg-indigo-600 font-bold disabled:opacity-50">
                  {creating ? 'Criando...' : 'Criar barbearia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {planModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">Alterar plano</h2>
            <p className="text-sm text-slate-400 mb-4">{planModal.name}</p>
            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Plano</label>
                <select
                  value={planLevel}
                  onChange={(e) => {
                    const level = e.target.value as TenantLevel;
                    setPlanLevel(level);
                    setPlanMonthlyFee(String(TENANT_LEVEL_FEES[level]));
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
                >
                  {Object.entries(TENANT_LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v} — {formatMoney(TENANT_LEVEL_FEES[k as TenantLevel])}/mês
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Mensalidade (R$)</label>
                <input
                  required
                  value={planMonthlyFee}
                  onChange={(e) => setPlanMonthlyFee(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">Você pode ajustar o valor manualmente (desconto, promoção, etc.).</p>
              </div>
              <div>
                <label className="text-xs text-slate-400">Vencimento (mês atual)</label>
                <input
                  type="date"
                  value={planDueDate}
                  onChange={(e) => setPlanDueDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPlanModal(null)} className="flex-1 py-2 rounded-lg border border-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={savingPlan} className="flex-1 py-2 rounded-lg bg-violet-600 font-bold disabled:opacity-50">
                  {savingPlan ? 'Salvando...' : 'Salvar plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">Registrar pagamento</h2>
            <p className="text-sm text-slate-400 mb-4">{paymentModal.name}</p>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Valor recebido (R$)</label>
                <input required value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Vencimento</label>
                <input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Observação</label>
                <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPaymentModal(null)} className="flex-1 py-2 rounded-lg border border-slate-700">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-600 font-bold">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
