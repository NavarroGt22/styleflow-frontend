'use client'

import {
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  RefreshCw,
  Scissors,
  ShoppingCart,
  X,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminStat,
  inputClass,
  labelClass,
  sectionClass,
} from '../ui/AdminUi'
import { useConfirm, type ConfirmOptions } from '../ui/useConfirm'
import FinancialDailyChart from '../FinancialDailyChart'
import { getSessionUser } from '@/lib/auth'
import type {
  AdminTabProps,
  FinancialDailySeries,
  FinancialDashboard,
  FinancialServicesReport,
  FinancialSummary,
  Product,
  Professional,
} from '@/lib/admin/types'
import {
  closeFinancialRegister,
  fetchFinancialDaily,
  fetchFinancialServices,
  fetchFinancialSummary,
  fetchFinancials,
  fetchProducts,
  fetchProfessionals,
  sellProduct,
} from '@/lib/admin/api'

const ALL_PROFESSIONALS = '__all__'
const VIEW_STORAGE_KEY = 'admin:financeiro:view'
const AUTO_REFRESH_MS = 2 * 60 * 60 * 1000
const MONTH_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

function money(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function toYmd(date: Date) {
  // Sempre pelo calendário de São Paulo — toISOString() (UTC) desloca o dia à noite.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function todayYmd() {
  return toYmd(new Date())
}

/** Soma/subtrai dias civis a partir de um YYYY-MM-DD (meio-dia local evita virar o dia). */
function shiftYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toYmd(d)
}

/** Últimos 12 meses, do mais antigo para o atual. */
function recentMonths(): { key: string; label: string }[] {
  const now = new Date()
  const list: { key: string; label: string }[] = []
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    const sameYear = year === now.getFullYear()
    list.push({ key, label: sameYear ? MONTH_SHORT[month] : `${MONTH_SHORT[month]} ${String(year).slice(2)}` })
  }
  return list
}

function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split('-').map(Number)
  const from = `${monthKey}-01`
  const lastDay = new Date(year, month, 0).getDate()
  return { from, to: `${monthKey}-${String(lastDay).padStart(2, '0')}` }
}

function periodLabel(from: string, to: string): string {
  const fmt = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString('pt-BR')
  return from === to ? fmt(from) : `${fmt(from)} a ${fmt(to)}`
}

type PeriodPreset = 'hoje' | 'ontem' | 'semana' | 'mes' | 'sempre' | 'custom'

function rangeForPreset(preset: PeriodPreset): { from?: string; to?: string } {
  const today = todayYmd()
  if (preset === 'sempre') return {}
  if (preset === 'hoje') return { from: today, to: today }
  if (preset === 'ontem') {
    const y = shiftYmd(today, -1)
    return { from: y, to: y }
  }
  if (preset === 'semana') {
    // Segunda → hoje (calendário local a partir do YYYY-MM-DD de SP)
    const d = new Date(`${today}T12:00:00`)
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    return { from: shiftYmd(today, -diff), to: today }
  }
  if (preset === 'mes') {
    return { from: `${today.slice(0, 7)}-01`, to: today }
  }
  return {}
}

export default function AdminFinancialTab({ salonId, lightMode = false }: AdminTabProps) {
  const { confirm, confirmDialog } = useConfirm(lightMode)
  const sessionUser = getSessionUser()
  const isOwner = sessionUser?.role === 'OWNER' || sessionUser?.role === 'SUPER_ADMIN'

  // A sub-aba escolhida sobrevive a trocar de aba e a recarregar a página.
  // O painel só monta depois do AdminAuthGuard liberar, então ler aqui é seguro.
  const [view, setView] = useState<'faturamento' | 'caixa'>(() => {
    if (typeof window === 'undefined') return 'faturamento'
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'caixa' ? 'caixa' : 'faturamento'
  })

  function changeView(next: 'faturamento' | 'caixa') {
    setView(next)
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      /* navegador sem storage: a escolha só não persiste */
    }
  }

  const months = useMemo(recentMonths, [])
  const [monthKey, setMonthKey] = useState(() => months[months.length - 1].key)
  const [professionalId, setProfessionalId] = useState(ALL_PROFESSIONALS)
  const [team, setTeam] = useState<Professional[]>([])

  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [professionalPickerOpen, setProfessionalPickerOpen] = useState(false)

  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [daily, setDaily] = useState<FinancialDailySeries | null>(null)
  const [servicesReport, setServicesReport] = useState<FinancialServicesReport | null>(null)
  const [reportLoading, setReportLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [reportError, setReportError] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const activeRange = customRange ?? monthRange(monthKey)
  const scopedProfessionalId = professionalId === ALL_PROFESSIONALS ? undefined : professionalId
  const today = todayYmd()
  const chartAlignDay = (() => {
    // Mês corrente: sempre o dia de hoje no calendário de São Paulo.
    if (monthKey === today.slice(0, 7)) return Number(today.slice(8, 10))
    if (customRange) {
      const anchor = customRange.to || customRange.from
      if (anchor?.startsWith(monthKey)) return Number(anchor.slice(8, 10))
    }
    return null
  })()

  const faturamentoPresets: { id: string; label: string; range: () => { from: string; to: string } | null }[] = [
    { id: 'hoje', label: 'Hoje', range: () => ({ from: today, to: today }) },
    {
      id: 'ontem',
      label: 'Ontem',
      range: () => {
        const y = shiftYmd(today, -1)
        return { from: y, to: y }
      },
    },
    {
      id: 'semana',
      label: 'Esta semana',
      range: () => {
        const d = new Date(`${today}T12:00:00`)
        const day = d.getDay()
        const diff = day === 0 ? 6 : day - 1
        return { from: shiftYmd(today, -diff), to: today }
      },
    },
    { id: 'mes', label: 'Este mês', range: () => null },
  ]

  const activeFaturamentoPreset =
    faturamentoPresets.find((preset) => {
      const range = preset.range()
      if (!range) return !customRange
      return customRange?.from === range.from && customRange?.to === range.to
    })?.id ?? (customRange ? 'custom' : 'mes')


  const loadReports = useCallback(async (opts?: { silent?: boolean }) => {
    if (!salonId) {
      setReportLoading(false)
      setReportError('Salão não identificado. Faça login novamente.')
      return
    }
    if (!opts?.silent) setReportLoading(true)
    try {
      const [summaryData, dailyData, servicesData] = await Promise.all([
        fetchFinancialSummary(salonId, { ...activeRange, professionalId: scopedProfessionalId }),
        fetchFinancialDaily(salonId, { month: monthKey, professionalId: scopedProfessionalId }),
        fetchFinancialServices(salonId, { ...activeRange, professionalId: scopedProfessionalId }),
      ])
      setSummary(summaryData)
      setDaily(dailyData)
      setServicesReport(servicesData)
      setUpdatedAt(new Date())
      setReportError('')
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Erro ao carregar o faturamento.')
    } finally {
      setReportLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId, monthKey, scopedProfessionalId, activeRange.from, activeRange.to])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  // Recarrega sozinho de 2 em 2 horas, sem spinner e só com a aba visível,
  // para não bater na API com o painel esquecido aberto em outra janela.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadReports({ silent: true })
    }, AUTO_REFRESH_MS)
    return () => window.clearInterval(interval)
  }, [loadReports])

  useEffect(() => {
    if (!salonId || !isOwner || team.length) return
    fetchProfessionals(salonId)
      .then(setTeam)
      .catch(() => {
        /* seletor fica só com "toda a barbearia" */
      })
  }, [salonId, isOwner, team.length])

  const scopeLabel = useMemo(() => {
    if (professionalId === ALL_PROFESSIONALS) return isOwner ? 'Balanço da barbearia' : 'Meu balanço'
    return team.find((p) => p.id === professionalId)?.user?.name || 'Profissional'
  }, [professionalId, team, isOwner])

  async function handleGeneratePdf() {
    if (!summary || !salonId) return
    setGeneratingPdf(true)
    try {
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const doc = new JsPDF()
      const title = `Faturamento — ${scopeLabel}`

      doc.setFontSize(16)
      doc.text(title, 14, 18)
      doc.setFontSize(10)
      doc.setTextColor(110)
      doc.text(`Período: ${periodLabel(summary.period.from, summary.period.to)}`, 14, 25)
      doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, 14, 30)
      doc.setTextColor(0)

      autoTable(doc, {
        startY: 38,
        head: [['Resumo', 'Valor']],
        body: [
          ['Valor bruto (serviços)', money(summary.services.gross)],
          ['Comissões', money(summary.services.commission)],
          ['Líquido', money(summary.services.net)],
          ['Atendimentos', String(summary.services.appointments)],
          ['N/P — produtos do estoque', money(summary.products.revenue)],
          ['Despesas', money(summary.expenses)],
        ],
      })

      if (daily?.days.some((d) => d.gross > 0)) {
        // Série diária só faz sentido quando o filtro cabe num mês.
        // No anual (IR) o PDF leva o resumo + serviços do período inteiro.
        const sameMonth =
          summary.period.from.slice(0, 7) === summary.period.to.slice(0, 7)
        if (sameMonth) {
          autoTable(doc, {
            head: [['Dia', 'Atendimentos', 'Bruto', 'Líquido', 'N/P']],
            body: daily.days
              .filter((d) => d.gross > 0 || d.products > 0)
              .map((d) => [
                String(d.day),
                String(d.appointments),
                money(d.gross),
                money(d.net),
                money(d.products),
              ]),
          })
        }
      }

      if (servicesReport?.services.length) {
        autoTable(doc, {
          head: [['Serviço', 'Categoria', 'Qtd.', 'Bruto']],
          body: servicesReport.services.map((row) => [
            row.name,
            row.category || 'Sem categoria',
            String(row.count),
            money(row.gross),
          ]),
        })
      }

      doc.save(`faturamento-${summary.period.from}-a-${summary.period.to}.pdf`)
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Não foi possível gerar o PDF.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const title = lightMode ? 'text-slate-900' : 'text-white'
  const muted = lightMode ? 'text-slate-500' : 'text-slate-400'
  const cardBorder = lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'

  return (
    <section className="space-y-4">
      {isOwner ? (
        <div className={`grid grid-cols-2 gap-1 rounded-xl border p-1.5 ${lightMode ? 'border-slate-200 bg-slate-100' : 'border-slate-700 bg-slate-800'}`}>
          {([
            { id: 'caixa', label: 'Caixa & PDV' },
            { id: 'faturamento', label: 'Faturamento' },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changeView(item.id)}
              className={`min-h-10 rounded-lg px-3 py-2 text-sm font-bold transition ${
                view === item.id
                  ? lightMode
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'bg-slate-700 text-white shadow-sm'
                  : muted
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {!isOwner || view === 'faturamento' ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Analisar</p>
              <h3 className={`text-2xl font-bold tracking-tight ${title}`}>Faturamento</h3>
            </div>
            <button
              type="button"
              onClick={() => loadReports({ silent: true })}
              className={`shrink-0 text-right text-[10px] font-semibold leading-tight ${muted}`}
              title="Tocar para atualizar agora"
            >
              <RefreshCw className="ml-auto mb-0.5 size-3.5" />
              {updatedAt
                ? `Atualizado ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Atualizar'}
            </button>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 scrollbar-none [-webkit-overflow-scrolling:touch]">
            {months.map((month) => {
              const selected = monthKey === month.key && !customRange
              return (
                <button
                  key={month.key}
                  type="button"
                  onClick={() => {
                    setMonthKey(month.key)
                    setCustomRange(null)
                  }}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition ${
                    selected
                      ? 'text-white shadow-md'
                      : lightMode
                        ? 'border border-slate-200 text-slate-600'
                        : 'border border-slate-600 text-slate-300'
                  }`}
                  style={selected ? { backgroundColor: 'var(--brand, #d5a85c)' } : undefined}
                >
                  {month.label}
                </button>
              )
            })}
          </div>

          {reportError ? <AdminError message={reportError} /> : null}

          {reportLoading ? (
            <AdminLoading lightMode={lightMode} text="Carregando faturamento..." />
          ) : summary ? (
            <>
              <div className="mb-1 flex flex-wrap gap-2">
                {faturamentoPresets.map((preset) => {
                  const selected = activeFaturamentoPreset === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const range = preset.range()
                        if (!range) {
                          setCustomRange(null)
                          setMonthKey(today.slice(0, 7))
                          return
                        }
                        setCustomRange(range)
                        setMonthKey(range.to.slice(0, 7))
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                          : lightMode
                            ? 'border-slate-200 text-slate-600'
                            : 'border-slate-600 text-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              <div className={`rounded-2xl border p-4 ${cardBorder}`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                    Balanço serviços
                  </p>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => setProfessionalPickerOpen(true)}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${muted}`}
                    >
                      {scopeLabel} <ChevronDown className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                <p className={`text-3xl font-black ${title}`}>{money(summary.services.net)}</p>
                <p className={`mt-1 text-xs ${muted}`}>
                  {summary.services.commissionRate != null
                    ? `(com. ${summary.services.commissionRate}%) | `
                    : ''}
                  Valor bruto: {money(summary.services.gross)}
                </p>
                <p className={`mt-0.5 text-sm font-bold ${title}`}>
                  {summary.services.appointments} atendimento{summary.services.appointments === 1 ? '' : 's'}
                </p>
                <p className={`mt-1 text-[11px] ${muted}`}>
                  Período: {periodLabel(summary.period.from, summary.period.to)}
                </p>

                {daily ? (
                  <div className="mt-4">
                    <FinancialDailyChart
                      days={daily.days}
                      lightMode={lightMode}
                      alignToDay={chartAlignDay}
                      daysAhead={7}
                    />
                  </div>
                ) : null}

                <div className={`mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs ${lightMode ? 'border-slate-200' : 'border-slate-700'}`}>
                  <div>
                    <p className={muted}>N/P — produtos</p>
                    <p className={`font-bold ${title}`}>{money(summary.products.revenue)}</p>
                  </div>
                  <div>
                    <p className={muted}>Comissões</p>
                    <p className={`font-bold ${title}`}>{money(summary.services.commission)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterOpen(true)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
                      lightMode ? 'border-slate-200 text-slate-600' : 'border-slate-600 text-slate-300'
                    }`}
                  >
                    <CalendarDays className="size-3.5" />
                    Filtro: {customRange ? periodLabel(customRange.from, customRange.to) : 'mês'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    disabled={generatingPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white shadow-md disabled:opacity-60"
                    style={{ backgroundColor: 'var(--brand, #d5a85c)' }}
                  >
                    <FileText className="size-3.5" />
                    {generatingPdf ? 'Gerando...' : 'Gerar PDF'}
                  </button>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${cardBorder}`}>
                <h4 className={`mb-3 text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                  Serviços realizados
                </h4>
                {servicesReport?.services.length ? (
                  <>
                    <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 scrollbar-none [-webkit-overflow-scrolling:touch]">
                      {servicesReport.services.map((row) => (
                        <div
                          key={`${row.serviceId ?? row.name}-${row.professionalId ?? 'all'}`}
                          className={`w-36 shrink-0 rounded-xl border p-3 ${
                            lightMode ? 'border-slate-200 bg-slate-50' : 'border-slate-600 bg-[#142035]'
                          }`}
                        >
                          <p className="text-2xl font-black" style={{ color: 'var(--brand, #d5a85c)' }}>
                            {row.count}
                          </p>
                          <p className={`mt-1 truncate text-xs font-semibold ${title}`} title={row.name}>
                            {row.name}
                          </p>
                          {row.professionalName ? (
                            <p className={`truncate text-[10px] font-medium ${muted}`} title={row.professionalName}>
                              {row.professionalName}
                            </p>
                          ) : null}
                          <p className={`text-[10px] ${muted}`}>{money(row.gross)}</p>
                        </div>
                      ))}
                    </div>

                    {servicesReport.byProfessional && servicesReport.byProfessional.length > 0 ? (
                      <div className={`mt-4 border-t pt-3 ${lightMode ? 'border-slate-200' : 'border-slate-700'}`}>
                        <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                          Por barbeiro
                        </p>
                        <div className="space-y-1.5">
                          {servicesReport.byProfessional.map((row) => (
                            <div key={row.professionalId} className="flex items-center justify-between text-sm">
                              <span className={lightMode ? 'text-slate-700' : 'text-slate-300'}>{row.name}</span>
                              <span className={`font-bold ${title}`}>
                                {row.count} · {money(row.gross)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {servicesReport.categories.length ? (
                      <div className={`mt-4 border-t pt-3 ${lightMode ? 'border-slate-200' : 'border-slate-700'}`}>
                        <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                          Por categoria
                        </p>
                        <div className="space-y-1.5">
                          {servicesReport.categories.map((row) => (
                            <div key={row.category} className="flex items-center justify-between text-sm">
                              <span className={lightMode ? 'text-slate-700' : 'text-slate-300'}>
                                {row.category}
                              </span>
                              <span className={`font-bold ${title}`}>
                                {row.count} · {money(row.gross)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <AdminEmpty lightMode={lightMode} text="Nenhum serviço concluído no período." />
                )}
              </div>
            </>
          ) : (
            <AdminEmpty lightMode={lightMode} text="Sem dados de faturamento." />
          )}
        </>
      ) : (
        <CashRegisterPanel salonId={salonId} lightMode={lightMode} confirm={confirm} />
      )}

      {filterOpen ? (
        <DateFilterModal
          lightMode={lightMode}
          initial={activeRange}
          onClose={() => setFilterOpen(false)}
          onApply={(range) => {
            setCustomRange(range)
            setFilterOpen(false)
          }}
          onClear={() => {
            setCustomRange(null)
            setFilterOpen(false)
          }}
        />
      ) : null}

      {professionalPickerOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setProfessionalPickerOpen(false)}
          />
          <div
            className={`relative z-[71] max-h-[75vh] w-full overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:max-w-md sm:rounded-2xl ${cardBorder}`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className={`text-lg font-bold ${title}`}>Balanço</h3>
                <p className={`mt-0.5 text-xs ${muted}`}>De quem você quer ver o faturamento</p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setProfessionalPickerOpen(false)}
                className={`grid size-8 place-items-center rounded-lg ${muted}`}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { id: ALL_PROFESSIONALS, name: 'Balanço da barbearia', hint: 'Todos os profissionais' },
                ...team.map((p) => ({
                  id: p.id,
                  name: p.user?.name || 'Profissional',
                  hint: `Comissão ${p.commissionRate}%`,
                })),
              ].map((option) => {
                const selected = professionalId === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setProfessionalId(option.id)
                      setProfessionalPickerOpen(false)
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

      {confirmDialog}
    </section>
  )
}

function DateFilterModal({
  lightMode,
  initial,
  onApply,
  onClear,
  onClose,
}: {
  lightMode: boolean
  initial: { from: string; to: string }
  onApply: (range: { from: string; to: string }) => void
  onClear: () => void
  onClose: () => void
}) {
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)

  const presets = [
    {
      id: 'ontem',
      label: 'Dia anterior',
      range: () => {
        const y = shiftYmd(todayYmd(), -1)
        return { from: y, to: y }
      },
    },
    { id: 'hoje', label: 'Hoje', range: () => ({ from: todayYmd(), to: todayYmd() }) },
    {
      id: 'semana',
      label: 'Últimos 7 dias',
      range: () => ({ from: shiftYmd(todayYmd(), -6), to: todayYmd() }),
    },
    {
      id: 'mes',
      label: 'Últimos 30 dias',
      range: () => ({ from: shiftYmd(todayYmd(), -29), to: todayYmd() }),
    },
    {
      id: 'ano',
      label: 'Este ano',
      range: () => {
        const year = Number(todayYmd().slice(0, 4))
        return { from: `${year}-01-01`, to: todayYmd() }
      },
    },
    {
      id: 'ano-passado',
      label: 'Ano passado (IR)',
      range: () => {
        const year = Number(todayYmd().slice(0, 4)) - 1
        return { from: `${year}-01-01`, to: `${year}-12-31` }
      },
    },
  ]

  const activePresetId =
    presets.find((preset) => {
      const range = preset.range()
      return range.from === from && range.to === to
    })?.id ?? null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-[71] w-full rounded-t-2xl border p-5 shadow-2xl sm:max-w-md sm:rounded-2xl ${
          lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
        }`}
      >
        <h3 className={`mb-4 text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
          Período do balanço
        </h3>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {presets.map((preset) => {
            const selected = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const range = preset.range()
                  setFrom(range.from)
                  setTo(range.to)
                  // Aplica na hora: sem isso o usuário fechava o modal achando
                  // que o atalho já tinha filtrado, e o balanço seguia no mês.
                  onApply(range)
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  selected
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                    : lightMode
                      ? 'border-slate-200 text-slate-600'
                      : 'border-slate-600 text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        <p className={`mb-4 text-[11px] leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Use <strong className={lightMode ? 'text-slate-700' : 'text-slate-300'}>Ano passado (IR)</strong> para
          baixar o balanço do ano-calendário completo e declarar o imposto de renda.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass(lightMode)}>De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass(lightMode)} />
          </div>
          <div>
            <label className={labelClass(lightMode)}>Até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass(lightMode)} />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClear} className="h-10 px-3 text-xs">
            Voltar para o mês
          </AdminButton>
          <AdminButton onClick={() => onApply({ from, to })} disabled={!from || !to} className="h-10 px-3 text-xs">
            Aplicar
          </AdminButton>
        </div>
      </div>
    </div>
  )
}

/** Caixa do dia + PDV: continua exclusivo do dono, como sempre foi. */
function CashRegisterPanel({
  salonId,
  lightMode,
  confirm,
}: {
  salonId?: string
  lightMode: boolean
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}) {
  const [data, setData] = useState<FinancialDashboard | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [team, setTeam] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [selling, setSelling] = useState(false)
  const [period, setPeriod] = useState<PeriodPreset>('hoje')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pos, setPos] = useState({ productId: '', professionalId: '', quantity: '1', paymentMethod: 'PIX' })

  const activeRange = useMemo(() => {
    if (period === 'custom') return { from: customFrom || undefined, to: customTo || undefined }
    return rangeForPreset(period)
  }, [period, customFrom, customTo])

  async function load(opts?: { silent?: boolean }) {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado. Faça login novamente.')
      return
    }
    if (!opts?.silent) setLoading(true)
    setError('')
    try {
      const range = period === 'custom'
        ? { from: customFrom || undefined, to: customTo || undefined }
        : rangeForPreset(period)
      const [financials, productList, professionals] = await Promise.all([
        fetchFinancials(salonId, range),
        fetchProducts(salonId),
        fetchProfessionals(salonId),
      ])
      setData(financials)
      setProducts(productList.filter((p) => p.isActive !== false))
      setTeam(professionals)
      if (!pos.productId && productList[0]) {
        setPos((current) => ({ ...current, productId: productList[0].id }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar financeiro.')
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId, period, customFrom, customTo])

  const selectedProduct = useMemo(() => products.find((p) => p.id === pos.productId) ?? null, [products, pos.productId])
  const quantity = Math.max(1, Number(pos.quantity) || 1)
  const unitPrice = selectedProduct?.price ?? 0
  const subtotal = unitPrice * quantity

  const presets: { id: PeriodPreset; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ontem', label: 'Ontem' },
    { id: 'semana', label: 'Esta semana' },
    { id: 'mes', label: 'Este mês' },
    { id: 'sempre', label: 'Sempre' },
  ]

  function downloadCsv() {
    if (!data) return
    const cutRows = data.recentRecords
      .filter((record) => !record.isExpense && record.appointment)
      .map((record) => [
        'Corte',
        record.appointment?.service?.name || 'Serviço',
        record.appointment?.professional?.user?.name || '',
        String(record.amount),
        new Date(record.createdAt).toLocaleString('pt-BR'),
      ])
    const productRows = data.recentRecords
      .filter((record) => !record.isExpense && record.productSale)
      .map((record) => [
        'Produto',
        record.productSale?.product?.name || 'Produto',
        record.productSale?.professional?.user?.name || '',
        String(record.amount),
        new Date(record.createdAt).toLocaleString('pt-BR'),
      ])
    const otherRows = data.recentRecords
      .filter((record) => record.isExpense || (!record.appointment && !record.productSale))
      .map((record) => [
        record.isExpense ? 'Saída' : 'Entrada',
        record.appointment?.service?.name || record.productSale?.product?.name || 'Movimentação',
        '',
        String(record.amount),
        new Date(record.createdAt).toLocaleString('pt-BR'),
      ])

    const rows = [
      ['Tipo', 'Descrição', 'Profissional', 'Valor', 'Data'],
      ...cutRows,
      ...productRows,
      ...otherRows,
      [],
      ['Resumo', '', '', '', ''],
      ['Faturamento Total', '', '', String(data.totalRevenue), ''],
      ['Comissões', '', '', String(data.totalCommissions), ''],
      ['Lucro Líquido', '', '', String(data.netProfit), ''],
      ['Cortes concluídos (caixa aberto)', '', '', String(data.completedCuts ?? 0), ''],
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fechamento-caixa-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleClose() {
    if (!salonId) return
    const ok = await confirm({
      message: 'Fechar o caixa do dia e baixar o relatório? Depois de fechado, as vendas de hoje ficam consolidadas.',
      confirmLabel: 'Sim, fechar caixa',
      danger: false,
    })
    if (!ok) return
    setClosing(true)
    try {
      downloadCsv()
      await closeFinancialRegister(salonId)
      await load({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fechar caixa.')
    } finally {
      setClosing(false)
    }
  }

  async function handlePosSale(event: FormEvent) {
    event.preventDefault()
    if (!salonId || !pos.productId) return
    setSelling(true)
    setError('')
    try {
      await sellProduct({
        salonId,
        productId: pos.productId,
        quantity,
        paymentMethod: pos.paymentMethod,
        professionalId: pos.professionalId || null,
      })
      setPos((current) => ({ ...current, quantity: '1' }))
      await load({ silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na venda rápida.')
    } finally {
      setSelling(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={`text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
            Fechamento de Caixa Diário
          </h3>
          <p className={`mt-1 text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            O dia fecha sozinho na virada. Use aqui para adiantar o fechamento ou baixar o CSV.
          </p>
        </div>
        <AdminButton variant="success" onClick={handleClose} disabled={closing || loading}>
          <Download className="size-4" />
          {closing ? 'Fechando...' : 'Fechar Caixa & Baixar CSV'}
        </AdminButton>
      </div>

      <div className={sectionClass(lightMode)}>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="size-4 text-indigo-400" />
          <h4 className={`text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>Período</h4>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                period === item.id
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                  : lightMode
                    ? 'border-slate-200 text-slate-600'
                    : 'border-slate-600 text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriod('custom')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              period === 'custom'
                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                : lightMode
                  ? 'border-slate-200 text-slate-600'
                  : 'border-slate-600 text-slate-300'
            }`}
          >
            Personalizado
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass(lightMode)}>Data inicial</label>
            <input
              type="date"
              value={period === 'custom' ? customFrom : activeRange.from || ''}
              onChange={(e) => {
                setPeriod('custom')
                setCustomFrom(e.target.value)
              }}
              className={inputClass(lightMode)}
            />
          </div>
          <div>
            <label className={labelClass(lightMode)}>Data final</label>
            <input
              type="date"
              value={period === 'custom' ? customTo : activeRange.to || ''}
              onChange={(e) => {
                setPeriod('custom')
                setCustomTo(e.target.value)
              }}
              className={inputClass(lightMode)}
            />
          </div>
        </div>
      </div>

      {error ? <AdminError message={error} /> : null}

      {loading ? (
        <AdminLoading lightMode={lightMode} />
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStat lightMode={lightMode} label="Faturamento Total" value={money(data.totalRevenue)} />
              <AdminStat lightMode={lightMode} label="Comissões (A Pagar)" value={money(data.totalCommissions)} tone="danger" />
              <AdminStat lightMode={lightMode} label="Lucro Líquido (Seu)" value={money(data.netProfit)} tone="success" />
              <AdminStat lightMode={lightMode} label="Cortes concluídos" value={String(data.completedCuts ?? 0)} />
            </div>

            <div className={sectionClass(lightMode)}>
              <h4 className={`mb-3 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                Últimos Lançamentos
              </h4>
              {data.recentRecords.length ? (
                <div className="space-y-2">
                  {data.recentRecords.slice(0, 20).map((record) => {
                    const serviceName =
                      record.appointment?.service?.name ||
                      record.productSale?.product?.name ||
                      'Movimentação'
                    const barberName =
                      record.appointment?.professional?.user?.name ||
                      record.productSale?.professional?.user?.name ||
                      null
                    return (
                    <div
                      key={record.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                        lightMode ? 'border-slate-200' : 'border-slate-600'
                      }`}
                    >
                      <span className={lightMode ? 'text-slate-700' : 'text-slate-300'}>
                        {serviceName}
                        {barberName ? (
                          <span className={`block text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {barberName}
                          </span>
                        ) : null}
                      </span>
                      <span className={record.isExpense ? 'font-semibold text-rose-500' : 'font-semibold text-emerald-600'}>
                        {record.isExpense ? '-' : '+'}
                        {money(record.amount)}
                      </span>
                    </div>
                    )
                  })}
                  {data.recentRecords.length > 20 ? (
                    <p className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Mostrando 20 de {data.recentRecords.length}. O CSV de fechamento inclui todos.
                    </p>
                  ) : null}
                </div>
              ) : (
                <AdminEmpty lightMode={lightMode} text="Nenhum valor no período selecionado." />
              )}
            </div>
          </div>

          <aside className={sectionClass(lightMode)}>
            <div className="mb-4 flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-500">
                <ShoppingCart className="size-5" />
              </span>
              <div>
                <h4 className={`text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                  Caixa Rápido (PDV)
                </h4>
                <p className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Venda expressa de balcão
                </p>
              </div>
            </div>

            <form onSubmit={handlePosSale} className="space-y-3">
              <div>
                <label className={labelClass(lightMode)}>Produto</label>
                <select
                  value={pos.productId}
                  onChange={(e) => setPos({ ...pos, productId: e.target.value })}
                  className={inputClass(lightMode)}
                  required
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {money(product.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass(lightMode)}>Vendedor / Barbeiro (opcional)</label>
                <select
                  value={pos.professionalId}
                  onChange={(e) => setPos({ ...pos, professionalId: e.target.value })}
                  className={inputClass(lightMode)}
                >
                  <option value="">Sem comissão / Salão</option>
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.user?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass(lightMode)}>Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={pos.quantity}
                    onChange={(e) => setPos({ ...pos, quantity: e.target.value })}
                    className={inputClass(lightMode)}
                  />
                </div>
                <div>
                  <label className={labelClass(lightMode)}>Pagamento</label>
                  <select
                    value={pos.paymentMethod}
                    onChange={(e) => setPos({ ...pos, paymentMethod: e.target.value })}
                    className={inputClass(lightMode)}
                  >
                    <option value="PIX">PIX</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="CREDIT_CARD">Crédito</option>
                    <option value="DEBIT_CARD">Débito</option>
                  </select>
                </div>
              </div>

              <div className={`rounded-xl border p-3 text-sm ${lightMode ? 'border-slate-200 bg-slate-50' : 'border-slate-600'}`}>
                <p className={lightMode ? 'text-slate-500' : 'text-slate-400'}>Preço unitário: {money(unitPrice)}</p>
                <p className={`mt-1 font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                  Subtotal: {money(subtotal)}
                </p>
              </div>

              <AdminButton type="submit" variant="warning" disabled={selling || !pos.productId} className="w-full">
                <Scissors className="size-4" />
                {selling ? 'Confirmando...' : 'Confirmar Venda Rápida'}
              </AdminButton>
            </form>
          </aside>
        </div>
      ) : (
        <AdminEmpty lightMode={lightMode} text="Sem dados financeiros." />
      )}
    </div>
  )
}
