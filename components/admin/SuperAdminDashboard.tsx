'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  Users,
} from 'lucide-react'
import { authFetch } from '@/lib/api'
import { clearSession, getSessionUser } from '@/lib/auth'
import {
  BASE_DOMAIN,
  clientPublicUrl,
  ownerAdminUrl,
  resolveAdminLink,
  resolveClientLink,
} from '@/lib/admin/platform-urls'
import {
  TENANT_LEVEL_COLORS,
  TENANT_LEVEL_FEES,
  TENANT_LEVEL_LABELS,
  type TenantLevel,
} from '@/lib/admin/tenant-plans'

type TenantRow = {
  id: string
  name: string
  slug: string
  level: keyof typeof TENANT_LEVEL_LABELS
  monthlyFee: number
  clientDomain: string | null
  adminDomain: string | null
  isActive: boolean
  deletedAt: string | null
  salonsCount: number
  primarySalonSlug: string | null
  owner: { name: string; email: string } | null
  inventoryEnabled?: boolean
  billing: {
    currentDue: number
    currentPaid: number
    currentStatus: string
    dueDate: string | null
    adminLocked: boolean
    totalDue: number
    totalPaid: number
    balance: number
  }
}

type UpcomingDue = {
  tenantId: string
  name: string
  dueDate: string
  status: string
  balance: number
  adminLocked: boolean
}

type DashboardData = {
  summary: {
    totalTenants: number
    activeTenants: number
    totalDueAll: number
    totalPaidAll: number
    totalBalance: number
    lockedTenants?: number
    deletedTenants?: number
  }
  tenants: TenantRow[]
  periodMonth: string
  upcomingDue?: UpcomingDue[]
}

function defaultDueDateInput() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-05`
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
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateBr(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function billingStatusBadge(status: string, locked?: boolean) {
  if (locked || status === 'OVERDUE') return 'bg-red-500/20 text-red-400'
  if (status === 'PAID') return 'bg-emerald-500/20 text-emerald-400'
  if (status === 'PARTIAL') return 'bg-amber-500/20 text-amber-400'
  return 'bg-slate-700 text-slate-300'
}

function billingStatusLabel(status: string, locked?: boolean) {
  if (locked || status === 'OVERDUE') return 'ATRASADO'
  if (status === 'PAID') return 'PAGO'
  if (status === 'PARTIAL') return 'PARCIAL'
  return 'PENDENTE'
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userName, setUserName] = useState('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [copySources, setCopySources] = useState<{ id: string; name: string; slug: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [paymentModal, setPaymentModal] = useState<TenantRow | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState(defaultDueDateInput())
  const [planModal, setPlanModal] = useState<TenantRow | null>(null)
  const [planLevel, setPlanLevel] = useState<TenantLevel>('BASIC')
  const [planMonthlyFee, setPlanMonthlyFee] = useState('')
  const [planDueDate, setPlanDueDate] = useState(defaultDueDateInput())
  const [planInventoryEnabled, setPlanInventoryEnabled] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  useEffect(() => {
    const user = getSessionUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.replace('/login?next=/platform/super')
      return
    }
    setUserName(user.name || '')
    setReady(true)
  }, [router])

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/admin/dashboard')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar dashboard')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  async function loadCopySources() {
    const res = await authFetch('/admin/tenants/copy-sources')
    if (res.ok) setCopySources(await res.json())
  }

  useEffect(() => {
    if (!ready) return
    loadDashboard()
    loadCopySources()
  }, [ready])

  function handleLogout() {
    clearSession()
    router.replace('/login')
  }

  function autoFillDomains(slug: string) {
    const s = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setForm((prev) => ({
      ...prev,
      slug: s,
      clientDomain: '',
      adminDomain: '',
      salonSlug: prev.salonSlug || s,
    }))
  }

  function linkSlug(tenant: TenantRow) {
    return tenant.primarySalonSlug || tenant.slug
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
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
      }

      const res = await authFetch('/admin/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao criar barbearia')

      setShowCreate(false)
      setForm(emptyForm)
      setNotice('Barbearia criada.')
      await loadDashboard()
      await loadCopySources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar')
    } finally {
      setCreating(false)
    }
  }

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault()
    if (!paymentModal) return
    const amount = Number(paymentAmount.replace(',', '.'))
    if (!amount || amount <= 0) return

    try {
      const res = await authFetch(`/admin/tenants/${paymentModal.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amountPaid: amount,
          notes: paymentNotes || undefined,
          dueDate: paymentDueDate || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao registrar pagamento')

      setPaymentModal(null)
      setPaymentAmount('')
      setPaymentNotes('')
      setNotice('Pagamento registrado.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pagamento')
    }
  }

  async function handleConfirmPaid(tenant: TenantRow) {
    try {
      const res = await authFetch(`/admin/tenants/${tenant.id}/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({
          dueDate: tenant.billing.dueDate || undefined,
          notes: 'Confirmado como pago no Super Admin',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao confirmar pagamento')
      setNotice('Pagamento confirmado — painel liberado.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar pagamento')
    }
  }

  async function toggleActive(tenant: TenantRow) {
    const res = await authFetch(`/admin/tenants/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !tenant.isActive }),
    })
    if (res.ok) loadDashboard()
  }

  async function handleSoftDelete(tenant: TenantRow) {
    if (
      !window.confirm(
        `Excluir "${tenant.name}"?\n\nSoft delete: some da lista, mas os dados ficam no banco (você pode restaurar ou apagar no Neon depois).`
      )
    ) {
      return
    }
    try {
      const res = await authFetch(`/admin/tenants/${tenant.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro ao excluir')
      setNotice('Barbearia excluída (soft delete).')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  async function handleRestore(tenant: TenantRow) {
    try {
      const res = await authFetch(`/admin/tenants/${tenant.id}/restore`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro ao restaurar')
      setNotice('Barbearia restaurada.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao restaurar')
    }
  }

  function openPlanModal(tenant: TenantRow) {
    setPlanModal(tenant)
    setPlanLevel(tenant.level as TenantLevel)
    setPlanMonthlyFee(String(tenant.monthlyFee))
    setPlanDueDate(tenant.billing.dueDate || defaultDueDateInput())
    setPlanInventoryEnabled(Boolean(tenant.inventoryEnabled))
  }

  async function handleSavePlan(e: FormEvent) {
    e.preventDefault()
    if (!planModal) return
    setSavingPlan(true)
    try {
      const res = await authFetch(`/admin/tenants/${planModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          level: planLevel,
          monthlyFee: Number(planMonthlyFee.replace(',', '.')),
          dueDate: planDueDate || undefined,
          inventoryEnabled: planInventoryEnabled,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar plano')
      setPlanModal(null)
      setNotice('Plano atualizado.')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar plano')
    } finally {
      setSavingPlan(false)
    }
  }

  if (!ready || (loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Carregando painel master...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold">StyleFlow Master</h1>
              <p className="text-xs text-slate-400">SUPER_ADMIN — {userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800"
              title="Atualizar"
            >
              <RefreshCw size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold hover:bg-indigo-500"
            >
              <Plus size={16} /> Criar barbearia
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/30"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">{error}</div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-300">
            {notice}
          </div>
        ) : null}

        {data ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Building2 size={14} /> Barbearias
                </div>
                <p className="text-3xl font-black">
                  {data.summary.activeTenants}
                  <span className="text-lg font-normal text-slate-500">/{data.summary.totalTenants}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">ativas no sistema</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <DollarSign size={14} /> A receber (total)
                </div>
                <p className="text-3xl font-black text-amber-400">{formatMoney(data.summary.totalBalance)}</p>
                <p className="mt-1 text-xs text-slate-500">período {data.periodMonth} · só contas ativas</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <DollarSign size={14} /> Faturado
                </div>
                <p className="text-3xl font-black text-emerald-400">{formatMoney(data.summary.totalPaidAll)}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Users size={14} /> Contratos
                </div>
                <p className="text-3xl font-black">{formatMoney(data.summary.totalDueAll)}</p>
                <p className="mt-1 text-xs text-slate-500">valor total contratado</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Lock size={14} /> Painéis bloqueados
                </div>
                <p className="text-3xl font-black text-red-400">{data.summary.lockedTenants ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">após vencimento sem pagamento</p>
              </div>
            </div>

            {(data.upcomingDue?.length ?? 0) > 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-400" />
                  <div>
                    <h2 className="font-bold">Próximos vencimentos</h2>
                    <p className="text-xs text-slate-500">
                      No dia seguinte ao vencimento, sem marcar pago, o painel do dono trava
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {data.upcomingDue!.map((item) => (
                    <li
                      key={item.tenantId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-800/50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          Vence {formatDateBr(item.dueDate)} · {formatMoney(item.balance)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${billingStatusBadge(item.status, item.adminLocked)}`}
                        >
                          {billingStatusLabel(item.status, item.adminLocked)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const t = data.tenants.find((x) => x.id === item.tenantId)
                            if (t) handleConfirmPaid(t)
                          }}
                          className="rounded bg-emerald-600/20 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-600/30"
                        >
                          Marcar pago
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
                <div>
                  <h2 className="font-bold">Barbearias cadastradas</h2>
                  <p className="text-xs text-slate-500">
                    Planos, vencimento e cobrança · {data.summary.deletedTenants ?? 0} excluída(s) (soft
                    delete)
                  </p>
                </div>
                <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  Ver excluídas
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-500">
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
                    {data.tenants
                      .filter((t) => (showDeleted ? Boolean(t.deletedAt) : !t.deletedAt))
                      .map((t) => (
                        <tr
                          key={t.id}
                          className={`border-b border-slate-800/80 hover:bg-slate-800/30 ${t.deletedAt ? 'opacity-70' : ''}`}
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold">{t.name}</p>
                            {t.deletedAt ? (
                              <span className="mt-1 inline-block rounded bg-slate-600/40 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                                Excluída
                              </span>
                            ) : null}
                            {!t.isActive && !t.deletedAt ? (
                              <span className="mt-1 inline-block rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                                Inativa
                              </span>
                            ) : null}
                            {t.billing.adminLocked && !t.deletedAt ? (
                              <span className="ml-1 mt-1 inline-block rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                                Painel travado
                              </span>
                            ) : null}
                            <p className="text-xs text-slate-500">{t.owner?.email}</p>
                            <p className="text-xs text-slate-600">{t.salonsCount} unidade(s)</p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-bold ${TENANT_LEVEL_COLORS[t.level]}`}
                            >
                              {TENANT_LEVEL_LABELS[t.level]}
                            </span>
                          </td>
                          <td className="px-5 py-4">{formatMoney(t.monthlyFee)}</td>
                          <td className="whitespace-nowrap px-5 py-4">{formatDateBr(t.billing.dueDate)}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${billingStatusBadge(t.billing.currentStatus, t.billing.adminLocked)}`}
                            >
                              {billingStatusLabel(t.billing.currentStatus, t.billing.adminLocked)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-amber-400">{formatMoney(t.billing.currentDue)}</span>
                            <span className="mx-1 text-slate-600">/</span>
                            <span className="text-emerald-400">{formatMoney(t.billing.currentPaid)}</span>
                          </td>
                          <td className="px-5 py-4 text-amber-400">
                            {t.isActive ? (
                              formatMoney(t.billing.balance)
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="space-y-1 px-5 py-4 text-xs">
                            <a
                              href={resolveClientLink(linkSlug(t), t.clientDomain)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-indigo-400 hover:underline"
                            >
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
                              {t.deletedAt ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestore(t)}
                                  className="inline-flex items-center justify-center gap-1 rounded bg-indigo-600/20 px-2 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30"
                                >
                                  <RotateCcw size={12} /> Restaurar
                                </button>
                              ) : (
                                <>
                                  {t.monthlyFee > 0 && t.billing.currentStatus !== 'PAID' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmPaid(t)}
                                      className="rounded bg-emerald-600/30 px-2 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-600/40"
                                    >
                                      Marcar como pago
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPaymentModal(t)
                                      setPaymentAmount(
                                        String(
                                          Math.max(0, t.billing.currentDue - t.billing.currentPaid) ||
                                            t.monthlyFee
                                        )
                                      )
                                      setPaymentDueDate(t.billing.dueDate || defaultDueDateInput())
                                    }}
                                    className="rounded bg-emerald-600/20 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-600/30"
                                  >
                                    Registrar pagamento
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openPlanModal(t)}
                                    className="rounded bg-violet-600/20 px-2 py-1 text-xs text-violet-400 hover:bg-violet-600/30"
                                  >
                                    Alterar plano
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleActive(t)}
                                    className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600"
                                  >
                                    {t.isActive ? 'Desativar' : 'Ativar'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSoftDelete(t)}
                                    className="inline-flex items-center justify-center gap-1 rounded bg-red-600/20 px-2 py-1 text-xs text-red-400 hover:bg-red-600/30"
                                  >
                                    <Trash2 size={12} /> Excluir
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-1 text-xl font-bold">Criar barbearia</h2>
            <p className="mb-6 text-sm text-slate-400">Conta, domínios, dono e primeira unidade</p>

            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs text-slate-400">Copiar configuração de</label>
                <select
                  value={form.copyFromTenantId}
                  onChange={(e) => setForm({ ...form, copyFromTenantId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                >
                  <option value="">— Nenhuma —</option>
                  {copySources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Nome da conta *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const slug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '')
                    setForm({ ...form, name, slug: form.slug || slug })
                    if (!form.clientDomain) autoFillDomains(slug)
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Slug / subdomínio *</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => autoFillDomains(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
                <p className="mt-0.5 text-[10px] text-slate-600">
                  {form.slug}.{BASE_DOMAIN}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400">Domínio cliente (opcional)</label>
                <input
                  value={form.clientDomain}
                  onChange={(e) => setForm({ ...form, clientDomain: e.target.value })}
                  placeholder="app.suabarbearia.com.br"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
                {form.slug ? (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Na Vercel: {clientPublicUrl(form.salonSlug || form.slug)}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-xs text-slate-400">Domínio admin (opcional)</label>
                <input
                  value={form.adminDomain}
                  onChange={(e) => setForm({ ...form, adminDomain: e.target.value })}
                  placeholder="admin.suabarbearia.com.br"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
                {form.slug ? (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Na Vercel: {ownerAdminUrl(form.salonSlug || form.slug)}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-xs text-slate-400">Domínio raiz (opcional)</label>
                <input
                  value={form.customDomain}
                  onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                  placeholder="barbearia1.com"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Plano *</label>
                <select
                  value={form.level}
                  onChange={(e) => {
                    const level = e.target.value as TenantLevel
                    setForm({ ...form, level, monthlyFee: String(TENANT_LEVEL_FEES[level]) })
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
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
                  value={form.monthlyFee}
                  onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Vencimento do 1º pagamento</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  No dia seguinte, sem marcar pago, o painel do dono trava.
                </p>
              </div>

              <div className="mt-2 border-t border-slate-800 pt-4 md:col-span-2">
                <p className="mb-3 text-xs font-bold uppercase text-slate-500">Dono (OWNER)</p>
              </div>
              <div>
                <label className="text-xs text-slate-400">Nome do dono *</label>
                <input
                  required
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">E-mail *</label>
                <input
                  required
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Senha inicial *</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.ownerPassword}
                  onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Telefone dono</label>
                <input
                  value={form.ownerPhone}
                  onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>

              <div className="mt-2 border-t border-slate-800 pt-4 md:col-span-2">
                <p className="mb-3 text-xs font-bold uppercase text-slate-500">Primeira unidade</p>
              </div>
              <div>
                <label className="text-xs text-slate-400">Nome da unidade *</label>
                <input
                  required
                  value={form.salonName}
                  onChange={(e) => setForm({ ...form, salonName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Slug da unidade</label>
                <input
                  value={form.salonSlug}
                  onChange={(e) => setForm({ ...form, salonSlug: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-400">Telefone da unidade *</label>
                <input
                  required
                  value={form.salonPhone}
                  onChange={(e) => setForm({ ...form, salonPhone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>

              <div className="flex gap-3 pt-4 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-lg border border-slate-700 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-bold disabled:opacity-50"
                >
                  {creating ? 'Criando...' : 'Criar barbearia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {planModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-1 text-lg font-bold">Alterar plano</h2>
            <p className="mb-4 text-sm text-slate-400">{planModal.name}</p>
            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Plano</label>
                <select
                  value={planLevel}
                  onChange={(e) => {
                    const level = e.target.value as TenantLevel
                    setPlanLevel(level)
                    setPlanMonthlyFee(String(TENANT_LEVEL_FEES[level]))
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
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
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Vencimento (mês atual)</label>
                <input
                  type="date"
                  value={planDueDate}
                  onChange={(e) => setPlanDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              {planLevel !== 'PRO' && planLevel !== 'ENTERPRISE' ? (
                <label className="flex items-start gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={planInventoryEnabled}
                    onChange={(e) => setPlanInventoryEnabled(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Add-on estoque (pago à parte). Só este tenant; demais BASIC continuam sem estoque.</span>
                </label>
              ) : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPlanModal(null)}
                  className="flex-1 rounded-lg border border-slate-700 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="flex-1 rounded-lg bg-violet-600 py-2 font-bold disabled:opacity-50"
                >
                  {savingPlan ? 'Salvando...' : 'Salvar plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {paymentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-1 text-lg font-bold">Registrar pagamento</h2>
            <p className="mb-4 text-sm text-slate-400">{paymentModal.name}</p>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Valor recebido (R$)</label>
                <input
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Vencimento</label>
                <input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Observação</label>
                <input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 rounded-lg border border-slate-700 py-2"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-emerald-600 py-2 font-bold">
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
