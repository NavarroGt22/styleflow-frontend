'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, Check, Loader2, Scissors, UserRound, X } from 'lucide-react'
import { apiUrl } from '@/lib/client/config'
import { secureFetch as fetch } from '@/lib/client/api'
import { slimSessionUser } from '@/lib/auth'

export type ClientProfileUser = {
  id?: string
  name?: string
  phone?: string
  profileEditedOnce?: boolean
}

type AppointmentItem = {
  id: string
  status: string
  startTime: string
  endTime: string
  quotedPrice?: number | null
  discountAmount?: number | null
  couponId?: string | null
  service?: { name?: string; price?: number } | null
  professionalName?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  brandColor: string
  isDark: boolean
  salonId?: string
  currentUser: ClientProfileUser | null
  onUserUpdated: (user: ClientProfileUser) => void
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
}

function formatPhoneInput(value: string) {
  const digits = onlyDigits(value)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
}

export default function ClientProfileSheet({
  open,
  onClose,
  brandColor,
  isDark,
  salonId,
  currentUser,
  onUserUpdated,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AppointmentItem | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [upcoming, setUpcoming] = useState<AppointmentItem[]>([])
  const [history, setHistory] = useState<AppointmentItem[]>([])
  const [activeToday, setActiveToday] = useState<AppointmentItem | null>(null)
  const [editName, setEditName] = useState(currentUser?.name || '')
  const [editPhone, setEditPhone] = useState(formatPhoneInput(currentUser?.phone || ''))
  const canEditProfile = !currentUser?.profileEditedOnce

  useEffect(() => {
    if (!open) return
    setEditName(currentUser?.name || '')
    setEditPhone(formatPhoneInput(currentUser?.phone || ''))
    setError('')
    setSuccess('')
  }, [open, currentUser?.name, currentUser?.phone, currentUser?.profileEditedOnce])

  useEffect(() => {
    if (!open || !salonId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(apiUrl(`/appointments/me?salonId=${encodeURIComponent(salonId)}`))
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Não foi possível carregar seus cortes.')
        if (cancelled) return
        setUpcoming(Array.isArray(json.upcoming) ? json.upcoming : [])
        setHistory(Array.isArray(json.history) ? json.history : [])
        setActiveToday(json.activeToday || null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar perfil.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, salonId])

  if (!open) return null

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!canEditProfile) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(apiUrl('/auth/client/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          phone: onlyDigits(editPhone),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Não foi possível salvar.')
      const user = (json.user || {}) as ClientProfileUser
      const next = slimSessionUser({
        ...currentUser,
        ...user,
        phone: user.phone || onlyDigits(editPhone),
        profileEditedOnce: true,
      })
      try {
        sessionStorage.setItem('client_user', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      onUserUpdated(next)
      setSuccess('Dados atualizados. Esta foi sua única alteração permitida.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar perfil.')
    } finally {
      setSaving(false)
    }
  }

  // Confirmação dentro do app (window.confirm não aparece de forma confiável em PWA instalado)
  async function handleCancel(appointmentId: string) {
    setCancelTarget(null)
    setCancelingId(appointmentId)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(apiUrl(`/appointments/${appointmentId}/cancel`), { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Não foi possível cancelar.')
      setSuccess(json.message || 'Agendamento cancelado.')
      setUpcoming((list) => list.filter((a) => a.id !== appointmentId))
      setActiveToday((current) => (current?.id === appointmentId ? null : current))
      setHistory((list) => [
        {
          ...(upcoming.find((a) => a.id === appointmentId) ||
            (activeToday?.id === appointmentId ? activeToday : null) || {
              id: appointmentId,
              status: 'CANCELED_BY_CUSTOMER',
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
            }),
          status: 'CANCELED_BY_CUSTOMER',
        },
        ...list,
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao cancelar.')
    } finally {
      setCancelingId(null)
    }
  }

  const card = (item: AppointmentItem, opts?: { allowCancel?: boolean }) => (
    <div
      key={item.id}
      className={`rounded-xl border p-3 ${
        isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {item.service?.name || 'Serviço'}
          </p>
          <p className={`mt-1 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {formatWhen(item.startTime)}
            {item.professionalName ? ` · ${item.professionalName}` : ''}
          </p>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: brandColor }}>
            {item.status === 'COMPLETED'
              ? 'Concluído'
              : item.status.startsWith('CANCELED')
                ? 'Cancelado'
                : item.status === 'NO_SHOW'
                  ? 'Não compareceu'
                  : 'Agendado'}
            {item.quotedPrice != null || item.service?.price != null
              ? ` · R$ ${(item.quotedPrice ?? item.service?.price ?? 0).toFixed(2)}`
              : ''}
          </p>
        </div>
        {opts?.allowCancel ? (
          <button
            type="button"
            disabled={cancelingId === item.id}
            onClick={() => setCancelTarget(item)}
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-300 disabled:opacity-50"
          >
            {cancelingId === item.id ? '...' : 'Desmarcar'}
          </button>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-[81] max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl ${
          isDark ? 'border-white/10 bg-[#15181a] text-slate-100' : 'border-slate-200 bg-white text-slate-900'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border"
              style={{ borderColor: `${brandColor}55`, color: brandColor }}
            >
              <UserRound size={16} />
            </div>
            <div>
              <p className="text-sm font-bold">Meu perfil</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Cortes, agenda e dados
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {success}
          </p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: brandColor }} />
          </div>
        ) : (
          <div className="space-y-5">
            {activeToday ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <CalendarClock size={12} /> Corte de hoje
                </h3>
                {card(activeToday, { allowCancel: true })}
              </section>
            ) : null}

            {upcoming.filter((a) => a.id !== activeToday?.id).length ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <CalendarClock size={12} /> Próximos
                </h3>
                <div className="space-y-2">
                  {upcoming
                    .filter((a) => a.id !== activeToday?.id)
                    .map((item) => card(item, { allowCancel: true }))}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Scissors size={12} /> Cortes feitos
              </h3>
              {history.filter((h) => h.status === 'COMPLETED').length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Nenhum corte concluído ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.filter((h) => h.status === 'COMPLETED').slice(0, 12).map((item) => card(item))}
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Nome e telefone
              </h3>
              {canEditProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <p className={`text-[11px] ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                    Você pode corrigir nome e número <strong>apenas 1 vez</strong>. Depois fica bloqueado.
                  </p>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    minLength={3}
                    placeholder="Seu nome"
                    className={`h-11 w-full rounded-xl border px-3 text-sm outline-none ${
                      isDark
                        ? 'border-white/10 bg-black/30 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhoneInput(e.target.value))}
                    required
                    placeholder="(71) 99999-9999"
                    className={`h-11 w-full rounded-xl border px-3 text-sm outline-none ${
                      isDark
                        ? 'border-white/10 bg-black/30 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-[#111] disabled:opacity-60"
                    style={{ backgroundColor: brandColor }}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salvar alteração única
                  </button>
                </form>
              ) : (
                <div
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    isDark ? 'border-white/10 bg-black/25 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p>
                    <strong>{currentUser?.name}</strong>
                  </p>
                  <p className="mt-1 text-xs opacity-70">{formatPhoneInput(currentUser?.phone || '')}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Nome e telefone já foram alterados uma vez e não podem mudar de novo.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {cancelTarget ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Você tem certeza?"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 cursor-default"
            onClick={() => setCancelTarget(null)}
          />
          <div
            className={`relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
              isDark ? 'border-white/10 bg-[#15181a] text-slate-100' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <p className="text-base font-bold">Você tem certeza?</p>
            <p className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Desmarcar <strong>{cancelTarget.service?.name || 'este corte'}</strong> de{' '}
              <strong>{formatWhen(cancelTarget.startTime)}</strong>
              {cancelTarget.professionalName ? ` com ${cancelTarget.professionalName}` : ''}? O horário ficará vago
              novamente.
              {cancelTarget.couponId
                ? ' O cupom usado neste agendamento será perdido (não poderá reutilizar).'
                : ''}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  isDark ? 'border-white/15 text-slate-200' : 'border-slate-300 text-slate-700'
                }`}
              >
                Manter horário
              </button>
              <button
                type="button"
                onClick={() => handleCancel(cancelTarget.id)}
                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-rose-500"
              >
                Sim, desmarcar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
