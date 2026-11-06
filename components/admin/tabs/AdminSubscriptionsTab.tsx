'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, Minus, Plus, XCircle } from 'lucide-react'
import { AdminButton, AdminError, AdminLoading, AdminModal, inputClass, labelClass } from '../ui/AdminUi'
import { useConfirm } from '../ui/useConfirm'
import type { AdminTabProps } from '@/lib/admin/types'
import { authFetch } from '@/lib/api'
import { fetchProfessionals, fetchServices } from '@/lib/admin/api'

const WEEKDAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const COMPANION_SERVICE_ID = '__COMPANION__'

type UsagePace = 'FLEXIBLE' | 'ONCE_PER_WEEK'

type Benefit = {
  serviceId: string
  serviceName?: string
  kind?: 'REGULAR' | 'COMPANION' | string
  granted: number
  reserved: number
  consumed: number
  available: number
  forfeited?: number
}

type Plan = {
  id: string
  name: string
  description?: string | null
  price: number
  availability: 'AVAILABLE' | 'UNAVAILABLE'
  coveredWeekdays: number[]
  blockedServiceIds?: string[]
  usagePace?: UsagePace
  allowsCompanionCuts?: boolean
  companionCutsPerCycle?: number
  items: Array<{ serviceId: string; quantity: number; service?: { name?: string } }>
  professionals: Array<{ professionalId: string; professional?: { user?: { name?: string } } }>
}
type Subscriber = {
  id: string
  status: string
  name: string
  price: number
  customer: string
  phone?: string | null
  cancelRenewalAt?: string | null
  paymentStatus?: string | null
  cycleEndsAt?: string | null
  benefits: Benefit[]
}

function benefitLabel(benefit: Pick<Benefit, 'serviceId' | 'serviceName' | 'kind'>) {
  if (benefit.serviceId === COMPANION_SERVICE_ID || benefit.kind === 'COMPANION') return 'Acompanhamento'
  return benefit.serviceName || 'Serviço'
}

function paceLabel(pace?: string | null) {
  return pace === 'ONCE_PER_WEEK'
    ? 'No máximo 1 corte coberto por semana'
    : 'Qualquer dia coberto até acabar o mês'
}

const emptyForm = {
  name: '',
  description: '',
  price: '',
  professionalIds: [] as string[],
  coveredWeekdays: [1, 2, 3, 4, 5],
  blockedServiceIds: [] as string[],
  quantities: {} as Record<string, string>,
  usagePace: 'FLEXIBLE' as UsagePace,
  allowsCompanionCuts: false,
  companionCutsPerCycle: '1',
  applyToActiveSubscribers: true,
}

export default function AdminSubscriptionsTab({ salonId, lightMode = false }: AdminTabProps) {
  const { confirm, confirmDialog } = useConfirm(lightMode)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [services, setServices] = useState<Array<{ id: string; name: string; active: boolean }>>([])
  const [professionals, setProfessionals] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [noShowConsumes, setNoShowConsumes] = useState(false)
  const [view, setView] = useState<'planos' | 'assinantes'>('planos')
  const [adjustTarget, setAdjustTarget] = useState<{
    subscriberId: string
    serviceId: string
    label: string
    delta: 1 | -1
  } | null>(null)
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [adjustError, setAdjustError] = useState('')

  async function load() {
    if (!salonId) return
    setLoading(true)
    setError('')
    try {
      const [manageRes, serviceRows, professionalRows] = await Promise.all([
        authFetch(`/subscriptions/salon/${salonId}/manage`),
        fetchServices(salonId),
        fetchProfessionals(salonId),
      ])
      const manage = await manageRes.json()
      if (!manageRes.ok) throw new Error(manage.error || 'Não foi possível carregar as assinaturas.')
      setPlans(manage.plans || [])
      setSubscribers(manage.subscribers || [])
      setNoShowConsumes(Boolean(manage.noShowConsumes))
      setServices(serviceRows.map((service) => ({ id: service.id, name: service.name, active: service.active !== false })))
      setProfessionals(
        professionalRows.map((professional) => ({
          id: professional.id,
          name: professional.user?.name || 'Profissional',
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      coveredWeekdays: current.coveredWeekdays.includes(day)
        ? current.coveredWeekdays.filter((value) => value !== day)
        : [...current.coveredWeekdays, day],
    }))
  }

  function toggleProfessional(id: string) {
    setForm((current) => ({
      ...current,
      professionalIds: current.professionalIds.includes(id)
        ? current.professionalIds.filter((value) => value !== id)
        : [...current.professionalIds, id],
    }))
  }

  function setServiceIncluded(serviceId: string, included: boolean) {
    setForm((current) => {
      const blocked = new Set(current.blockedServiceIds)
      if (included) blocked.delete(serviceId)
      else blocked.add(serviceId)
      const quantities = { ...current.quantities }
      if (included && (!quantities[serviceId] || Number(quantities[serviceId]) < 1)) {
        quantities[serviceId] = '1'
      }
      return { ...current, blockedServiceIds: [...blocked], quantities }
    })
  }

  function bumpServiceQty(serviceId: string, delta: number) {
    setForm((current) => {
      if (current.blockedServiceIds.includes(serviceId)) return current
      const next = Math.max(1, (Number(current.quantities[serviceId] || '1') || 1) + delta)
      return {
        ...current,
        quantities: { ...current.quantities, [serviceId]: String(next) },
      }
    })
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    const items = services
      .filter((service) => !form.blockedServiceIds.includes(service.id))
      .map((service) => ({
        serviceId: service.id,
        quantity: Number(form.quantities[service.id] || '1'),
      }))
    if (form.name.trim().length < 2) {
      setError('O nome do plano precisa ter pelo menos 2 letras.')
      return
    }
    if (!(Number(form.price) > 0)) {
      setError('Informe um preço maior que zero.')
      return
    }
    if (form.coveredWeekdays.length === 0) {
      setError('Escolha pelo menos um dia coberto.')
      return
    }
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      setError('Cada serviço do plano precisa de pelo menos 1 unidade por mês.')
      return
    }
    if (items.length === 0) {
      setError('Inclua pelo menos um serviço no plano.')
      return
    }
    if (form.professionalIds.length === 0) {
      setError('Selecione pelo menos um profissional habilitado.')
      return
    }
    const companionCutsPerCycle = form.allowsCompanionCuts ? Number(form.companionCutsPerCycle || '0') : 0
    if (
      form.allowsCompanionCuts
      && (!Number.isInteger(companionCutsPerCycle) || companionCutsPerCycle < 1 || companionCutsPerCycle > 100)
    ) {
      setError('Com acompanhamento ligado, a quantidade por ciclo precisa ser de 1 a 100.')
      return
    }

    let applyToActiveSubscribers = true
    if (editingId) {
      const ok = await confirm({
        title: 'Salvar alterações do plano',
        message:
          'Isso atualiza também os assinantes ACTIVE deste plano (saldos do ciclo aberto serão ajustados; cortes já usados/reservados não são apagados).',
        confirmLabel: 'Salvar e atualizar assinantes',
        cancelLabel: 'Cancelar',
      })
      if (!ok) return
      applyToActiveSubscribers = true
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await authFetch(
        editingId
          ? `/subscriptions/salon/${salonId}/plans/${editingId}`
          : `/subscriptions/salon/${salonId}/plans`,
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            price: Number(form.price),
            coveredWeekdays: form.coveredWeekdays,
            blockedServiceIds: form.blockedServiceIds,
            professionalIds: form.professionalIds,
            items,
            usagePace: form.usagePace,
            allowsCompanionCuts: form.allowsCompanionCuts,
            companionCutsPerCycle,
            applyToActiveSubscribers,
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o plano.')
      setForm(emptyForm)
      setEditingId(null)
      setSuccess(
        editingId
          ? 'Plano atualizado e aplicado aos assinantes ativos.'
          : 'Plano criado. Contratos antigos não mudam quando você editar este plano depois.',
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function submitAdjust() {
    if (!salonId || !adjustTarget) return
    if (adjustReason.trim().length < 3) {
      setAdjustError('Informe o motivo do ajuste (mín. 3 letras).')
      return
    }
    setAdjustSaving(true)
    setAdjustError('')
    try {
      const res = await authFetch(
        `/subscriptions/salon/${salonId}/subscribers/${adjustTarget.subscriberId}/adjust`,
        {
          method: 'POST',
          body: JSON.stringify({
            serviceId: adjustTarget.serviceId,
            quantity: adjustTarget.delta,
            reason: adjustReason.trim(),
          }),
        },
      )
      const json = (await res.json().catch(() => ({}))) as { error?: string; benefits?: Benefit[] }
      if (!res.ok) {
        setAdjustError(json.error || 'Não foi possível ajustar.')
        return
      }
      if (Array.isArray(json.benefits)) {
        setSubscribers((current) =>
          current.map((row) =>
            row.id === adjustTarget.subscriberId ? { ...row, benefits: json.benefits! } : row,
          ),
        )
      }
      setAdjustTarget(null)
      setAdjustReason('')
      setSuccess(
        adjustTarget.delta > 0
          ? `+1 em ${adjustTarget.label}.`
          : `−1 em ${adjustTarget.label}.`,
      )
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : 'Não foi possível ajustar.')
    } finally {
      setAdjustSaving(false)
    }
  }

  function startEdit(plan: Plan) {
    const quantities: Record<string, string> = {}
    for (const item of plan.items) quantities[item.serviceId] = String(item.quantity)
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: String(plan.price),
      professionalIds: plan.professionals.map((row) => row.professionalId),
      coveredWeekdays: plan.coveredWeekdays,
      blockedServiceIds: plan.blockedServiceIds || [],
      quantities,
      usagePace: plan.usagePace === 'ONCE_PER_WEEK' ? 'ONCE_PER_WEEK' : 'FLEXIBLE',
      allowsCompanionCuts: Boolean(plan.allowsCompanionCuts),
      companionCutsPerCycle: String(plan.companionCutsPerCycle ?? 0),
      applyToActiveSubscribers: true,
    })
    setError('')
    setSuccess('')
  }

  async function togglePlan(plan: Plan) {
    if (!salonId) return
    await authFetch(`/subscriptions/salon/${salonId}/plans/${plan.id}/availability`, {
      method: 'POST',
      body: JSON.stringify({ available: plan.availability !== 'AVAILABLE' }),
    })
    await load()
  }

  async function saveNoShow(consumes: boolean) {
    if (!salonId) return
    setNoShowConsumes(consumes)
    await authFetch(`/subscriptions/salon/${salonId}/no-show`, {
      method: 'PUT',
      body: JSON.stringify({ consumes }),
    })
  }

  if (loading) return <AdminLoading lightMode={lightMode} />

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-base font-bold sm:text-lg ${lightMode ? 'text-slate-900' : 'text-white'}`}>Assinaturas</h3>
        <p className={`mt-1 text-xs sm:text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Planos de quantidade para os clientes desta barbearia. Não é a mensalidade do MeuCorteJá. A renovação é uma nova cobrança, por Pix ou cartão, confirmada pelo Mercado Pago — não é débito automático.
        </p>
      </div>
      {error ? <AdminError message={error} /> : null}
      {success ? <p className="text-sm font-semibold text-emerald-500">{success}</p> : null}

      <div className="flex gap-2">
        <button type="button" onClick={() => setView('planos')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${view === 'planos' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Planos</button>
        <button type="button" onClick={() => setView('assinantes')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${view === 'assinantes' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Assinantes</button>
      </div>

      <label className={`flex items-center gap-2 text-sm ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
        <input type="checkbox" checked={noShowConsumes} onChange={(e) => saveNoShow(e.target.checked)} />
        Falta do cliente consome o benefício. Desmarcado, a reserva volta se o ciclo ainda estiver aberto.
      </label>

      {view === 'planos' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={handleSave} className={`space-y-3 rounded-2xl border p-4 ${lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'}`}>
            <p className={labelClass(lightMode)}>{editingId ? 'Editar plano' : 'Novo plano'}</p>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome" className={inputClass(lightMode)} />
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição, sem limite de tamanho"
              className={`min-h-28 w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 ${
                lightMode
                  ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                  : 'border-slate-600 bg-[#142035] text-white placeholder:text-slate-500'
              }`}
            />
            <input required type="number" min="1" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Preço do ciclo" className={inputClass(lightMode)} />
            <div>
              <label className={labelClass(lightMode)} htmlFor="plan-usage-pace">
                Uso dos cortes
              </label>
              <select
                id="plan-usage-pace"
                value={form.usagePace}
                onChange={(event) => setForm({
                  ...form,
                  usagePace: event.target.value === 'ONCE_PER_WEEK' ? 'ONCE_PER_WEEK' : 'FLEXIBLE',
                })}
                className={inputClass(lightMode)}
              >
                <option value="FLEXIBLE">Qualquer dia coberto até acabar o mês</option>
                <option value="ONCE_PER_WEEK">No máximo 1 corte coberto por semana</option>
              </select>
            </div>
            <div className={`rounded-xl border p-3 ${lightMode ? 'border-slate-200' : 'border-slate-600'}`}>
              <p className={labelClass(lightMode)}>Cortes com acompanhamento</p>
              <label className={`mt-1 flex items-center justify-between gap-3 text-sm ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                <span>Permitir acompanhante no ciclo</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={form.allowsCompanionCuts}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    setForm((current) => ({
                      ...current,
                      allowsCompanionCuts: enabled,
                      companionCutsPerCycle: enabled
                        ? String(Math.max(1, Number(current.companionCutsPerCycle) || 1))
                        : '0',
                    }))
                  }}
                  className="size-4 accent-indigo-600"
                />
              </label>
              {form.allowsCompanionCuts ? (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Diminuir acompanhamento"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        companionCutsPerCycle: String(
                          Math.max(1, (Number(current.companionCutsPerCycle) || 1) - 1),
                        ),
                      }))
                    }
                    className="grid size-9 place-items-center rounded-lg border border-slate-500/40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-10 text-center text-sm font-bold">
                    {Math.max(1, Number(form.companionCutsPerCycle) || 1)}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar acompanhamento"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        companionCutsPerCycle: String(
                          Math.min(100, (Number(current.companionCutsPerCycle) || 1) + 1),
                        ),
                      }))
                    }
                    className="grid size-9 place-items-center rounded-lg border border-slate-500/40"
                  >
                    <Plus className="size-4" />
                  </button>
                  <span className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    por ciclo
                  </span>
                </div>
              ) : null}
            </div>
            <div>
              <p className={labelClass(lightMode)}>Dias cobertos</p>
              <p className={`mb-2 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>Fora desses dias o cliente paga o valor normal do serviço. Ex.: só de segunda a quinta.</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`rounded-lg px-2 py-1 text-xs font-bold ${form.coveredWeekdays.includes(day.value) ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={labelClass(lightMode)}>Serviços do plano</p>
              <p className={`mb-2 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Marque “Incluir no plano” e ajuste a quantidade com − / +. Desmarcar tira o serviço do plano.
              </p>
              <div className="space-y-2">
                {services.map((service) => {
                  const included = !form.blockedServiceIds.includes(service.id)
                  const qty = Math.max(1, Number(form.quantities[service.id] || '1') || 1)
                  return (
                    <div
                      key={service.id}
                      className={`flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 text-sm ${
                        lightMode ? 'border-slate-200' : 'border-slate-600'
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={(event) => setServiceIncluded(service.id, event.target.checked)}
                        />
                        <span className="truncate">
                          Incluir no plano · {service.name}
                          {service.active ? '' : ' (inativo)'}
                        </span>
                      </label>
                      {included ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Diminuir ${service.name}`}
                            onClick={() => bumpServiceQty(service.id, -1)}
                            className="grid size-8 place-items-center rounded-lg border border-slate-500/40"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="min-w-7 text-center text-xs font-bold">{qty}</span>
                          <button
                            type="button"
                            aria-label={`Aumentar ${service.name}`}
                            onClick={() => bumpServiceQty(service.id, 1)}
                            className="grid size-8 place-items-center rounded-lg border border-slate-500/40"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <p className={labelClass(lightMode)}>Profissionais habilitados</p>
              <div className="space-y-1">
                {professionals.map((professional) => (
                  <label key={professional.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.professionalIds.includes(professional.id)} onChange={() => toggleProfessional(professional.id)} />
                    {professional.name}
                  </label>
                ))}
              </div>
            </div>
            {editingId ? (
              <p className={`text-xs ${lightMode ? 'text-amber-700' : 'text-amber-300'}`}>
                Ao salvar, confirmamos a atualização dos assinantes ACTIVE deste plano.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <AdminButton type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar plano'}
              </AdminButton>
              {editingId ? (
                <AdminButton type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm) }}>
                  Cancelar edição
                </AdminButton>
              ) : null}
            </div>
          </form>
          <div className="space-y-3">
            {plans.length === 0 ? <p className="text-sm text-slate-400">Nenhum plano ainda.</p> : plans.map((plan) => (
              <article key={plan.id} className={`rounded-2xl border p-4 ${lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{plan.name}</p>
                    <p className="text-sm text-slate-400">R$ {Number(plan.price).toFixed(2)} / mês</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(plan)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${
                        lightMode ? 'border-slate-200 text-slate-700' : 'border-slate-600 text-slate-200'
                      }`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlan(plan)}
                      title={plan.availability === 'AVAILABLE' ? 'Clique para indisponibilizar novas contratações' : 'Clique para disponibilizar'}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase transition hover:scale-105 ${
                        plan.availability === 'AVAILABLE'
                          ? lightMode
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : lightMode
                            ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                      }`}
                    >
                      {plan.availability === 'AVAILABLE' ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                      {plan.availability === 'AVAILABLE' ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {plan.items.map((item) => `${item.quantity}x ${item.service?.name || 'serviço'}`).join(' · ')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Dias: {plan.coveredWeekdays.map((day) => WEEKDAYS.find((item) => item.value === day)?.label).filter(Boolean).join(', ')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Uso: {paceLabel(plan.usagePace)}
                  {plan.allowsCompanionCuts
                    ? ` · Acompanhamento: ${plan.companionCutsPerCycle ?? 0}x`
                    : ' · Sem acompanhamento'}
                </p>
                {(plan.blockedServiceIds || []).length > 0 ? (
                  <p className="mt-1 text-xs text-rose-300">
                    Indisponível para assinantes: {(plan.blockedServiceIds || []).map((id) => services.find((service) => service.id === id)?.name || 'serviço').join(', ')}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {subscribers.length === 0 ? <p className="text-sm text-slate-400">Nenhum assinante ainda.</p> : subscribers.map((subscriber) => (
            <article key={subscriber.id} className={`rounded-2xl border p-4 ${lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'}`}>
              <p className={`font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{subscriber.customer}</p>
              <p className="text-sm text-slate-400">{subscriber.name} · {subscriber.status} · pagamento {subscriber.paymentStatus || '—'}</p>
              <p className="mt-1 text-xs text-slate-500">
                {subscriber.cycleEndsAt ? `Ciclo até ${new Date(subscriber.cycleEndsAt).toLocaleString('pt-BR')}` : 'Sem ciclo aberto'}
                {subscriber.cancelRenewalAt ? ' · renovação cancelada' : ''}
              </p>
              <ul className="mt-3 space-y-2">
                {subscriber.benefits.map((benefit) => {
                  const label = benefitLabel(benefit)
                  const isCompanion =
                    benefit.serviceId === COMPANION_SERVICE_ID || benefit.kind === 'COMPANION'
                  return (
                    <li
                      key={benefit.serviceId}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                        lightMode ? 'border-slate-200 text-slate-700' : 'border-slate-600 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {isCompanion ? 'Acompanhamento' : label}
                        </p>
                        <p className={lightMode ? 'text-slate-500' : 'text-slate-400'}>
                          disponível {benefit.available} · reservado {benefit.reserved} · consumido{' '}
                          {benefit.consumed} · concedido {benefit.granted}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustError('')
                            setAdjustReason('')
                            setAdjustTarget({
                              subscriberId: subscriber.id,
                              serviceId: benefit.serviceId,
                              label: isCompanion ? 'Acompanhamento' : label,
                              delta: -1,
                            })
                          }}
                          className="rounded-lg border border-rose-400/40 px-2.5 py-1.5 text-[11px] font-bold text-rose-400"
                        >
                          −1
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustError('')
                            setAdjustReason('')
                            setAdjustTarget({
                              subscriberId: subscriber.id,
                              serviceId: benefit.serviceId,
                              label: isCompanion ? 'Acompanhamento' : label,
                              delta: 1,
                            })
                          }}
                          className="rounded-lg border border-emerald-400/40 px-2.5 py-1.5 text-[11px] font-bold text-emerald-400"
                        >
                          +1
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </article>
          ))}
        </div>
      )}

      {adjustTarget ? (
        <AdminModal
          title={adjustTarget.delta > 0 ? `Adicionar +1 · ${adjustTarget.label}` : `Remover −1 · ${adjustTarget.label}`}
          onClose={() => {
            if (!adjustSaving) {
              setAdjustTarget(null)
              setAdjustReason('')
              setAdjustError('')
            }
          }}
          lightMode={lightMode}
        >
          <div className="space-y-3">
            <p className={`text-sm ${lightMode ? 'text-slate-600' : 'text-slate-300'}`}>
              Informe o motivo do ajuste (obrigatório).
            </p>
            <input
              autoFocus
              value={adjustReason}
              onChange={(event) => setAdjustReason(event.target.value)}
              placeholder="Ex.: cortesia, correção de saldo…"
              className={inputClass(lightMode)}
            />
            {adjustError ? <p className="text-xs font-semibold text-rose-400">{adjustError}</p> : null}
            <div className="flex justify-end gap-2 pt-1">
              <AdminButton
                type="button"
                variant="ghost"
                disabled={adjustSaving}
                onClick={() => {
                  setAdjustTarget(null)
                  setAdjustReason('')
                  setAdjustError('')
                }}
              >
                Cancelar
              </AdminButton>
              <AdminButton type="button" disabled={adjustSaving} onClick={() => void submitAdjust()}>
                {adjustSaving ? 'Salvando...' : 'Confirmar'}
              </AdminButton>
            </div>
          </div>
        </AdminModal>
      ) : null}
      {confirmDialog}
    </div>
  )
}
