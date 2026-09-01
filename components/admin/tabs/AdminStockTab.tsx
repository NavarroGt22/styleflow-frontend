'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AdminButton, AdminEmpty, AdminError, AdminLoading, inputClass, labelClass, sectionClass } from '../ui/AdminUi'
import type { AdminTabProps, Product } from '@/lib/admin/types'
import { createProduct, fetchProducts, sellProduct, updateProduct } from '@/lib/admin/api'

export default function AdminStockTab({ salonId, lightMode = false }: AdminTabProps) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('25')
  const [stock, setStock] = useState('10')
  const [isReward, setIsReward] = useState(false)
  const [saving, setSaving] = useState(false)

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
    if (!salonId || product.stockQuantity < 1) return
    try {
      await sellProduct({ salonId, productId: product.id, quantity: 1 })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vender.')
    }
  }

  async function toggleReward(product: Product) {
    try {
      await updateProduct(product.id, { isReward: !product.isReward })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar prêmio.')
    }
  }

  return (
    <section className={sectionClass(lightMode)}>
      <div className="mb-4 flex justify-end">
        <AdminButton onClick={() => setShowForm((v) => !v)}>Novo produto</AdminButton>
      </div>
      {error ? (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      ) : null}
      {showForm ? (
        <form
          onSubmit={handleCreate}
          className={`mb-4 grid gap-3 rounded-lg border p-3 sm:grid-cols-4 ${lightMode ? 'border-slate-200' : 'border-slate-600'}`}
        >
          <div>
            <label className={labelClass(lightMode)}>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass(lightMode)} />
          </div>
          <div>
            <label className={labelClass(lightMode)}>Preço</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" required className={inputClass(lightMode)} />
          </div>
          <div>
            <label className={labelClass(lightMode)}>Estoque</label>
            <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" min="0" required className={inputClass(lightMode)} />
          </div>
          <div className="flex items-end">
            <AdminButton type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </AdminButton>
          </div>
          <label className={`sm:col-span-4 flex cursor-pointer items-center gap-2 text-xs ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
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
      ) : items.length ? (
        <div className="space-y-2">
          {items.map((product) => (
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
                  R$ {product.price.toFixed(2)} · Estoque: {product.stockQuantity}
                  {product.stockQuantity <= product.minStockAlert ? ' · Baixo' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton variant="ghost" onClick={() => toggleReward(product)}>
                  {product.isReward ? 'Remover prêmio' : 'Marcar prêmio'}
                </AdminButton>
                <AdminButton onClick={() => handleSell(product)} disabled={product.stockQuantity < 1}>
                  Vender 1
                </AdminButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <AdminEmpty lightMode={lightMode} text="Nenhum produto no estoque." />
      )}
    </section>
  )
}
