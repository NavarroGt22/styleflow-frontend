'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FinancialDailyPoint } from '@/lib/admin/types'

type Props = {
  days: FinancialDailyPoint[]
  lightMode?: boolean
  brandColor?: string
  /** Dia do mês para alinhar o scroll inicial (ex.: 17). Sem valor = primeiro dia. */
  alignToDay?: number | null
  /** Quantos dias à frente do alinhamento entram na janela inicial. */
  daysAhead?: number
}

const BAR_WIDTH = 26
const BAR_GAP = 12
const CHART_HEIGHT = 150
const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function money(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function weekdayOf(ymd: string) {
  return WEEKDAYS[new Date(`${ymd}T12:00:00`).getDay()]
}

function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyPoint(ymd: string): FinancialDailyPoint {
  return {
    day: Number(ymd.slice(8, 10)),
    date: ymd,
    appointments: 0,
    gross: 0,
    net: 0,
    products: 0,
  }
}

/**
 * Mantém o histórico do mês e corta o futuro em "hoje + N dias".
 * Se o horizonte cruzar o mês, completa com dias zerados do mês seguinte.
 */
function buildWindow(days: FinancialDailyPoint[], focusDay: number | null, daysAhead: number) {
  if (!days.length || !focusDay) return days

  const focus = days.find((d) => d.day === focusDay)
  if (!focus) return days

  const horizon = shiftYmd(focus.date, daysAhead)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const result: FinancialDailyPoint[] = days.filter((d) => d.date <= horizon)

  let cursor = days[days.length - 1]?.date ?? focus.date
  while (cursor < horizon) {
    cursor = shiftYmd(cursor, 1)
    if (byDate.has(cursor) || result.some((d) => d.date === cursor)) continue
    result.push(emptyPoint(cursor))
  }

  return result
}

export default function FinancialDailyChart({
  days,
  lightMode = false,
  brandColor = '#d5a85c',
  alignToDay = null,
  daysAhead = 7,
}: Props) {
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const chartDays = useMemo(
    () => buildWindow(days, alignToDay, daysAhead),
    [days, alignToDay, daysAhead],
  )

  const maxGross = Math.max(...chartDays.map((d) => d.gross), 1)
  const active = chartDays.find((d) => d.date === activeDate) ?? null
  const focusDate = alignToDay ? chartDays.find((d) => d.day === alignToDay)?.date ?? null : null
  const monthKey = days[0]?.date?.slice(0, 7) ?? ''

  useEffect(() => {
    if (activeDate === null) return
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setActiveDate(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [activeDate])

  // Abre com o dia atual na esquerda: os 7 dias à frente ficam na viewport.
  // Arrastar para a esquerda revela o início do mês.
  useEffect(() => {
    if (!focusDate || chartDays.length === 0) return
    const scroller = scrollerRef.current
    if (!scroller) return

    let cancelled = false
    let attempts = 0

    const align = () => {
      if (cancelled) return
      attempts += 1
      const target = scroller.querySelector<SVGElement>(`[data-chart-date="${focusDate}"]`)
      if (!target || scroller.clientWidth < 40) {
        if (attempts < 12) window.setTimeout(align, 50)
        return
      }
      target.scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'instant' })
    }

    const id = window.requestAnimationFrame(() => align())
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
    }
  }, [chartDays, focusDate, monthKey])

  const muted = lightMode ? 'text-slate-500' : 'text-slate-400'
  const emptyBar = lightMode ? '#e2e8f0' : '#334155'

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-3 min-h-[104px]">
        {active ? (
          <div
            className={`rounded-xl border px-3 py-2.5 text-xs shadow-lg ${
              lightMode ? 'border-slate-200 bg-white' : 'border-slate-600 bg-[#0f1a2c]'
            }`}
          >
            <p className="font-bold" style={{ color: brandColor }}>
              {weekdayOf(active.date)}, dia {active.day}
            </p>
            <p className={`mt-1 ${muted}`}>
              {active.appointments} atendimento{active.appointments === 1 ? '' : 's'}
            </p>
            <p className={muted}>Bruto: {money(active.gross)}</p>
            <p className="font-semibold text-emerald-500">Líquido: {money(active.net)}</p>
            <p className={muted}>N/P (produtos): {money(active.products)}</p>
          </div>
        ) : (
          <div
            className={`grid min-h-[104px] place-items-center rounded-xl border border-dashed px-3 text-center text-[11px] ${
              lightMode ? 'border-slate-200 text-slate-500' : 'border-slate-700 text-slate-400'
            }`}
          >
            Toque numa barra para ver o resumo do dia.
            <br />
            Arraste para a esquerda para ver o início do mês.
          </div>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 scrollbar-none [-webkit-overflow-scrolling:touch]"
      >
        <svg
          role="img"
          aria-label="Faturamento por dia do mês"
          width={chartDays.length * (BAR_WIDTH + BAR_GAP)}
          height={CHART_HEIGHT + 38}
          className="block"
        >
          {chartDays.map((point, index) => {
            const height = point.gross > 0 ? Math.max((point.gross / maxGross) * CHART_HEIGHT, 6) : 4
            const x = index * (BAR_WIDTH + BAR_GAP)
            const y = CHART_HEIGHT - height
            const selected = activeDate === point.date
            const isToday = focusDate === point.date
            return (
              <g
                key={point.date}
                data-chart-date={point.date}
                data-chart-day={point.day}
                className="cursor-pointer"
                onClick={() => setActiveDate(selected ? null : point.date)}
                onMouseEnter={() => setActiveDate(point.date)}
              >
                <rect
                  x={x - BAR_GAP / 2}
                  y={0}
                  width={BAR_WIDTH + BAR_GAP}
                  height={CHART_HEIGHT + 32}
                  fill="transparent"
                />
                <rect
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={height}
                  rx={6}
                  fill={point.gross > 0 ? brandColor : emptyBar}
                  opacity={selected || activeDate === null ? 1 : 0.45}
                  className="transition-opacity"
                />
                {isToday ? (
                  <rect
                    x={x - 2}
                    y={CHART_HEIGHT + 4}
                    width={BAR_WIDTH + 4}
                    height={2}
                    rx={1}
                    fill={brandColor}
                  />
                ) : null}
                <text
                  x={x + BAR_WIDTH / 2}
                  y={CHART_HEIGHT + 16}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={selected || isToday ? 700 : 500}
                  fill={selected || isToday ? brandColor : lightMode ? '#64748b' : '#94a3b8'}
                >
                  {point.day}
                </text>
                <text
                  x={x + BAR_WIDTH / 2}
                  y={CHART_HEIGHT + 29}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={700}
                  letterSpacing={0.3}
                  fill={selected || isToday ? brandColor : lightMode ? '#94a3b8' : '#64748b'}
                >
                  {weekdayOf(point.date)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
