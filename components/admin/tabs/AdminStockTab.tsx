'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { PackagePlus, Trash2 } from 'lucide-react'
import { AdminButton, AdminEmpty, AdminError, AdminLoading, AdminStat, inputClass, labelClass, sectionClass } from '../ui/AdminUi'
import type { AdminTabProps, Product } from '@/lib/admin/types'
import { createProduct, fetchProducts, restockProduct, sellProduct, softDeleteProduct, updateProduct } from '@/lib/admin/api'

type StockSubTab = 'estoque' | 'financeiro'

function money(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function isArchived(product: Product) {
  return product.isActive === false || Boolean(product.deletedAt)
}

export default function AdminStockTab({ salonId, lightMode = false }: AdminTabProps) {
  const [subTab, setSubTab] = useState<StockSubTab>('estoque')
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('25')
  const [cost, setCost] = useState('0')
  const [stock, setStock] = useState('10')
  const [isReward, setIsReward] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restockQty, setRestockQty] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const activeItems = useMemo(() => items.filter((item) => !isArchived(item)), [items])
  const archivedItems = useMemo(() => items.filter(isArchived), [items])
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        sold: acc.sold + (item.soldQuantity ?? 0),
        revenue: acc.revenue + (item.revenue ?? 0),
        profit: acc.profit + (item.profit ?? 0),
      }),
      { sold: 0, revenue: 0, profit: 0 },
    )
  }, [items])

  async function load() {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado. Faça login novamente.')
      return
    }
    setLoading(true)
    setError('')
    try {
      setItems(await fetchProducts(salonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estoque.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    try {
      await createProduct({
        salonId,
        name,
        price: Number(price),
        costPrice: Number(cost) || 0,
        stockQuantity: Number(stock),
        isReward,
      })
      setName('')
      setIsReward(false)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar produto.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSell(product: Product) {
    if (!salonId || product.stockQuantity < 1 || isArchived(product)) return
    setBusyId(product.id)
    try {
      await sellProduct({ salonId, productId: product.id, quantity: 1 })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vender.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleReward(product: Product) {
    setBusyId(product.id)
    try {
      await updateProduct(product.id, { isReward: !product.isReward })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar prêmio.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSoftDelete(product: Product) {
    if (!window.confirm(`Remover ${product.name} do estoque? O histórico de vendas e o lucro ficam no Financeiro.`)) {
      return
    }
    setBusyId(product.id)
    try {
      await softDeleteProduct(product.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover produto.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRestock(product: Product) {
    const qty = Math.floor(Number(restockQty[product.id] ?? '1'))
    if (!Number.isFinite(qty) || qty < 1) {
      setError('Informe uma quantidade para reestoque.')
      return
    }
    setBusyId(product.id)
    try {
      await restockProduct(product.id, qty)
      setRestockQty((current) => ({ ...current, [product.id]: '1' }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reestocar.')
    } finally {
      setBusyId(null)
    }
  }

  const tabs: { id: StockSubTab; label: string }[] = [
    { id: 'estoque', label: 'Estoque' },
    { id: 'financeiro', label: 'Financeiro' },
  ]

  function restockControls(product: Product) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={restockQty[product.id] ?? '1'}
          onChange={(e) => setRestockQty((current) => ({ ...current, [product.id]: e.target.value }))}
          className={`${inputClass(lightMode)} h-9 w-16 px-2 text-center`}
          aria-label={`Quantidade para reestoque de ${product.name}`}
        />
        <AdminButton
          variant="soft"
          className="h-9 px-3 text-xs"
          disabled={busyId === product.id}
          onClick={() => handleRestock(product)}
        >
          <PackagePlus className="size-3.5" />
          Reestoque
        </AdminButton>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none [-webkit-overflow-scrolling:touch]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              subTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : lightMode
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-slate-800 text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? <AdminError message={error} /> : null}

      {subTab === 'estoque' ? (
        <div className={sectionClass(lightMode)}>
          <div className="mb-4 flex justify-end">
            <AdminButton onClick={() => setShowForm((v) => !v)}>Novo produto</AdminButton>
          </div>
          {showForm ? (
            <form
              onSubmit={handleCreate}
              className={`mb-4 grid gap-3 rounded-lg border p-3 sm:grid-cols-5 ${lightMode ? 'border-slate-200' : 'border-slate-600'}`}
            >
              <div className="sm:col-span-2">
                <label className={labelClass(lightMode)}>Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass(lightMode)} />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Preço venda</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" required className={inputClass(lightMode)} />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Custo</label>
                <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min="0" step="0.01" className={inputClass(lightMode)} />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Estoque</label>
                <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" min="0" required className={inputClass(lightMode)} />
              </div>
              <div className="flex items-end sm:col-span-5">
                <AdminButton type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </AdminButton>
              </div>
              <label className={`sm:col-span-5 flex cursor-pointer items-center gap-2 text-xs ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={isReward}
                  onChange={(e) => setIsReward(e.target.checked)}
                  className="size-4 rounded border-indigo-300 text-indigo-600"
                />
                Disponível como prêmio de fidelidade
              </label>
            </form>
          ) : null}
          {loading ? (
            <AdminLoading lightMode={lightMode} />
          ) : activeItems.length ? (
            <div className="space-y-2">
              {activeItems.map((product) => (
                <article
                  key={product.id}
                  className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${lightMode ? 'border-slate-200' : 'border-slate-600'}`}
                >
                  <div>
                    <p className={`text-[11px] font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                      {product.name}
                      {product.isReward ? (
                        <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                          Prêmio
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {money(product.price)} · Estoque: {product.stockQuantity}
                      {product.stockQuantity <= product.minStockAlert ? ' · Baixo' : ''}
                      {' · '}
                      Lucro: {money(product.profit ?? 0)} ({product.soldQuantity ?? 0} vendidos)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {restockControls(product)}
                    <AdminButton variant="ghost" className="h-9 px-3 text-xs" onClick={() => toggleReward(product)}>
                      {product.isReward ? 'Remover prêmio' : 'Marcar prêmio'}
                    </AdminButton>
                    <AdminButton
                      className="h-9 px-3 text-xs"
                      onClick={() => handleSell(product)}
                      disabled={product.stockQuantity < 1 || busyId === product.id}
                    >
                      Vender 1
                    </AdminButton>
                    <button
                      type="button"
                      onClick={() => handleSoftDelete(product)}
                      disabled={busyId === product.id}
                      className="grid size-9 place-items-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                      aria-label={`Remover ${product.name} do estoque`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmpty lightMode={lightMode} text="Nenhum produto no estoque." />
          )}

          {archivedItems.length ? (
            <div className="mt-6 space-y-2">
              <p className={`text-xs font-bold uppercase tracking-wide ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Fora do estoque
              </p>
              {archivedItems.map((product) => (
                <article
                  key={product.id}
                  className={`flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between ${lightMode ? 'border-slate-200' : 'border-slate-600'}`}
                >
                  <div>
                    <p className={`text-[11px] font-bold ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>{product.name}</p>
                    <p className="text-[9px] text-slate-500">
                      {product.soldQuantity ?? 0} vendidos · Lucro {money(product.profit ?? 0)} · Reestoque para voltar à venda
                    </p>
                  </div>
                  {restockControls(product)}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {subTab === 'financeiro' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminStat lightMode={lightMode} label="Itens vendidos" value={String(totals.sold)} />
            <AdminStat lightMode={lightMode} label="Faturamento" value={money(totals.revenue)} />
            <AdminStat lightMode={lightMode} tone="success" label="Lucro do estoque" value={money(totals.profit)} />
          </div>
          <div className={sectionClass(lightMode)}>
            {loading ? (
              <AdminLoading lightMode={lightMode} />
            ) : items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className={lightMode ? 'text-slate-500' : 'text-slate-400'}>
                      <th className="px-2 py-2 font-semibold">Produto</th>
                      <th className="px-2 py-2 font-semibold">Vendidos</th>
                      <th className="px-2 py-2 font-semibold">Faturamento</th>
                      <th className="px-2 py-2 font-semibold">Custo</th>
                      <th className="px-2 py-2 font-semibold">Lucro</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((product) => (
                      <tr
                        key={product.id}
                        className={`border-b last:border-0 ${lightMode ? 'border-slate-100' : 'border-slate-700/80'}`}
                      >
                        <td className={`px-2 py-3 font-semibold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                          {product.name}
                        </td>
                        <td className="px-2 py-3 tabular-nums text-slate-400">{product.soldQuantity ?? 0}</td>
                        <td className="px-2 py-3 tabular-nums text-slate-300">{money(product.revenue ?? 0)}</td>
                        <td className="px-2 py-3 tabular-nums text-slate-400">{money(product.costTotal ?? 0)}</td>
                        <td className="px-2 py-3 tabular-nums font-semibold text-emerald-400">{money(product.profit ?? 0)}</td>
                        <td className="px-2 py-3">
                          <span className={isArchived(product) ? 'text-slate-500' : 'text-emerald-400'}>
                            {isArchived(product) ? 'Arquivado' : 'Ativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmpty lightMode={lightMode} text="Nenhuma venda de estoque ainda." />
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
