'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { AdminButton, AdminError, AdminLoading, inputClass, labelClass } from '../ui/AdminUi'
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

type Plan = {
  id: string
  name: string
  description?: string | null
  price: number
  availability: 'AVAILABLE' | 'UNAVAILABLE'
  coveredWeekdays: number[]
  blockedServiceIds?: string[]
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
  benefits: Array<{ serviceId: string; serviceName?: string; granted: number; reserved: number; consumed: number; available: number }>
}

const emptyForm = {
  name: '',
  description: '',
  price: '',
  professionalIds: [] as string[],
  coveredWeekdays: [1, 2, 3, 4, 5],
  blockedServiceIds: [] as string[],
  quantities: {} as Record<string, string>,
}

export default function AdminSubscriptionsTab({ salonId, lightMode = false }: AdminTabProps) {
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
      setError('Deixe pelo menos um serviço no plano. Os marcados como indisponíveis ficam de fora.')
      return
    }
    if (form.professionalIds.length === 0) {
      setError('Selecione pelo menos um profissional habilitado.')
      return
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
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o plano.')
      setForm(emptyForm)
      setEditingId(null)
      setSuccess(editingId
        ? 'Plano atualizado. Quem já assinou continua com as condições do contrato antigo.'
        : 'Plano criado. Contratos antigos não mudam quando você editar este plano depois.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
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
              <p className={labelClass(lightMode)}>Serviços e unidades por mês</p>
              <p className={`mb-2 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Cada serviço tem a própria quantidade. Ex.: 1 pigmentação e 2 barbas. Marque indisponível para tirar do plano. Um corte não vira barba.
              </p>
              <div className="space-y-2">
                {services.map((service) => {
                  const blocked = form.blockedServiceIds.includes(service.id)
                  return (
                    <div key={service.id} className="flex items-center gap-2 text-sm">
                      <label className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={blocked}
                          onChange={() => setForm((current) => ({
                            ...current,
                            blockedServiceIds: blocked
                              ? current.blockedServiceIds.filter((id) => id !== service.id)
                              : [...current.blockedServiceIds, service.id],
                          }))}
                        />
                        <span className="truncate">{service.name}{service.active ? '' : ' (inativo)'}</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        disabled={blocked}
                        value={form.quantities[service.id] ?? '1'}
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          quantities: { ...current.quantities, [service.id]: event.target.value },
                        }))}
                        aria-label={`Quantidade de ${service.name}`}
                        className={`${inputClass(lightMode)} !w-24 shrink-0 disabled:opacity-40`}
                      />
                    </div>
                  )
                })}
              </div>
              <p className={`mt-1 text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                A caixa marca o serviço como indisponível para quem assina. O número é quantas vezes ele entra no mês.
              </p>
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
            <div className="flex flex-wrap gap-2">
              <AdminButton type="submit" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar plano'}</AdminButton>
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
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {subscriber.benefits.map((benefit) => (
                  <li key={benefit.serviceId}>
                    {benefit.serviceName || 'Serviço'}: disponível {benefit.available} · reservado {benefit.reserved} · consumido {benefit.consumed} · concedido {benefit.granted}
                  </li>
                ))}
              </ul>
              <AdjustForm salonId={salonId} subscriber={subscriber} onDone={load} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function AdjustForm({ salonId, subscriber, onDone }: { salonId: string; subscriber: Subscriber; onDone: () => void }) {
  const [serviceId, setServiceId] = useState(subscriber.benefits[0]?.serviceId || '')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const res = await authFetch(`/subscriptions/salon/${salonId}/subscribers/${subscriber.id}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ serviceId, quantity: Number(quantity), reason }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(json.error || 'Não foi possível ajustar.')
      return
    }
    setReason('')
    onDone()
  }

  if (subscriber.benefits.length === 0) return null
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_90px_1fr_auto]">
      <select className={inputClass(false)} value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
        {subscriber.benefits.map((benefit) => (
          <option key={benefit.serviceId} value={benefit.serviceId}>{benefit.serviceName || 'Serviço'}</option>
        ))}
      </select>
      <input className={inputClass(false)} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      <input className={inputClass(false)} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo do ajuste" required />
      <AdminButton type="submit">Ajustar</AdminButton>
      {error ? <p className="text-xs text-red-400 sm:col-span-4">{error}</p> : null}
    </form>
  )
}
