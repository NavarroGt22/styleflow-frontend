'use client'

import { useEffect, useRef, useState } from 'react'
import type { FinancialDailyPoint } from '@/lib/admin/types'

type Props = {
  days: FinancialDailyPoint[]
  lightMode?: boolean
  brandColor?: string
  /** Dia do mês para alinhar o scroll inicial (ex.: 17). Sem valor = primeiro dia. */
  alignToDay?: number | null
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

export default function FinancialDailyChart({
  days,
  lightMode = false,
  brandColor = '#d5a85c',
  alignToDay = null,
}: Props) {
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const alignedKeyRef = useRef<string>('')

  const maxGross = Math.max(...days.map((d) => d.gross), 1)
  const active = days.find((d) => d.day === activeDay) ?? null

  // Toque fora do gráfico fecha o balão (no celular não existe "sair com o mouse")
  useEffect(() => {
    if (activeDay === null) return
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setActiveDay(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [activeDay])

  // No mês corrente, abre já alinhado no dia de hoje. O usuário ainda pode
  // arrastar para a esquerda e ver o histórico desde o dia 1.
  useEffect(() => {
    if (!alignToDay || days.length === 0) return
    const key = `${days[0]?.date ?? ''}:${alignToDay}`
    if (alignedKeyRef.current === key) return
    const scroller = scrollerRef.current
    if (!scroller) return

    const index = days.findIndex((d) => d.day === alignToDay)
    if (index < 0) return

    alignedKeyRef.current = key
    const targetLeft = Math.max(
      0,
      index * (BAR_WIDTH + BAR_GAP) - scroller.clientWidth / 2 + BAR_WIDTH / 2
    )
    requestAnimationFrame(() => {
      scroller.scrollLeft = targetLeft
    })
  }, [days, alignToDay])

  const muted = lightMode ? 'text-slate-500' : 'text-slate-400'
  const emptyBar = lightMode ? '#e2e8f0' : '#334155'

  return (
    <div ref={containerRef} className="relative">
      {/* Altura reservada: o balão não pode empurrar o gráfico ao abrir. */}
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
            Arraste para o lado para ver o mês inteiro.
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
          width={days.length * (BAR_WIDTH + BAR_GAP)}
          height={CHART_HEIGHT + 38}
          className="block"
        >
          {days.map((point, index) => {
            const height = point.gross > 0 ? Math.max((point.gross / maxGross) * CHART_HEIGHT, 6) : 4
            const x = index * (BAR_WIDTH + BAR_GAP)
            const y = CHART_HEIGHT - height
            const selected = activeDay === point.day
            const isToday = alignToDay === point.day
            return (
              <g
                key={point.date}
                className="cursor-pointer"
                onClick={() => setActiveDay(selected ? null : point.day)}
                onMouseEnter={() => setActiveDay(point.day)}
              >
                {/* Área de toque da coluna inteira: em dia zerado a barra tem 4px. */}
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
                  opacity={selected || activeDay === null ? 1 : 0.45}
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
