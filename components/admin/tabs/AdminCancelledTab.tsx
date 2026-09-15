'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarX2, ChevronDown, ChevronLeft, ChevronRight, Scissors, X } from 'lucide-react'
import { AdminError, AdminLoading } from '../ui/AdminUi'
import { fetchCanceledAppointments, fetchProfessionals } from '@/lib/admin/api'
import type { AdminTabProps, Appointment, Professional } from '@/lib/admin/types'

const ALL = '__all__'

function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function longDateLabel(ymd: string): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function originOf(status: string): { label: string; classes: string } {
  if (status === 'CANCELED_BY_CUSTOMER') {
    return { label: 'Cliente cancelou', classes: 'border-amber-500/40 bg-amber-500/10 text-amber-400' }
  }
  if (status === 'NO_SHOW') {
    return { label: 'Não compareceu', classes: 'border-slate-500/40 bg-slate-500/10 text-slate-300' }
  }
  return { label: 'Barbearia cancelou', classes: 'border-rose-500/40 bg-rose-500/10 text-rose-400' }
}

export default function AdminCancelledTab({ salonId, lightMode = false }: AdminTabProps) {
  const [date, setDate] = useState(todayYmd)
  const [professionalId, setProfessionalId] = useState<string>(ALL)
  const [canSelectProfessional, setCanSelectProfessional] = useState(false)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [items, setItems] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = useCallback(async () => {
    if (!salonId) return
    setLoading(true)
    try {
      const result = await fetchCanceledAppointments(salonId, {
        date,
        professionalId: professionalId === ALL ? undefined : professionalId,
      })
      setItems(result.items)
      setCanSelectProfessional(result.canSelectProfessional)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os cancelamentos.')
    } finally {
      setLoading(false)
    }
  }, [salonId, date, professionalId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!salonId || !canSelectProfessional || professionals.length) return
    fetchProfessionals(salonId)
      .then(setProfessionals)
      .catch(() => {
        /* seletor continua só com "Todos" */
      })
  }, [salonId, canSelectProfessional, professionals.length])

  const selectedProfessionalName = useMemo(() => {
    if (professionalId === ALL) return 'Todos os cancelados'
    const found = professionals.find((p) => p.id === professionalId)
    return found?.user?.name || 'Profissional'
  }, [professionalId, professionals])

  const cardBg = lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
  const muted = lightMode ? 'text-slate-500' : 'text-slate-400'
  const title = lightMode ? 'text-slate-900' : 'text-white'
  const isToday = date === todayYmd()

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-5 mt-2 flex flex-col gap-4 sm:mb-8 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Agendamentos</p>
          <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${title}`}>Cancelados</h1>
          <p className={`mt-1 text-sm ${muted}`}>
            Tudo que foi desmarcado {isToday ? 'hoje' : 'no dia escolhido'}, pelo cliente ou pela barbearia.
          </p>
        </div>

        {canSelectProfessional ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={`inline-flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3.5 text-sm font-semibold transition sm:min-w-[240px] ${
              lightMode
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'border-slate-700 bg-[#142035] text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="truncate">{selectedProfessionalName}</span>
            <ChevronDown className="size-4 shrink-0" />
          </button>
        ) : null}
      </div>

      <div className={`mb-4 flex items-center justify-between rounded-xl border px-2 py-2 ${cardBg}`}>
        <button
          type="button"
          aria-label="Dia anterior"
          onClick={() => setDate((d) => shiftYmd(d, -1))}
          className={`grid size-9 place-items-center rounded-lg transition ${
            lightMode ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className={`text-sm font-bold capitalize ${title}`}>{longDateLabel(date)}</p>
          {!isToday ? (
            <button
              type="button"
              onClick={() => setDate(todayYmd())}
              className="text-[11px] font-semibold text-[var(--brand)] underline"
            >
              Voltar para hoje
            </button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Próximo dia"
          disabled={isToday}
          onClick={() => setDate((d) => shiftYmd(d, 1))}
          className={`grid size-9 place-items-center rounded-lg transition disabled:opacity-30 ${
            lightMode ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {error ? (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      ) : null}

      {loading ? (
        <AdminLoading lightMode={lightMode} text="Carregando cancelamentos..." />
      ) : items.length === 0 ? (
        <div className={`rounded-2xl border border-dashed py-14 text-center ${lightMode ? 'border-slate-300' : 'border-slate-600'}`}>
          <CalendarX2 className={`mx-auto mb-3 size-8 ${muted}`} />
          <p className={`text-sm font-bold ${title}`}>Não houve resultados para essa pesquisa.</p>
          <p className={`mx-auto mt-1 max-w-xs text-xs leading-relaxed ${muted}`}>
            Nenhum horário foi desmarcado nesse dia. Escolha outro dia
            {canSelectProfessional ? ' ou outro profissional' : ''} para conferir.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((apt) => {
            const origin = originOf(apt.status)
            const price = apt.quotedPrice ?? apt.service?.price ?? 0
            return (
              <div key={apt.id} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${title}`}>
                      {apt.customer?.user?.name || 'Cliente sem cadastro'}
                    </p>
                    <p className={`mt-1 flex items-center gap-1.5 text-xs ${muted}`}>
                      <Scissors className="size-3.5" />
                      {apt.service?.name || 'Serviço removido'}
                      {apt.professional?.user?.name ? ` · ${apt.professional.user.name}` : ''}
                    </p>
                    {apt.customer?.user?.phone ? (
                      <p className={`mt-1 text-xs ${muted}`}>{apt.customer.user.phone}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-black ${title}`}>{timeLabel(apt.startTime)}</p>
                    <p className="mt-0.5 text-xs font-bold text-[var(--brand)]">
                      R$ {price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <span
                  className={`mt-3 inline-block rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${origin.classes}`}
                >
                  {origin.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {pickerOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setPickerOpen(false)}
          />
          <div
            className={`relative z-[71] max-h-[75vh] w-full overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:max-w-md sm:rounded-2xl ${
              lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-lg font-bold ${title}`}>Profissional</h3>
                <p className={`mt-0.5 text-xs ${muted}`}>Escolha de quem deseja ver os cancelados</p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setPickerOpen(false)}
                className={`grid size-8 place-items-center rounded-lg ${
                  lightMode ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[{ id: ALL, name: 'Todos os cancelados', hint: 'Toda a equipe' }, ...professionals.map((p) => ({
                id: p.id,
                name: p.user?.name || 'Profissional',
                hint: `${p.workStart} - ${p.workEnd}`,
              }))].map((option) => {
                const selected = professionalId === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setProfessionalId(option.id)
                      setPickerOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? 'border-[var(--brand)] bg-[var(--brand)]/10'
                        : lightMode
                          ? 'border-slate-200 hover:bg-slate-50'
                          : 'border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className={`block truncate text-sm font-semibold ${title}`}>{option.name}</span>
                      <span className={`block text-[11px] ${muted}`}>{option.hint}</span>
                    </span>
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                        selected ? 'border-[var(--brand)]' : lightMode ? 'border-slate-300' : 'border-slate-600'
                      }`}
                    >
                      {selected ? <span className="size-2.5 rounded-full bg-[var(--brand)]" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
