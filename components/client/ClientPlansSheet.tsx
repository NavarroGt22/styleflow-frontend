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
  salonName,
  isDark,
}: {
  open: boolean
  onClose: () => void
  salonId?: string
  salonName?: string
  isDark: boolean
}) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [mine, setMine] = useState<Mine | null>(null)
  const [note, setNote] = useState('')
  const [pix, setPix] = useState<string | null>(null)
  const [pixQr, setPixQr] = useState<string | null>(null)
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null)
  const [paidMessage, setPaidMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !salonId) return
    const token = sessionStorage.getItem('client_token')
    setError('')
    setPix(null)
    setPixQr(null)
    setCardUrl(null)
    setPaidMessage('')
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
    setPixQr(null)
    setCardUrl(null)
    setPaidMessage('')
    setPayingPlanId(planId)
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
      } else {
        const code = String(json.copiaECola || '').trim()
        if (!code) throw new Error('O Mercado Pago não devolveu o código Pix.')
        setPix(code)
        const rawQr = String(json.qrCode || '').trim()
        if (rawQr) {
          setPixQr(rawQr.startsWith('data:') ? rawQr : `data:image/png;base64,${rawQr}`)
        } else {
          try {
            const mod = await import('qrcode')
            const toDataURL = (mod.default?.toDataURL || mod.toDataURL).bind(mod.default || mod)
            setPixQr(await toDataURL(code, { width: 240, margin: 1, errorCorrectionLevel: 'M' }))
          } catch {
            setPixQr(null)
          }
        }
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
      const plan = plans.find((item) => item.id === payingPlanId)
      const vantagens = plan?.items?.length
        ? plan.items.map((item) => `${item.quantity}x ${item.service?.name || 'serviço'}`).join(', ')
        : plan?.name || 'seu plano'
      const house = salonName?.trim() || 'barbearia'
      setPaidMessage(`Parabéns! Você fez uma assinatura na ${house}. Suas vantagens: ${vantagens}.`)
      setPix(null)
      setPixQr(null)
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
        {paidMessage ? (
          <p className="mb-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">
            {paidMessage}
          </p>
        ) : null}
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
                <button type="button" disabled={busy} onClick={() => subscribe(plan.id, 'PIX')} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950">
                  Pagar com Pix
                </button>
                <button type="button" disabled={busy} onClick={() => subscribe(plan.id, 'CARD')} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">
                  Pagar com cartão
                </button>
              </div>
            </article>
          ))}
        </div>
        {pix || cardUrl ? (
          <div className={`mt-4 rounded-2xl border p-3 ${pix ? 'border-emerald-500/50 bg-emerald-950/40' : 'border-amber-400/60 bg-amber-400/15'}`}>
            {pix ? (
              <>
                <p className="text-sm font-bold text-emerald-200">Pix da assinatura</p>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Escaneie o QR ou copie o código. A assinatura só ativa quando o Mercado Pago confirmar.
                </p>
                {pixQr ? (
                  <img src={pixQr} alt="QR Code do Pix" className="mx-auto mt-3 size-52 rounded-2xl bg-white p-2" />
                ) : null}
                <textarea readOnly value={pix} className="mt-3 h-20 w-full rounded-xl bg-black/50 p-2 text-xs text-white" />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pix)
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 2000)
                    } catch {
                      setError('Não foi possível copiar. Selecione o código e copie.')
                    }
                  }}
                  className="mt-2 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950"
                >
                  {copied ? 'Código copiado' : 'Copiar código Pix'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-amber-200">Pagamento no cartão</p>
                <p className="mt-1 text-xs text-amber-100/80">
                  O checkout abre no Mercado Pago. Não é débito automático. Se a página do provedor abrir em branco, a conta da barbearia precisa revisar a configuração do cartão.
                </p>
                <a
                  href={cardUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950"
                >
                  Continuar no cartão
                </a>
              </>
            )}
            <button type="button" disabled={busy} onClick={confirmPayment} className="mt-2 block rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950">
              Já paguei, verificar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
