'use client'

import { Download, Scissors, ShoppingCart } from 'lucide-react'
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

export default function AdminFinancialTab({ salonId, lightMode = false }: AdminTabProps) {
  const [data, setData] = useState<FinancialDashboard | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [team, setTeam] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [selling, setSelling] = useState(false)
  const [pos, setPos] = useState({
    productId: '',
    professionalId: '',
    quantity: '1',
    paymentMethod: 'PIX',
  })

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
        fetchFinancials(salonId),
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
  }, [salonId])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === pos.productId) ?? null,
    [products, pos.productId],
  )
  const quantity = Math.max(1, Number(pos.quantity) || 1)
  const unitPrice = selectedProduct?.price ?? 0
  const subtotal = unitPrice * quantity

  function downloadCsv() {
    if (!data) return
    const rows = [
      ['Tipo', 'Descrição', 'Valor', 'Data'],
      ...data.recentRecords.map((record) => [
        record.isExpense ? 'Saída' : 'Entrada',
        record.appointment?.service?.name || record.productSale?.product?.name || 'Movimentação',
        String(record.amount),
        new Date(record.createdAt).toLocaleString('pt-BR'),
      ]),
      [],
      ['Faturamento Total', String(data.totalRevenue)],
      ['Comissões', String(data.totalCommissions)],
      ['Lucro Líquido', String(data.netProfit)],
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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
            Seus lucros de hoje. Ao fechar o salão, baixe o relatório (os dados resetam à meia-noite).
          </p>
        </div>
        <AdminButton variant="success" onClick={handleClose} disabled={closing || loading}>
          <Download className="size-4" />
          {closing ? 'Fechando...' : 'Fechar Caixa & Baixar CSV'}
        </AdminButton>
      </div>

      {error ? <AdminError message={error} /> : null}

      {loading ? (
        <AdminLoading lightMode={lightMode} />
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <AdminStat lightMode={lightMode} label="Faturamento Total" value={money(data.totalRevenue)} />
              <AdminStat
                lightMode={lightMode}
                label="Comissões (A Pagar)"
                value={money(data.totalCommissions)}
                tone="danger"
              />
              <AdminStat lightMode={lightMode} label="Lucro Líquido (Seu)" value={money(data.netProfit)} tone="success" />
            </div>

            <div className={sectionClass(lightMode)}>
              <h4 className={`mb-3 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                Últimos Lançamentos
              </h4>
              {data.recentRecords.length ? (
                <div className="space-y-2">
                  {data.recentRecords.map((record) => (
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
                </div>
              ) : (
                <AdminEmpty
                  lightMode={lightMode}
                  text="Nenhum valor em caixa ainda. Conclua agendamentos para gerar receitas!"
                />
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
