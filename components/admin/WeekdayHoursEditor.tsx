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

type WeekdayHoursEditorProps = {
  lightMode?: boolean
  brandColor?: string
  dayHours: DayHoursMap
  onChangeDayHours: (next: DayHoursMap) => void
  closedDayMessage: string
  onChangeClosedDayMessage: (value: string) => void
  bookingCalendarMode: 'WEEK' | 'TODAY'
  onChangeBookingCalendarMode: (value: 'WEEK' | 'TODAY') => void
}

function defaultSlot(): { open: string; close: string } {
  return { open: '09:00', close: '18:00' }
}

export default function WeekdayHoursEditor({
  lightMode = false,
  brandColor = '#d5a85c',
  dayHours,
  onChangeDayHours,
  closedDayMessage,
  onChangeClosedDayMessage,
  bookingCalendarMode,
  onChangeBookingCalendarMode,
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
      className={`space-y-5 rounded-2xl border p-5 sm:p-6 ${
        lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
      }`}
    >
      <div>
        <h4 className={`flex items-center gap-2 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
          <CalendarDays className="size-4" style={{ color: brandColor }} />
          Configure o horário de funcionamento
        </h4>
        <p className={`mt-1 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Cada dia pode ter início e fim próprios. Dias desligados mostram a mensagem de folga
          para o cliente.
          {openCount === 0 ? (
            <span className="mt-1 block font-semibold text-amber-500">
              Ative pelo menos um dia para liberar agendamentos.
            </span>
          ) : null}
        </p>
      </div>

      <div className="space-y-3">
        {WEEKDAYS.map((day) => {
          const key = String(day.value)
          const active = Boolean(dayHours[key])
          const slot = dayHours[key] ?? defaultSlot()

          return (
            <div
              key={day.value}
              className={`rounded-xl border px-3 py-3 sm:px-4 ${
                lightMode
                  ? active
                    ? 'border-slate-200 bg-slate-50/80'
                    : 'border-slate-100 bg-slate-50/40 opacity-70'
                  : active
                    ? 'border-slate-600 bg-[#162033]'
                    : 'border-slate-700/80 bg-[#121c2c] opacity-70'
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${
                    lightMode ? 'text-slate-800' : 'text-slate-100'
                  }`}
                >
                  {day.label}
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  aria-label={active ? `${day.label} atendendo` : `${day.label} fechado`}
                  onClick={() => toggleDay(day.value)}
                  className="inline-flex items-center gap-2"
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      active ? 'text-emerald-400' : lightMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {active ? 'Atendendo' : 'Fechado'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`mb-1 block text-[10px] font-semibold uppercase tracking-wide ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Início
                  </label>
                  <input
                    type="time"
                    value={slot.open}
                    disabled={!active}
                    onChange={(e) => updateDay(day.value, 'open', e.target.value)}
                    className={inputClass(lightMode)}
                  />
                </div>
                <div>
                  <label className={`mb-1 block text-[10px] font-semibold uppercase tracking-wide ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Fim
                  </label>
                  <input
                    type="time"
                    value={slot.close}
                    disabled={!active}
                    onChange={(e) => updateDay(day.value, 'close', e.target.value)}
                    className={inputClass(lightMode)}
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
    </div>
  )
}
