'use client'

import { CalendarDays } from 'lucide-react'
import { inputClass, labelClass } from './ui/AdminUi'

const WEEKDAYS = [
  { value: 0, label: 'Dom', full: 'Domingo' },
  { value: 1, label: 'Seg', full: 'Segunda' },
  { value: 2, label: 'Ter', full: 'Terça' },
  { value: 3, label: 'Qua', full: 'Quarta' },
  { value: 4, label: 'Qui', full: 'Quinta' },
  { value: 5, label: 'Sex', full: 'Sexta' },
  { value: 6, label: 'Sáb', full: 'Sábado' },
] as const

export const DEFAULT_OPEN_WEEKDAYS = [1, 2, 3, 4, 5, 6]
export const DEFAULT_CLOSED_DAY_MESSAGE =
  'Neste dia o barbeiro está de folga. Escolha outro dia para o corte.'

type WeekdayHoursEditorProps = {
  lightMode?: boolean
  brandColor?: string
  openWeekdays: number[]
  onToggleDay: (day: number) => void
  openTime: string
  closeTime: string
  onChangeOpenTime: (value: string) => void
  onChangeCloseTime: (value: string) => void
  closedDayMessage: string
  onChangeClosedDayMessage: (value: string) => void
}

export default function WeekdayHoursEditor({
  lightMode = false,
  brandColor = '#d5a85c',
  openWeekdays,
  onToggleDay,
  openTime,
  closeTime,
  onChangeOpenTime,
  onChangeCloseTime,
  closedDayMessage,
  onChangeClosedDayMessage,
}: WeekdayHoursEditorProps) {
  const openSet = new Set(openWeekdays)

  return (
    <div
      className={`space-y-5 rounded-2xl border p-5 sm:p-6 ${
        lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
      }`}
    >
      <div>
        <h4 className={`flex items-center gap-2 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
          <CalendarDays className="size-4" style={{ color: brandColor }} />
          Dias em que o salão atende
        </h4>
        <p className={`mt-1 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Dias marcados liberam agendamento. Dias apagados mostram a mensagem de folga para o cliente.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => {
          const active = openSet.has(day.value)
          return (
            <button
              key={day.value}
              type="button"
              title={day.full}
              aria-pressed={active}
              onClick={() => onToggleDay(day.value)}
              className={`min-w-[3rem] rounded-xl border px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide transition ${
                active
                  ? 'border-transparent text-slate-950 shadow-md'
                  : lightMode
                    ? 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                    : 'border-slate-600 bg-slate-800/80 text-slate-400 hover:border-slate-500'
              }`}
              style={active ? { backgroundColor: brandColor } : undefined}
            >
              {day.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass(lightMode)}>Horário de abertura</label>
          <input
            type="time"
            value={openTime}
            onChange={(e) => onChangeOpenTime(e.target.value)}
            className={inputClass(lightMode)}
          />
        </div>
        <div>
          <label className={labelClass(lightMode)}>Horário de fechamento</label>
          <input
            type="time"
            value={closeTime}
            onChange={(e) => onChangeCloseTime(e.target.value)}
            className={inputClass(lightMode)}
          />
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
