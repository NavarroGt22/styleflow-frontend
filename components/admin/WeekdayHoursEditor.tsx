'use client'

import { CalendarDays } from 'lucide-react'
import {
  type DayHoursMap,
  legacyRangeFromDayHours,
  openWeekdaysFromDayHours,
} from '@/lib/day-hours'
import { inputClass, labelClass } from './ui/AdminUi'

const WEEKDAYS = [
  { value: 0, label: 'DOMINGO' },
  { value: 1, label: 'SEGUNDA-FEIRA' },
  { value: 2, label: 'TERÇA-FEIRA' },
  { value: 3, label: 'QUARTA-FEIRA' },
  { value: 4, label: 'QUINTA-FEIRA' },
  { value: 5, label: 'SEXTA-FEIRA' },
  { value: 6, label: 'SÁBADO' },
] as const

export const DEFAULT_OPEN_WEEKDAYS = [1, 2, 3, 4, 5, 6]
export const DEFAULT_CLOSED_DAY_MESSAGE =
  'Neste dia o barbeiro está de folga. Escolha outro dia para o corte.'

const SLOT_INTERVALS = [5, 10, 15, 20, 25, 30, 60] as const

export type PrepTimeDraft = {
  id: string
  name: string
  prepMinutes: string
}

type WeekdayHoursEditorProps = {
  lightMode?: boolean
  brandColor?: string
  dayHours: DayHoursMap
  onChangeDayHours: (next: DayHoursMap) => void
  closedDayMessage?: string
  onChangeClosedDayMessage?: (value: string) => void
  bookingCalendarMode: 'WEEK' | 'TODAY'
  onChangeBookingCalendarMode: (value: 'WEEK' | 'TODAY') => void
  /** Grade de início do salão. Ausente na tela do profissional. */
  slotIntervalMinutes?: number
  onChangeSlotIntervalMinutes?: (minutes: number) => void
  /** Preparação de cada barbeiro. Ausente na tela do profissional. */
  prepDrafts?: PrepTimeDraft[]
  onChangePrepMinutes?: (id: string, minutes: string) => void
  /** A mensagem de folga é do salão: não aparece na tela do funcionário. */
  showClosedDayMessage?: boolean
  /** Dentro de outro card (ex.: aba Horário no mobile) — sem borda/fundo duplicados. */
  embedded?: boolean
  title?: string
  description?: string
}

function defaultSlot(): { open: string; close: string } {
  return { open: '09:00', close: '18:00' }
}

export default function WeekdayHoursEditor({
  lightMode = false,
  brandColor = '#d5a85c',
  dayHours,
  onChangeDayHours,
  closedDayMessage = '',
  onChangeClosedDayMessage,
  bookingCalendarMode,
  onChangeBookingCalendarMode,
  showClosedDayMessage = true,
  embedded = false,
  title = 'Configure o horário de funcionamento',
  description = 'Cada dia pode ter início e fim próprios. Dias desligados mostram a mensagem de folga para o cliente.',
  slotIntervalMinutes,
  onChangeSlotIntervalMinutes,
  prepDrafts,
  onChangePrepMinutes,
}: WeekdayHoursEditorProps) {
  function toggleDay(day: number) {
    const key = String(day)
    const next = { ...dayHours }
    if (next[key]) {
      delete next[key]
    } else {
      const range = legacyRangeFromDayHours(dayHours)
      next[key] = { open: range.openTime, close: range.closeTime }
    }
    onChangeDayHours(next)
  }

  function updateDay(day: number, field: 'open' | 'close', value: string) {
    const key = String(day)
    const current = dayHours[key] ?? defaultSlot()
    onChangeDayHours({
      ...dayHours,
      [key]: { ...current, [field]: value },
    })
  }

  const openCount = openWeekdaysFromDayHours(dayHours).length

  return (
    <div
      className={
        embedded
          ? 'space-y-4 sm:space-y-5'
          : `space-y-4 rounded-2xl border p-3 sm:space-y-5 sm:p-6 ${
              lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
            }`
      }
    >
      <div>
        <h4 className={`flex items-center gap-2 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
          <CalendarDays className="size-4" style={{ color: brandColor }} />
          {title}
        </h4>
        <p className={`mt-1 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {description}
          {openCount === 0 ? (
            <span className="mt-1 block font-semibold text-amber-500">
              Ative pelo menos um dia para liberar agendamentos.
            </span>
          ) : null}
        </p>
      </div>

      {onChangeSlotIntervalMinutes || onChangePrepMinutes ? (
        <div
          className={`space-y-4 rounded-xl border p-3 sm:p-4 ${
            lightMode ? 'border-slate-200 bg-slate-50' : 'border-slate-600 bg-[#162033]'
          }`}
        >
          {onChangeSlotIntervalMinutes ? (
            <div>
              <label className={labelClass(lightMode)}>Intervalo entre opções de horário</label>
              <select
                value={SLOT_INTERVALS.includes(slotIntervalMinutes as (typeof SLOT_INTERVALS)[number]) ? slotIntervalMinutes : 30}
                onChange={(e) => onChangeSlotIntervalMinutes(Number(e.target.value))}
                className={inputClass(lightMode)}
              >
                {SLOT_INTERVALS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutos
                  </option>
                ))}
              </select>
              <p className={`mt-1.5 text-xs leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Define os horários de início exibidos ao cliente. A disponibilidade considera a duração completa do atendimento.
              </p>
            </div>
          ) : null}

          {onChangePrepMinutes ? (
            <div className="space-y-3">
              <div>
                <p className={labelClass(lightMode)}>Tempo de preparação após o atendimento</p>
                <p className={`mt-1 text-xs leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Minutos extras depois do serviço, por barbeiro. Zero não acrescenta bloqueio.
                </p>
              </div>
              {prepDrafts && prepDrafts.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {prepDrafts.map((professional) => (
                    <div key={professional.id}>
                      <label className={`mb-1 block text-[10px] font-semibold uppercase tracking-wide ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {professional.name}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="240"
                        inputMode="numeric"
                        value={professional.prepMinutes}
                        onChange={(e) => onChangePrepMinutes(professional.id, e.target.value)}
                        className={inputClass(lightMode)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Cadastre um profissional em Equipe para definir a preparação.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {WEEKDAYS.map((day) => {
          const key = String(day.value)
          const active = Boolean(dayHours[key])
          const slot = dayHours[key] ?? defaultSlot()

          return (
            <div
              key={day.value}
              className={`rounded-xl border px-2.5 py-2.5 sm:px-4 sm:py-3 ${
                lightMode
                  ? active
                    ? 'border-slate-200 bg-slate-50/80'
                    : 'border-slate-100 bg-slate-50/40 opacity-70'
                  : active
                    ? 'border-slate-600 bg-[#162033]'
                    : 'border-slate-700/80 bg-[#121c2c] opacity-70'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3 sm:gap-3">
                <p
                  className={`min-w-0 truncate text-[11px] font-bold uppercase tracking-wide sm:text-xs ${
                    lightMode ? 'text-slate-800' : 'text-slate-100'
                  }`}
                >
                  <span className="sm:hidden">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day.value]}
                  </span>
                  <span className="hidden sm:inline">{day.label}</span>
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  aria-label={active ? `${day.label} atendendo` : `${day.label} fechado`}
                  onClick={() => toggleDay(day.value)}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 sm:gap-2"
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      active ? 'text-emerald-400' : lightMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {active ? 'Aberto' : 'Fechado'}
                  </span>
                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                      active ? 'bg-emerald-500' : lightMode ? 'bg-slate-300' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`size-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
                        active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="min-w-0">
                  <label className={`mb-1 block text-[10px] font-semibold uppercase tracking-wide ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Início
                  </label>
                  <input
                    type="time"
                    value={slot.open}
                    disabled={!active}
                    onChange={(e) => updateDay(day.value, 'open', e.target.value)}
                    className={`${inputClass(lightMode)} w-full min-w-0`}
                  />
                </div>
                <div className="min-w-0">
                  <label className={`mb-1 block text-[10px] font-semibold uppercase tracking-wide ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Fim
                  </label>
                  <input
                    type="time"
                    value={slot.close}
                    disabled={!active}
                    onChange={(e) => updateDay(day.value, 'close', e.target.value)}
                    className={`${inputClass(lightMode)} w-full min-w-0`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <label className={labelClass(lightMode)}>Calendário no app do cliente</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={bookingCalendarMode === 'WEEK'}
            onClick={() => onChangeBookingCalendarMode('WEEK')}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              bookingCalendarMode === 'WEEK'
                ? 'border-transparent text-slate-950 shadow-md'
                : lightMode
                  ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  : 'border-slate-600 bg-slate-800/80 text-slate-300 hover:border-slate-500'
            }`}
            style={bookingCalendarMode === 'WEEK' ? { backgroundColor: brandColor } : undefined}
          >
            <p className="text-xs font-bold uppercase tracking-wide">Semana toda</p>
            <p
              className={`mt-1 text-[11px] leading-snug ${
                bookingCalendarMode === 'WEEK'
                  ? 'text-slate-800/80'
                  : lightMode
                    ? 'text-slate-500'
                    : 'text-slate-400'
              }`}
            >
              Mostra os próximos 7 dias para o cliente escolher.
            </p>
          </button>
          <button
            type="button"
            aria-pressed={bookingCalendarMode === 'TODAY'}
            onClick={() => onChangeBookingCalendarMode('TODAY')}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              bookingCalendarMode === 'TODAY'
                ? 'border-transparent text-slate-950 shadow-md'
                : lightMode
                  ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  : 'border-slate-600 bg-slate-800/80 text-slate-300 hover:border-slate-500'
            }`}
            style={bookingCalendarMode === 'TODAY' ? { backgroundColor: brandColor } : undefined}
          >
            <p className="text-xs font-bold uppercase tracking-wide">Só o dia de hoje</p>
            <p
              className={`mt-1 text-[11px] leading-snug ${
                bookingCalendarMode === 'TODAY'
                  ? 'text-slate-800/80'
                  : lightMode
                    ? 'text-slate-500'
                    : 'text-slate-400'
              }`}
            >
              Ex.: quarta mostra só quarta; amanhã aparece quinta automaticamente.
            </p>
          </button>
        </div>
      </div>

      {showClosedDayMessage && onChangeClosedDayMessage ? (
        <div>
          <label className={labelClass(lightMode)}>Mensagem nos dias de folga</label>
          <textarea
            rows={2}
            value={closedDayMessage}
            onChange={(e) => onChangeClosedDayMessage(e.target.value)}
            placeholder={DEFAULT_CLOSED_DAY_MESSAGE}
            className={`${inputClass(lightMode)} h-auto py-3`}
          />
          <p className={`mt-1 text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Exibida no app do cliente quando o dia escolhido estiver fechado.
          </p>
        </div>
      ) : null}
    </div>
  )
}
