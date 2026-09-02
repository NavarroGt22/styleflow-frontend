'use client'

import { useMemo, useState } from 'react'

export type BookingDateTimePickerProps = {
  brandColor?: string
  openWeekdays: number[]
  closedDayMessage?: string | null
  selectedDate: string
  onSelectDate: (date: string) => void
  selectedTime: string
  onSelectTime: (time: string) => void
  timeSlots: Array<{ time: string; available: boolean }>
  loadingSlots?: boolean
  disabled?: boolean
  daysToShow?: number
  /** Mensagem quando o picker está desabilitado (ex.: sem profissional) */
  disabledHint?: string
}

const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const
const MONTH_SHORT = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const

function toLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfLocalToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '').trim()
  if (raw.length !== 6) return hex
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function BookingDateTimePicker({
  brandColor = '#d5a85c',
  openWeekdays,
  closedDayMessage,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  timeSlots,
  loadingSlots = false,
  disabled = false,
  daysToShow = 7,
  disabledHint = 'Selecione o profissional primeiro para ativar o calendário.',
}: BookingDateTimePickerProps) {
  const openSet = useMemo(() => new Set(openWeekdays), [openWeekdays])
  const [closedHint, setClosedHint] = useState<string | null>(null)

  const days = useMemo(() => {
    const start = startOfLocalToday()
    return Array.from({ length: daysToShow }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const value = toLocalYmd(d)
      const weekday = d.getDay()
      const isOpen = openSet.has(weekday)
      return {
        value,
        weekday,
        weekdayLabel: WEEKDAY_SHORT[weekday],
        dayNum: d.getDate(),
        monthLabel: MONTH_SHORT[d.getMonth()],
        isOpen,
      }
    })
  }, [daysToShow, openSet])

  const defaultClosedMsg =
    closedDayMessage ||
    'Neste dia o barbeiro está de folga. Escolha outro dia para o corte.'

  return (
    <div
      className="rounded-xl border border-white/10 bg-[#1a1816] p-4"
      style={{ ['--brand' as string]: brandColor }}
    >
      <style>{`
        .booking-date-strip {
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }
        .booking-date-strip > button {
          scroll-snap-align: start;
        }
        /* Celular: esconde a barra, deslize com o dedo */
        @media (max-width: 767px) {
          .booking-date-strip {
            scrollbar-width: none;
          }
          .booking-date-strip::-webkit-scrollbar {
            display: none;
          }
        }
        /* PC: barra fina visível */
        @media (min-width: 768px) {
          .booking-date-strip {
            scrollbar-width: thin;
            scrollbar-color: ${withAlpha(brandColor, 0.55)} #142035;
          }
          .booking-date-strip::-webkit-scrollbar {
            height: 6px;
          }
          .booking-date-strip::-webkit-scrollbar-track {
            background: #142035;
            border-radius: 999px;
          }
          .booking-date-strip::-webkit-scrollbar-thumb {
            background: ${withAlpha(brandColor, 0.55)};
            border-radius: 999px;
          }
          .booking-date-strip::-webkit-scrollbar-thumb:hover {
            background: ${brandColor};
          }
        }
      `}</style>
      <h3 className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[0.14em] text-slate-400">
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] border text-[9px] font-bold"
          style={{ borderColor: withAlpha(brandColor, 0.55), color: brandColor }}
        >
          3
        </span>
        DATA E HORÁRIO
      </h3>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[8px] font-bold uppercase tracking-wide text-slate-400">
            Escolha a data
          </p>

          <div
            className="booking-date-strip -mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {days.map((day) => {
              const selected = selectedDate === day.value
              const closed = !day.isOpen
              const inactive = disabled || closed

              return (
                <button
                  key={day.value}
                  type="button"
                  disabled={disabled}
                  aria-disabled={inactive}
                  title={closed ? defaultClosedMsg : undefined}
                  onClick={() => {
                    if (disabled) return
                    if (closed) {
                      setClosedHint(defaultClosedMsg)
                      return
                    }
                    setClosedHint(null)
                    onSelectDate(day.value)
                  }}
                  className={`relative flex min-w-[52px] shrink-0 flex-col items-center rounded-xl border px-2.5 py-2.5 transition ${
                    inactive ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'
                  } ${closed && !selected ? 'line-through decoration-slate-500' : ''}`}
                  style={
                    selected && !closed
                      ? {
                          backgroundColor: brandColor,
                          borderColor: brandColor,
                          color: '#111',
                        }
                      : {
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          borderColor: withAlpha(brandColor, 0.35),
                          color: '#e2e8f0',
                        }
                  }
                >
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide"
                    style={{ opacity: selected && !closed ? 0.75 : 0.65 }}
                  >
                    {day.weekdayLabel}
                  </span>
                  <span className="text-lg font-black leading-none">{day.dayNum}</span>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide"
                    style={{ opacity: selected && !closed ? 0.75 : 0.65 }}
                  >
                    {day.monthLabel}
                  </span>
                </button>
              )
            })}
          </div>

          {disabled ? (
            <p className="mt-1.5 text-[10px] font-extrabold text-slate-400">{disabledHint}</p>
          ) : null}

          {closedHint || (selectedDate && !openSet.has(new Date(`${selectedDate}T12:00:00`).getDay()) ? defaultClosedMsg : null) ? (
            <p
              className="mt-2 rounded-lg border px-3 py-2 text-[11px] font-semibold"
              style={{
                borderColor: withAlpha(brandColor, 0.35),
                backgroundColor: withAlpha(brandColor, 0.1),
                color: '#fde68a',
              }}
            >
              {closedHint || defaultClosedMsg}
            </p>
          ) : null}
        </div>

        {!disabled && selectedDate && openSet.has(new Date(`${selectedDate}T12:00:00`).getDay()) ? (
          <div>
            <p className="mb-2 text-[8px] font-bold uppercase tracking-wide text-slate-400">
              Horários disponíveis
            </p>
            {loadingSlots ? (
              <div className="flex justify-center py-6">
                <div
                  className="h-6 w-6 animate-spin rounded-full border-4 border-t-transparent"
                  style={{ borderColor: withAlpha(brandColor, 0.35), borderTopColor: 'transparent' }}
                />
              </div>
            ) : timeSlots.length === 0 ? (
              <p className="text-sm italic text-slate-400">
                Fora do horário de expediente deste profissional.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {timeSlots.map((slot) => {
                  const selected = selectedTime === slot.time
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => onSelectTime(slot.time)}
                      className={`rounded-xl border px-1 py-2 text-xs font-extrabold transition ${
                        !slot.available
                          ? 'cursor-not-allowed border-slate-800 bg-slate-900/60 text-slate-600 line-through'
                          : selected
                            ? 'text-[#111]'
                            : 'bg-black/30 text-slate-200 hover:opacity-90'
                      }`}
                      style={
                        slot.available
                          ? selected
                            ? { backgroundColor: brandColor, borderColor: brandColor }
                            : { borderColor: withAlpha(brandColor, 0.4) }
                          : undefined
                      }
                    >
                      {slot.time}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
