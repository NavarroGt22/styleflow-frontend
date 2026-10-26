'use client'

import { useEffect, useState } from 'react'
import { apiUrl } from '@/lib/client/config'
import { secureFetch as fetch } from '@/lib/client/api'

const DAY: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sáb' }

type Plan = {
  id: string
  name: string
  description?: string | null
  price: number
  coveredWeekdays: number[]
  items: Array<{ quantity: number; service?: { name?: string } }>
}

type Mine = {
  status: string
  snapshotName: string
  snapshotPrice: number
  snapshotCoveredWeekdays: number[]
  cancelRenewalAt?: string | null
  cycles?: Array<{
    status: string
    startsAt: string
    endsAt: string
    benefits: Array<{ serviceId: string; granted: number; reserved: number; consumed: number; forfeited: number }>
  }>
}

export default function ClientPlansSheet({
  open,
  onClose,
  salonId,
  isDark,
}: {
  open: boolean
  onClose: () => void
  salonId?: string
  isDark: boolean
}) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [mine, setMine] = useState<Mine | null>(null)
  const [note, setNote] = useState('')
  const [pix, setPix] = useState<string | null>(null)
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !salonId) return
    const token = sessionStorage.getItem('client_token')
    setError('')
    setPix(null)
    setCardUrl(null)
    ;(async () => {
      const plansRes = await fetch(apiUrl(`/subscriptions/public/${salonId}/plans`))
      const plansJson = await plansRes.json()
      setPlans(plansJson.plans || [])
      setNote(plansJson.renewal || '')
      if (!token) {
        setMine(null)
        return
      }
      const meRes = await fetch(apiUrl(`/subscriptions/me?salonId=${encodeURIComponent(salonId)}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const meJson = await meRes.json()
      setMine(meJson.subscription || null)
    })().catch(() => setError('Não foi possível carregar os planos.'))
  }, [open, salonId])

  async function subscribe(planId: string, method: 'PIX' | 'CARD') {
    const token = sessionStorage.getItem('client_token')
    if (!token || !salonId) {
      setError('Entre na sua conta para contratar.')
      return
    }
    setBusy(true)
    setError('')
    setPix(null)
    setCardUrl(null)
    try {
      const res = await fetch(apiUrl('/subscriptions/subscribe'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, planId, method }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Não foi possível iniciar o pagamento.')
      setChargeId(json.chargeId || null)
      if (method === 'CARD' && json.paymentUrl) {
        setCardUrl(json.paymentUrl)
        window.open(json.paymentUrl, '_blank', 'noopener,noreferrer')
      } else {
        setPix(json.copiaECola || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao contratar.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmPayment() {
    const token = sessionStorage.getItem('client_token')
    if (!token || !salonId || !chargeId) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(apiUrl(`/subscriptions/charges/${chargeId}/sync`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId }),
      })
      const json = await res.json()
      if (json.status !== 'PAID') {
        setError('O Mercado Pago ainda não confirmou o pagamento.')
        return
      }
      setPix(null)
      setCardUrl(null)
      const meRes = await fetch(apiUrl(`/subscriptions/me?salonId=${encodeURIComponent(salonId)}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const meJson = await meRes.json()
      setMine(meJson.subscription || null)
    } finally {
      setBusy(false)
    }
  }

  async function cancelRenewal() {
    const token = sessionStorage.getItem('client_token')
    if (!token || !salonId) return
    setBusy(true)
    await fetch(apiUrl('/subscriptions/me/cancel-renewal'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ salonId }),
    })
    const meRes = await fetch(apiUrl(`/subscriptions/me?salonId=${encodeURIComponent(salonId)}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
    const meJson = await meRes.json()
    setMine(meJson.subscription || null)
    setBusy(false)
  }

  if (!open) return null
  const cycle = mine?.cycles?.find((item) => item.status === 'OPEN') || mine?.cycles?.[0]

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className={`max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl ${isDark ? 'bg-[#141414] text-white' : 'bg-white text-slate-900'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Assinaturas</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-400">Fechar</button>
        </div>
        <p className="mb-4 text-xs text-slate-400">{note}</p>
        {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
        {mine ? (
          <section className={`mb-4 rounded-2xl border p-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <p className="font-bold">{mine.snapshotName}</p>
            <p className="text-xs text-slate-400">
              {mine.status}
              {mine.cancelRenewalAt ? ' · próximas renovações canceladas' : ''}
              {cycle ? ` · válido até ${new Date(cycle.endsAt).toLocaleString('pt-BR')}` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Dias cobertos: {mine.snapshotCoveredWeekdays.map((day) => DAY[day]).join(', ')}. Nos outros dias o corte sai no valor normal.
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {(cycle?.benefits || []).map((benefit) => (
                <li key={benefit.serviceId}>
                  disponível {benefit.granted - benefit.reserved - benefit.consumed - benefit.forfeited} · reservado {benefit.reserved} · usado {benefit.consumed}
                </li>
              ))}
            </ul>
            {mine.status === 'ACTIVE' && !mine.cancelRenewalAt ? (
              <button type="button" disabled={busy} onClick={cancelRenewal} className="mt-3 text-xs font-semibold text-amber-400">
                Cancelar próximas renovações
              </button>
            ) : null}
          </section>
        ) : null}
        <div className="space-y-3">
          {plans.map((plan) => (
            <article key={plan.id} className={`rounded-2xl border p-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{plan.name}</p>
                  <p className="text-xs text-slate-400">{plan.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {plan.items.map((item) => `${item.quantity}x ${item.service?.name || 'serviço'}`).join(' · ')}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cobre {plan.coveredWeekdays.map((day) => DAY[day]).join(', ')}. Fora desses dias, paga o valor do serviço.
                  </p>
                </div>
                <p className="text-sm font-bold">R$ {Number(plan.price).toFixed(2)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy} onClick={() => subscribe(plan.id, 'PIX')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                  Pagar com Pix
                </button>
                <button type="button" disabled={busy} onClick={() => subscribe(plan.id, 'CARD')} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
                  Pagar com cartão
                </button>
              </div>
            </article>
          ))}
        </div>
        {pix || cardUrl ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/40 p-3">
            <p className="text-xs font-semibold text-emerald-400">
              {pix
                ? 'Pix copia e cola. A assinatura só ativa quando o Mercado Pago confirmar.'
                : 'O cartão abre no Mercado Pago. A assinatura só ativa quando o pagamento for confirmado. Não é débito automático.'}
            </p>
            {pix ? <textarea readOnly value={pix} className="mt-2 h-24 w-full rounded-xl bg-black/30 p-2 text-xs" /> : null}
            {cardUrl ? (
              <a href={cardUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-indigo-400">
                Abrir pagamento no cartão
              </a>
            ) : null}
            <button type="button" disabled={busy} onClick={confirmPayment} className="mt-2 block rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
              Verificar pagamento
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
