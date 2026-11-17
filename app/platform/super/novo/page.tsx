'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, ArrowRight, ArrowUpRight, BarChart3, Bell, Building2,
  CalendarClock, CheckCircle2, ChevronRight, CircleDollarSign, CreditCard,
  ExternalLink, Headphones, LayoutDashboard, LogOut, Menu, Plus,
  RefreshCw, Search, Settings2, ShieldCheck, Users, Wallet, X,
  type LucideIcon,
} from 'lucide-react'
import { authFetch } from '@/lib/api'
import { clearSession, getSessionUser } from '@/lib/auth'
import { isPlatformHost } from '@/lib/client/domains'

type View = 'overview' | 'tenants' | 'finance' | 'crm' | 'reports' | 'support' | 'settings'
type Billing = {
  currentDue: number
  currentPaid: number
  currentStatus: string
  dueDate: string | null
  adminLocked: boolean
  totalDue: number
  totalPaid: number
  balance: number
}
type Tenant = {
  id: string
  name: string
  slug: string
  level: string
  monthlyFee: number
  isActive: boolean
  deletedAt: string | null
  salonsCount: number
  owner: { name: string; email: string } | null
  billing: Billing
}
type Dashboard = {
  periodMonth: string
  summary: {
    totalTenants: number
    activeTenants: number
    totalDueAll: number
    totalPaidAll: number
    totalBalance: number
    lockedTenants?: number
  }
  tenants: Tenant[]
  upcomingDue?: Array<{
    tenantId: string
    name: string
    dueDate: string
    status: string
    balance: number
    adminLocked: boolean
  }>
}

const NAV: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'tenants', label: 'Barbearias', icon: Building2 },
  { id: 'finance', label: 'Financeiro', icon: Wallet },
  { id: 'crm', label: 'CRM de vendas', icon: Users },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'support', label: 'Suporte', icon: Headphones },
  { id: 'settings', label: 'Configurações', icon: Settings2 },
]

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

const dateBR = (date?: string | null) => {
  if (!date) return '—'
  const parts = date.slice(0, 10).split('-')
  return parts.length === 3 ? parts.reverse().join('/') : date
}

const activeTenant = (t: Tenant) => t.isActive && !t.deletedAt

function status(t: Tenant): { label: string; className: string } {
  if (t.deletedAt) return { label: 'Excluída', className: 'bg-slate-500/15 text-slate-400' }
  if (!t.isActive) return { label: 'Inativa', className: 'bg-slate-500/15 text-slate-400' }
  if (t.billing.adminLocked || t.billing.currentStatus === 'OVERDUE')
    return { label: 'Atrasada', className: 'bg-rose-500/15 text-rose-300' }
  if (t.billing.currentStatus === 'PAID')
    return { label: 'Em dia', className: 'bg-emerald-500/15 text-emerald-300' }
  if (t.billing.currentStatus === 'PARTIAL')
    return { label: 'Parcial', className: 'bg-amber-500/15 text-amber-300' }
  return { label: 'Pendente', className: 'bg-amber-500/15 text-amber-300' }
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={'rounded-2xl border border-white/10 bg-[#111827] ' + className}>{children}</section>
}

function Metric({
  label, value, icon: Icon, hint, accent = 'violet',
}: {
  label: string; value: string; icon: LucideIcon; hint: string; accent?: 'violet' | 'green' | 'amber' | 'blue'
}) {
  const tones = {
    violet: 'bg-violet-500/15 text-violet-300',
    green: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
    blue: 'bg-sky-500/15 text-sky-300',
  }
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={'rounded-xl p-2.5 ' + tones[accent]}><Icon size={18}/></span>
      </div>
      <div className="mt-4 break-words text-2xl font-bold tracking-tight text-white xl:text-3xl">{value}</div>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </Panel>
  )
}

function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-5 py-8 text-center">
      <span className="mb-3 rounded-full bg-white/5 p-3"><AlertCircle size={20} className="text-slate-400"/></span>
      <p className="font-semibold text-slate-200">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">{description}</p>
    </div>
  )
}

export default function NovoPainelInternoPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userName, setUserName] = useState('')
  const [view, setView] = useState<View>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [detail, setDetail] = useState<Tenant | null>(null)

  useEffect(() => {
    if (!isPlatformHost(window.location.hostname)) {
      clearSession()
      router.replace('/login')
      return
    }
    const user = getSessionUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.replace('/login?next=/platform/super/novo')
      return
    }
    setUserName(user.name || 'Administrador')
    setReady(true)
  }, [router])

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const response = await authFetch('/admin/dashboard')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar os dados.')
      setDashboard(payload as Dashboard)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao carregar os dados.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (ready) void load(true)
  }, [ready, load])

  const tenants = useMemo(() => dashboard?.tenants || [], [dashboard])
  const active = useMemo(() => tenants.filter(activeTenant), [tenants])
  const mrr = active.reduce((sum, t) => sum + Number(t.monthlyFee || 0), 0)
  const overdue = active.filter(t => t.billing.adminLocked || t.billing.currentStatus === 'OVERDUE')
  const filtered = useMemo(() => tenants.filter(t => {
    const q = search.trim().toLowerCase()
    const matches = !q || [t.name, t.slug, t.owner?.name, t.owner?.email]
      .some(value => (value || '').toLowerCase().includes(q))
    if (!matches) return false
    if (filter === 'active') return activeTenant(t)
    if (filter === 'late') return activeTenant(t) && (t.billing.adminLocked || t.billing.currentStatus === 'OVERDUE')
    if (filter === 'inactive') return !activeTenant(t)
    return true
  }), [tenants, search, filter])

  const plans = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of active) counts.set(t.level, (counts.get(t.level) || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [active])
  const selectedView = NAV.find(item => item.id === view)
  const go = (id: View) => { setView(id); setMobileNav(false); setDetail(null) }
  const legacy = () => router.push('/platform/super')
  const logout = () => { clearSession(); router.replace('/login') }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-[#080C18] text-slate-400">Verificando acesso...</div>
  }

  const header = (title: string, description: string) => (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h2>
      <p className="mt-1.5 text-sm text-slate-400">{description}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080C18] font-sans text-slate-100">
      {mobileNav && <button onClick={() => setMobileNav(false)} aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/70 lg:hidden"/>}
      <aside className={'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0D1423] transition-transform lg:translate-x-0 ' + (mobileNav ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 shadow-lg shadow-violet-950/40"><ShieldCheck size={21} className="text-white"/></div>
            <div><div className="text-base font-extrabold tracking-tight">MeuCorteJá</div><p className="text-[11px] font-medium uppercase tracking-[.18em] text-violet-300">Admin interno</p></div>
          </div>
          <button className="text-slate-400 lg:hidden" aria-label="Fechar menu" onClick={() => setMobileNav(false)}><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Gerenciamento</p>
          <nav className="space-y-1">
            {NAV.map(item => {
              const Icon = item.icon
              return (
                <button key={item.id} onClick={() => go(item.id)}
                  className={'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ' + (view === item.id ? 'bg-violet-600/20 text-violet-200 ring-1 ring-violet-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
                  <Icon size={18}/>{item.label}
                  {view === item.id && <ChevronRight size={16} className="ml-auto"/>}
                </button>
              )
            })}
          </nav>
        </div>
        <div className="space-y-3 border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/[.04] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Acesso Super Admin</div>
            <p className="mt-1 truncate text-xs text-slate-400">{userName}</p>
          </div>
          <button onClick={logout} className="flex w-full items-center gap-2 px-2 py-2 text-sm text-slate-400 hover:text-rose-300"><LogOut size={17}/> Sair da conta</button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-[#080C18]/90 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden" aria-label="Abrir menu"><Menu size={23}/></button>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Plataforma / Gestão</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">{selectedView?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} disabled={refreshing} title="Atualizar dados"
              className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/10 disabled:opacity-50"><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''}/></button>
            <button onClick={legacy} className="hidden items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 sm:inline-flex"><ExternalLink size={16}/> Painel clássico</button>
            <button onClick={legacy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 sm:px-4"><Plus size={17}/><span className="hidden sm:inline">Nova barbearia</span><span className="sm:hidden">Nova</span></button>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] space-y-6 px-5 py-8 md:px-8">
          {error && <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
          {loading && !dashboard ? (
            <div className="flex min-h-[45vh] items-center justify-center text-slate-400">Carregando informações da plataforma...</div>
          ) : (
            <>
              {view === 'overview' && (
                <>
                  {header('Visão geral', 'Acompanhe o desempenho real da plataforma em um só lugar.')}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Barbearias ativas" value={String(active.length)} icon={Building2} hint={String(tenants.length) + ' contas cadastradas'}/>
                    <Metric label="Receita recorrente estimada" value={brl(mrr)} icon={CircleDollarSign} accent="green" hint="Soma das mensalidades ativas; não é valor recebido"/>
                    <Metric label="Valor em aberto" value={brl(dashboard?.summary.totalBalance || 0)} icon={Wallet} accent="amber" hint="Saldo informado pelo backend"/>
                    <Metric label="Cobranças atrasadas" value={String(overdue.length)} icon={CalendarClock} accent="blue" hint="Contas ativas com atraso ou bloqueio"/>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-5">
                    <Panel className="p-6 xl:col-span-3">
                      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Barbearias cadastradas</h3><p className="mt-1 text-sm text-slate-400">Últimas contas cadastradas na plataforma</p></div><button onClick={() => go('tenants')} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300">Ver todas <ArrowRight size={15}/></button></div>
                      {tenants.length ? <div className="divide-y divide-white/10">
                        {tenants.slice(0, 6).map(t => {
                          const st = status(t)
                          return <button key={t.id} onClick={() => setDetail(t)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-white/[.02]">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 font-bold text-violet-300">{t.name.slice(0, 1).toUpperCase()}</div>
                            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.name}</p><p className="truncate text-xs text-slate-500">{t.owner?.email || t.slug}</p></div>
                            <span className={'rounded-full px-2.5 py-1 text-[11px] font-semibold ' + st.className}>{st.label}</span>
                            <ChevronRight size={16} className="hidden text-slate-500 sm:block"/>
                          </button>
                        })}
                      </div> : <Empty title="Nenhuma barbearia cadastrada" description="Quando uma conta for criada, ela será exibida aqui."/>}
                    </Panel>
                    <Panel className="p-6 xl:col-span-2">
                      <h3 className="text-lg font-bold">Distribuição de planos</h3>
                      <p className="mt-1 text-sm text-slate-400">Contas ativas por modalidade</p>
                      <div className="mt-8 space-y-6">
                        {plans.length ? plans.map(([name, count]) => (
                          <div key={name}>
                            <div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-semibold">{name}</span><span className="text-slate-400">{count} {count === 1 ? 'conta' : 'contas'}</span></div>
                            <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400" style={{ width: String(active.length ? count / active.length * 100 : 0) + '%' }}/></div>
                          </div>
                        )) : <Empty title="Sem planos ativos" description="A distribuição aparecerá conforme as barbearias forem ativadas."/>}
                      </div>
                      <div className="mt-8 rounded-xl border border-violet-500/20 bg-violet-500/[.06] p-4 text-sm text-slate-300">
                        <p className="font-semibold text-violet-200">Recebimento acumulado</p>
                        <p className="mt-1 text-2xl font-bold text-white">{brl(dashboard?.summary.totalPaidAll || 0)}</p>
                        <p className="mt-1 text-xs text-slate-400">Total de pagamentos registrado pelo backend; não representa somente este mês.</p>
                      </div>
                    </Panel>
                  </div>

                  <Panel className="p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold">Próximos vencimentos</h3><p className="mt-1 text-sm text-slate-400">Cobranças pendentes do período {dashboard?.periodMonth || 'atual'}</p></div><button onClick={() => go('finance')} className="text-sm font-semibold text-violet-300">Ver financeiro</button></div>
                    {(dashboard?.upcomingDue?.length || 0) ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dashboard?.upcomingDue?.slice(0, 6).map(item => (
                      <div key={item.tenantId} className="rounded-xl border border-white/10 bg-white/[.025] p-4">
                        <p className="truncate font-semibold">{item.name}</p>
                        <div className="mt-3 flex justify-between text-sm text-slate-400"><span>Vence {dateBR(item.dueDate)}</span><span className="font-bold text-amber-300">{brl(item.balance)}</span></div>
                      </div>
                    ))}</div> : <Empty title="Nenhum vencimento pendente" description="Não há cobranças futuras ou pendentes nos dados retornados."/>}
                  </Panel>
                </>
              )}

              {view === 'tenants' && (
                <>
                  {header('Barbearias', 'Consulte todas as contas do MeuCorteJá e os responsáveis por cada estabelecimento.')}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Metric label="Contas cadastradas" value={String(tenants.length)} icon={Building2} hint="Incluindo inativas e excluídas"/>
                    <Metric label="Contas ativas" value={String(active.length)} icon={CheckCircle2} accent="green" hint="Com acesso habilitado"/>
                    <Metric label="Contas com atraso" value={String(overdue.length)} icon={AlertCircle} accent="amber" hint="Ativas com cobrança atrasada"/>
                  </div>
                  <Panel className="overflow-hidden">
                    <div className="flex flex-wrap gap-3 border-b border-white/10 p-5">
                      <label className="flex min-w-[220px] flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3"><Search size={17} className="text-slate-500"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, slug ou e-mail..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"/></label>
                      <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-slate-200"><option value="all">Todos os status</option><option value="active">Ativas</option><option value="late">Atrasadas</option><option value="inactive">Inativas / excluídas</option></select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px] text-left text-sm">
                        <thead className="bg-white/[.025] text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Barbearia</th><th className="px-5 py-4">Plano</th><th className="px-5 py-4">Mensalidade</th><th className="px-5 py-4">Situação</th><th className="px-5 py-4">Vencimento</th><th className="px-5 py-4">Detalhes</th></tr></thead>
                        <tbody className="divide-y divide-white/10">{filtered.map(t => { const st = status(t); return <tr key={t.id} className="hover:bg-white/[.02]"><td className="px-5 py-4"><p className="font-semibold">{t.name}</p><p className="mt-1 text-xs text-slate-500">{t.owner?.email || t.slug}</p></td><td className="px-5 py-4 text-slate-300">{t.level}</td><td className="px-5 py-4 font-semibold">{brl(t.monthlyFee)}</td><td className="px-5 py-4"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + st.className}>{st.label}</span></td><td className="px-5 py-4 text-slate-400">{dateBR(t.billing.dueDate)}</td><td className="px-5 py-4"><button onClick={() => setDetail(t)} className="rounded-lg p-2 text-violet-300 hover:bg-violet-500/10" aria-label={'Ver detalhes de ' + t.name}><ArrowUpRight size={19}/></button></td></tr> })}</tbody>
                      </table>
                    </div>
                    {!filtered.length && <div className="p-5"><Empty title="Nenhum resultado" description="Não encontramos barbearias para a busca e o filtro selecionados."/></div>}
                    <div className="border-t border-white/10 px-5 py-3 text-xs text-slate-500">{filtered.length} de {tenants.length} contas</div>
                  </Panel>
                </>
              )}

              {view === 'finance' && (
                <>
                  {header('Financeiro', 'Mensalidades, cobranças e recebimentos registrados pelo sistema.')}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Mensalidades previstas" value={brl(mrr)} icon={CreditCard} hint="Soma mensal das contas ativas"/>
                    <Metric label="Recebido acumulado" value={brl(dashboard?.summary.totalPaidAll || 0)} icon={CheckCircle2} accent="green" hint="Pagamentos de todos os períodos"/>
                    <Metric label="Saldo em aberto" value={brl(dashboard?.summary.totalBalance || 0)} icon={Wallet} accent="amber" hint="Cobranças não integralmente pagas"/>
                    <Metric label="Em atraso" value={String(overdue.length)} icon={CalendarClock} accent="blue" hint="Contas que exigem atenção"/>
                  </div>
                  <Panel className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-4 p-6"><div><h3 className="text-lg font-bold">Cobranças por barbearia</h3><p className="mt-1 text-sm text-slate-400">Período de referência: {dashboard?.periodMonth || '—'}</p></div><button onClick={legacy} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10">Registrar pagamento <ExternalLink size={15}/></button></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-white/[.025] text-xs uppercase text-slate-500"><tr><th className="px-6 py-4">Barbearia</th><th className="px-6 py-4">Devido no período</th><th className="px-6 py-4">Pago no período</th><th className="px-6 py-4">Saldo total</th><th className="px-6 py-4">Status</th></tr></thead>
                      <tbody className="divide-y divide-white/10">{active.map(t => { const st = status(t); return <tr key={t.id}><td className="px-6 py-4 font-semibold">{t.name}</td><td className="px-6 py-4">{brl(t.billing.currentDue)}</td><td className="px-6 py-4">{brl(t.billing.currentPaid)}</td><td className="px-6 py-4 font-semibold text-amber-300">{brl(t.billing.balance)}</td><td className="px-6 py-4"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + st.className}>{st.label}</span></td></tr> })}</tbody>
                    </table></div>
                    {!active.length && <div className="p-5"><Empty title="Sem contas ativas" description="As cobranças das contas ativas aparecerão nesta lista."/></div>}
                  </Panel>
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/[.06] px-5 py-4 text-sm text-slate-300">
                    <strong className="text-sky-300">Nota sobre lucro:</strong> esta tela mostra apenas cobranças da plataforma. Para calcular lucro líquido, ainda é necessário cadastrar custos (VPS, domínios, serviços e outras despesas) no backend.
                  </div>
                </>
              )}

              {view === 'reports' && (
                <>
                  {header('Relatórios', 'Indicadores extraídos das contas e pagamentos existentes.')}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Total de clientes" value={String(tenants.length)} icon={Users} hint="Contas cadastradas"/>
                    <Metric label="Ativos" value={String(active.length)} icon={CheckCircle2} accent="green" hint="Clientes operacionais"/>
                    <Metric label="Inativos / excluídos" value={String(tenants.length - active.length)} icon={AlertCircle} accent="amber" hint="Não entram no MRR"/>
                    <Metric label="MRR estimado" value={brl(mrr)} icon={CircleDollarSign} accent="blue" hint="Não inclui pagamentos avulsos"/>
                  </div>
                  <Panel className="p-6"><h3 className="mb-5 text-lg font-bold">Composição da base de clientes</h3><div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-emerald-500/[.07] p-5"><p className="text-sm text-emerald-300">Ativos</p><p className="mt-2 text-4xl font-bold">{active.length}</p><p className="mt-2 text-sm text-slate-400">{tenants.length ? (active.length / tenants.length * 100).toFixed(1) : '0'}% da base</p></div>
                    <div className="rounded-xl bg-slate-500/[.07] p-5"><p className="text-sm text-slate-300">Inativos / excluídos</p><p className="mt-2 text-4xl font-bold">{tenants.length - active.length}</p><p className="mt-2 text-sm text-slate-400">Todos os demais cadastros</p></div>
                  </div><p className="mt-5 text-xs text-slate-500">Evolução mensal, churn e conversão de leads exigem histórico agregado e endpoints específicos.</p></Panel>
                </>
              )}

              {view === 'crm' && (
                <>
                  {header('CRM de vendas', 'Espaço preparado para prospectar e acompanhar novas barbearias.')}
                  <Panel className="p-6">
                    <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-violet-500/10 p-3 text-violet-300"><Users size={22}/></div><div><h3 className="font-bold">Pipeline comercial</h3><p className="text-sm text-slate-400">Estrutura visual pronta para a futura integração de leads</p></div></div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      {['Novos leads', 'Primeiro contato', 'Demonstração', 'Negociação', 'Convertidos'].map((title, i) => <div key={title} className="min-h-44 rounded-xl border border-white/10 bg-[#0B1220] p-4"><div className="mb-4 flex items-center justify-between gap-2"><span className="text-sm font-semibold">{title}</span><span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400">—</span></div><div className="h-1.5 rounded-full bg-white/10"><div className={'h-1.5 rounded-full ' + (i === 4 ? 'bg-emerald-500' : 'bg-violet-500')} style={{width: '0%'}}/></div><p className="mt-5 text-xs text-slate-500">Aguardando conexão com o banco de leads</p></div>)}
                    </div>
                  </Panel>
                  <Empty title="CRM ainda não integrado" description="O backend atual do Super Admin não possui endpoints para leads, etapas, tarefas de prospecção e mensagens. Esta tela não inventa contatos: a próxima etapa é criar esses recursos com persistência e permissões próprias."/>
                </>
              )}

              {view === 'support' && (
                <>{header('Suporte', 'Central de atendimento aos estabelecimentos da plataforma.')}<Panel className="p-6"><Empty title="Módulo de chamados a implementar" description="A interface está preparada para tickets com número, estabelecimento, prioridade, responsável, prazo e histórico. É necessária uma API própria antes de habilitar abertura e resposta de chamados."/></Panel></>
              )}

              {view === 'settings' && (
                <>
                  {header('Configurações', 'Preferências e integrações administrativas da plataforma.')}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel className="p-6"><div className="flex items-center gap-3"><Settings2 className="text-violet-300"/><h3 className="text-lg font-bold">Planos e preços</h3></div><p className="mt-3 text-sm leading-relaxed text-slate-400">Os preços ainda são definidos por código no frontend e no backend. Alterações globais de catálogo exigem sincronização das duas configurações para evitar valores divergentes.</p><button onClick={legacy} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-300">Gerenciar planos por cliente <ArrowRight size={16}/></button></Panel>
                    <Panel className="p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-violet-300"/><h3 className="text-lg font-bold">Permissões e segurança</h3></div><p className="mt-3 text-sm leading-relaxed text-slate-400">A página usa o perfil SUPER_ADMIN e o host da plataforma. A API exige JWT e SUPER_ADMIN em todas as rotas administrativas consultadas.</p><p className="mt-4 text-xs text-slate-500">A autorização final ocorre no backend; proteção visual não substitui verificação de permissão.</p></Panel>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button onClick={() => setDetail(null)} aria-label="Fechar detalhes" className="absolute inset-0 bg-black/70"/>
          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-violet-300">Detalhes da conta</p><button onClick={() => setDetail(null)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Fechar"><X size={20}/></button></div>
            <h2 className="mt-7 text-2xl font-bold">{detail.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{detail.slug}</p>
            <div className="mt-6 space-y-1 rounded-xl border border-white/10 p-4 text-sm">
              {[
                ['Status', status(detail).label],
                ['Plano', detail.level],
                ['Mensalidade', brl(detail.monthlyFee)],
                ['Proprietário', detail.owner?.name || '—'],
                ['E-mail', detail.owner?.email || '—'],
                ['Estabelecimentos', String(detail.salonsCount)],
                ['Vencimento', dateBR(detail.billing.dueDate)],
                ['Saldo', brl(detail.billing.balance)],
              ].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-white/5 py-3 last:border-0"><span className="text-slate-400">{label}</span><span className="max-w-[65%] break-words text-right font-semibold">{value}</span></div>)}
            </div>
            <button onClick={legacy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold hover:bg-violet-500">Abrir gestão completa <ArrowUpRight size={17}/></button>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Alteração de plano, bloqueio, exclusão, DNS e registro de pagamentos permanecem no painel clássico nesta primeira versão.</p>
          </aside>
        </div>
      )}
    </div>
  )
}
