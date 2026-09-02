'use client'

import { CalendarDays, Download, Scissors, ShoppingCart } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
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
import type { AdminTabProps, FinancialDashboard, Product, Professional } from '@/lib/admin/types'
import {
  closeFinancialRegister,
  fetchFinancials,
  fetchProducts,
  fetchProfessionals,
  sellProduct,
} from '@/lib/admin/api'

function money(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10)
}

type PeriodPreset = 'hoje' | 'ontem' | 'semana' | 'mes' | 'sempre' | 'custom'

function rangeForPreset(preset: PeriodPreset): { from?: string; to?: string } {
  const now = new Date()
  const today = toYmd(now)
  if (preset === 'sempre') return {}
  if (preset === 'hoje') return { from: today, to: today }
  if (preset === 'ontem') {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    const y = toYmd(d)
    return { from: y, to: y }
  }
  if (preset === 'semana') {
    const d = new Date(now)
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    return { from: toYmd(d), to: today }
  }
  if (preset === 'mes') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    return { from: toYmd(start), to: today }
  }
  return {}
}

export default function AdminFinancialTab({ salonId, lightMode = false }: AdminTabProps) {
  const [data, setData] = useState<FinancialDashboard | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [team, setTeam] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [selling, setSelling] = useState(false)
  const [period, setPeriod] = useState<PeriodPreset>('sempre')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pos, setPos] = useState({
    productId: '',
    professionalId: '',
    quantity: '1',
    paymentMethod: 'PIX',
  })

  const activeRange = useMemo(() => {
    if (period === 'custom') {
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
      }
    }
    return rangeForPreset(period)
  }, [period, customFrom, customTo])

  async function load() {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado. Faça login novamente.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [financials, productList, professionals] = await Promise.all([
        fetchFinancials(salonId, activeRange),
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
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId, period, customFrom, customTo])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === pos.productId) ?? null,
    [products, pos.productId],
  )
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
    if (!salonId || !confirm('Fechar o caixa do dia e baixar o relatório?')) return
    setClosing(true)
    try {
      downloadCsv()
      await closeFinancialRegister(salonId)
      await load()
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
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na venda rápida.')
    } finally {
      setSelling(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={`text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
            Fechamento de Caixa Diário
          </h3>
          <p className={`mt-1 text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Filtre por período para ver faturamento e cortes concluídos.
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
              <AdminStat
                lightMode={lightMode}
                label="Comissões (A Pagar)"
                value={money(data.totalCommissions)}
                tone="danger"
              />
              <AdminStat lightMode={lightMode} label="Lucro Líquido (Seu)" value={money(data.netProfit)} tone="success" />
              <AdminStat
                lightMode={lightMode}
                label="Cortes concluídos"
                value={String(data.completedCuts ?? 0)}
              />
            </div>

            <div className={sectionClass(lightMode)}>
              <h4 className={`mb-3 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                Últimos Lançamentos
              </h4>
              {data.recentRecords.length ? (
                <div className="space-y-2">
                  {data.recentRecords.slice(0, 20).map((record) => (
                    <div
                      key={record.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                        lightMode ? 'border-slate-200' : 'border-slate-600'
                      }`}
                    >
                      <span className={lightMode ? 'text-slate-700' : 'text-slate-300'}>
                        {record.appointment?.service?.name ||
                          record.productSale?.product?.name ||
                          'Movimentação'}
                      </span>
                      <span className={record.isExpense ? 'font-semibold text-rose-500' : 'font-semibold text-emerald-600'}>
                        {record.isExpense ? '-' : '+'}
                        {money(record.amount)}
                      </span>
                    </div>
                  ))}
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
    </section>
  )
}
