'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, CheckCircle, Copy, CreditCard, Loader2, X } from 'lucide-react'
import { secureFetch as fetch } from '@/lib/client/api'
import { apiUrl, wsUrl } from '@/lib/client/config'

export type PendingPaymentInfo = {
  appointmentId: string
  method: 'PIX' | 'CARD'
  qrCode?: string | null
  copiaECola?: string
  paymentUrl?: string
  expiresAt: string
  serviceName: string
  professionalName: string
  date: string
  time: string
  price: number
}

type Props = {
  pending: PendingPaymentInfo
  brand: string
  onPaid: (info: PendingPaymentInfo) => void
  onExpired: () => void
  /** Cancelou o hold e quer escolher Pix / cartão / loja de novo */
  onChangeMethod: () => void
  /** Cancelou o hold e volta ao início do agendamento */
  onAbort: () => void
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00'
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function BookingPaymentPending({
  pending,
  brand,
  onPaid,
  onExpired,
  onChangeMethod,
  onAbort,
}: Props) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(pending.expiresAt).getTime() - Date.now())
  )
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [expired, setExpired] = useState(false)
  const [actionLoading, setActionLoading] = useState<'change' | 'abort' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const expiredFired = useRef(false)
  const paidFired = useRef(false)
  const actionBusyRef = useRef(false)
  const pendingRef = useRef(pending)
  pendingRef.current = pending

  const markPaid = useCallback(() => {
    if (paidFired.current || expiredFired.current || actionBusyRef.current) return
    paidFired.current = true
    setConfirmed(true)
    onPaid(pendingRef.current)
  }, [onPaid])

  const markExpired = useCallback(() => {
    if (expiredFired.current || paidFired.current || actionBusyRef.current) return
    expiredFired.current = true
    setExpired(true)
  }, [])

  const cancelPendingPayment = useCallback(async (): Promise<boolean> => {
    const token = sessionStorage.getItem('client_token')
    if (!token) {
      setActionError('Sua sessão expirou. Entre de novo para continuar.')
      return false
    }
    try {
      const res = await fetch(
        apiUrl(`/appointments/${pending.appointmentId}/cancel-pending-payment`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.code === 'NOT_AWAITING' || res.status === 400) {
          setActionError(
            json.error ||
              'Este pagamento já foi concluído ou não pode mais ser cancelado. Atualize a página.'
          )
          return false
        }
        setActionError(json.error || 'Não foi possível cancelar o pagamento. Tente de novo.')
        return false
      }
      return true
    } catch {
      setActionError('Falha de conexão ao cancelar. Verifique a internet e tente de novo.')
      return false
    }
  }, [pending.appointmentId])

  const handleChangeMethod = async () => {
    if (actionBusyRef.current || confirmed || expired) return
    setActionError(null)
    actionBusyRef.current = true
    setActionLoading('change')
    const ok = await cancelPendingPayment()
    if (!ok) {
      actionBusyRef.current = false
      setActionLoading(null)
      return
    }
    expiredFired.current = true
    onChangeMethod()
  }

  const handleAbort = async () => {
    if (actionBusyRef.current || confirmed || expired) return
    setActionError(null)
    actionBusyRef.current = true
    setActionLoading('abort')
    const ok = await cancelPendingPayment()
    if (!ok) {
      actionBusyRef.current = false
      setActionLoading(null)
      return
    }
    expiredFired.current = true
    onAbort()
  }

  useEffect(() => {
    if (confirmed || expired) return
    const tick = () => {
      const left = new Date(pending.expiresAt).getTime() - Date.now()
      setRemainingMs(Math.max(0, left))
      if (left <= 0) markExpired()
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [pending.expiresAt, markExpired, confirmed, expired])

  // WebSocket + poll 2s — assim que PAID, vira confirmação
  useEffect(() => {
    if (confirmed || expired) return
    const token = sessionStorage.getItem('client_token')
    if (!token) return

    let closed = false
    let ws: WebSocket | null = null

    const poll = async () => {
      if (closed || paidFired.current || expiredFired.current) return
      try {
        const res = await fetch(apiUrl(`/appointments/${pending.appointmentId}/payment-status`), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const json = await res.json()
        const status = String(json.paymentStatus || '').toUpperCase()
        if (status === 'PAID') {
          markPaid()
          return
        }
        if (status === 'EXPIRED') {
          markExpired()
        }
      } catch {
        // rede instável — tenta de novo no próximo ciclo
      }
    }

    poll()
    const pollId = window.setInterval(poll, 2000)

    try {
      ws = new WebSocket(
        wsUrl(
          `/ws/payment?appointmentId=${encodeURIComponent(pending.appointmentId)}&token=${encodeURIComponent(token)}`
        )
      )
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'PAYMENT_PAID' && msg.appointmentId === pending.appointmentId) {
            markPaid()
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // fallback só poll
    }

    return () => {
      closed = true
      window.clearInterval(pollId)
      try {
        ws?.close()
      } catch {
        // ignore
      }
    }
  }, [pending.appointmentId, markPaid, markExpired, confirmed, expired])

  // Cartão: abrir checkout uma vez
  useEffect(() => {
    if (confirmed || expired) return
    if (pending.method !== 'CARD' || !pending.paymentUrl) return
    const opened = window.open(pending.paymentUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      // popup bloqueado — o link na tela resolve
    }
  }, [pending.method, pending.paymentUrl, confirmed, expired])

  const qrSrc = useMemo(() => {
    if (!pending.qrCode) return null
    const raw = pending.qrCode.trim()
    if (raw.startsWith('data:')) return raw
    return `data:image/png;base64,${raw}`
  }, [pending.qrCode])

  const copyPix = async () => {
    if (!pending.copiaECola) return
    try {
      await navigator.clipboard.writeText(pending.copiaECola)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  // Tempo esgotou / pagamento não concluído
  if (expired) {
    return (
      <div className="mx-auto max-w-md animate-fade-in rounded-2xl border border-red-500/30 bg-white p-8 text-center shadow-xl dark:bg-[#1a1816]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 dark:text-red-400">
          <X size={36} strokeWidth={2.5} />
        </div>
        <h2 className="mb-2 text-2xl font-black text-slate-900 dark:text-white">Pagamento expirado</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          O tempo para pagar esgotou ou o pagamento não foi concluído. O horário foi liberado — escolha
          outro horário para agendar de novo.
        </p>
        <button
          type="button"
          onClick={onExpired}
          className="w-full cursor-pointer rounded-xl border-none py-3.5 text-sm font-extrabold text-[#111] shadow-lg transition-all active:scale-95"
          style={{ backgroundColor: brand }}
        >
          Voltar ao agendamento
        </button>
      </div>
    )
  }

  // Mesma tela de "Reserva Confirmada!" do agendamento na loja
  if (confirmed) {
    return (
      <div className="mx-auto max-w-md animate-fade-in rounded-2xl border border-emerald-500/30 bg-white p-8 text-center shadow-xl dark:bg-[#1a1816]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-md animate-bounce dark:text-emerald-400">
          <CheckCircle size={32} />
        </div>
        <h2 className="mb-2 text-2xl font-black text-slate-900 dark:text-white">Reserva Confirmada!</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Pagamento confirmado. Seu horário foi marcado com sucesso.
        </p>

        <div className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left dark:border-white/10 dark:bg-black/30">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="uppercase tracking-wider text-slate-500">Serviço</span>
            <span className="text-slate-800 dark:text-slate-200">{pending.serviceName}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="uppercase tracking-wider text-slate-500">Profissional</span>
            <span className="text-slate-800 dark:text-slate-200">{pending.professionalName}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="uppercase tracking-wider text-slate-500">Data</span>
            <span className="text-slate-800 dark:text-slate-200">
              {new Date(pending.date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="uppercase tracking-wider text-slate-500">Horário</span>
            <span className="text-sm" style={{ color: brand }}>
              {pending.time}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-bold dark:border-white/10">
            <span className="uppercase tracking-wider text-slate-500">Valor</span>
            <span className="text-sm font-black" style={{ color: brand }}>
              R$ {pending.price.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onPaid(pending)}
          className="w-full cursor-pointer rounded-xl border-none py-3.5 text-sm font-extrabold text-[#111] shadow-lg transition-all active:scale-95"
          style={{ backgroundColor: brand }}
        >
          Novo Agendamento
        </button>
      </div>
    )
  }

  const urgent = remainingMs > 0 && remainingMs < 60_000

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-white/10 dark:bg-[#1a1816]">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {pending.method === 'PIX' ? 'Pagamento Pix' : 'Pagamento no cartão'}
        </p>
        <h2 className="mb-1 text-xl font-black text-slate-900 dark:text-white">
          Finalize em {formatCountdown(remainingMs)}
        </h2>
        <p
          className={`mb-5 text-xs font-medium ${
            urgent ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Você tem 30 minutos. Após esse tempo o horário é liberado. Não feche esta tela.
        </p>

        <div className="mb-5 space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-xs dark:border-white/10 dark:bg-black/30">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Serviço</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{pending.serviceName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Quando</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(pending.date + 'T00:00:00').toLocaleDateString('pt-BR')} · {pending.time}
            </span>
          </div>
          <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 dark:border-white/10">
            <span className="text-slate-500">Valor</span>
            <span className="font-black" style={{ color: brand }}>
              R$ {pending.price.toFixed(2)}
            </span>
          </div>
        </div>

        {pending.method === 'PIX' ? (
          <div className="space-y-4">
            {qrSrc ? (
              <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="QR Code Pix" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl bg-slate-100 dark:bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}

            {pending.copiaECola ? (
              <div className="space-y-2 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pix copia e cola
                </p>
                <p className="break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700 dark:border-white/10 dark:bg-black/40 dark:text-slate-300">
                  {pending.copiaECola}
                </p>
                <button
                  type="button"
                  disabled={Boolean(actionLoading)}
                  onClick={copyPix}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#111] transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                  style={{ backgroundColor: brand }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copiado' : 'Copiar código Pix'}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-black/40 dark:text-slate-200">
              <CreditCard size={28} />
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Abra o checkout do Mercado Pago para pagar com crédito ou débito. Assim que o pagamento
              confirmar, seu horário fica reservado.
            </p>
            {pending.paymentUrl ? (
              <a
                href={actionLoading ? undefined : pending.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={Boolean(actionLoading)}
                onClick={(e) => {
                  if (actionLoading) e.preventDefault()
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black uppercase tracking-wide text-[#111] transition active:scale-[0.98] ${
                  actionLoading ? 'pointer-events-none opacity-50' : ''
                }`}
                style={{ backgroundColor: brand }}
              >
                Abrir pagamento
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando link…
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: brand }} />
          Aguardando confirmação do pagamento…
        </div>

        {actionError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-xs font-medium leading-relaxed text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {actionError}
          </div>
        ) : null}

        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={handleChangeMethod}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-transparent py-3 text-sm font-bold text-slate-800 transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-white/15 dark:text-slate-100"
          >
            {actionLoading === 'change' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Liberando…
              </>
            ) : (
              'Trocar forma de pagamento'
            )}
          </button>
          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={handleAbort}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-transparent py-3 text-sm font-bold text-red-600 transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:text-red-400"
          >
            {actionLoading === 'abort' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelando…
              </>
            ) : (
              'Cancelar agendamento'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
