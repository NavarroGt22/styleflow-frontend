'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Trash2, X } from 'lucide-react'
import type { Appointment, Product } from '@/lib/admin/types'
import { completeAppointment, fetchProducts } from '@/lib/admin/api'
import { inputClass, labelClass } from './ui/AdminUi'

type CartItem = { productId: string; name: string; price: number; quantity: number }

type Props = {
  appointment: Appointment
  salonId: string
  lightMode?: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AdminCheckoutModal({ appointment, salonId, lightMode = false, onClose, onSuccess }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [prodId, setProdId] = useState('')
  const [prodQty, setProdQty] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [finalPrice, setFinalPrice] = useState(String(appointment.service?.price ?? 0).replace('.', ','))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProducts(salonId)
      .then((items) => setProducts(items.filter((p) => p.isActive !== false && p.stockQuantity > 0)))
      .catch(() => setProducts([]))
  }, [salonId])

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart])
  const servicePrice = Number(finalPrice.replace(',', '.')) || 0
  const grandTotal = servicePrice + cartTotal

  function addToCart() {
    const product = products.find((p) => p.id === prodId)
    if (!product) return
    const qty = Math.max(1, Number(prodQty) || 1)
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id)
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + qty } : item,
        )
      }
      return [...current, { productId: product.id, name: product.name, price: product.price, quantity: qty }]
    })
    setProdId('')
    setProdQty('1')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await completeAppointment(
        appointment.id,
        servicePrice,
        paymentMethod,
        cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      )
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pagamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className={`my-8 w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl ${
          lightMode ? 'bg-white' : 'bg-slate-800'
        }`}
      >
        <div
          className={`flex items-center justify-between border-b p-6 ${
            lightMode ? 'border-gray-100 bg-emerald-50' : 'border-slate-700 bg-emerald-950/20'
          }`}
        >
          <div>
            <h2 className={`text-xl font-bold ${lightMode ? 'text-emerald-900' : 'text-emerald-400'}`}>
              Finalizar & Cobrar
            </h2>
            <p className={`text-xs font-medium ${lightMode ? 'text-emerald-700' : 'text-emerald-500'}`}>
              Checkout de Agendamento
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-emerald-400 hover:text-emerald-300">
            <X className="size-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div
            className={`rounded-xl border p-4 ${
              lightMode ? 'border-gray-100 bg-gray-50' : 'border-slate-600 bg-slate-700/50'
            }`}
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className={`mb-0.5 text-xs ${lightMode ? 'text-gray-500' : 'text-slate-400'}`}>Cliente</p>
                <p className={`font-bold ${lightMode ? 'text-gray-900' : 'text-white'}`}>
                  {appointment.customer?.user?.name || 'Cliente'}
                </p>
              </div>
              <div>
                <p className={`mb-0.5 text-xs ${lightMode ? 'text-gray-500' : 'text-slate-400'}`}>Serviço Original</p>
                <p className={`font-medium ${lightMode ? 'text-gray-900' : 'text-white'}`}>
                  {appointment.service?.name || 'Serviço'}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl border border-dashed p-4 ${
              lightMode ? 'border-gray-200 bg-gray-50/20' : 'border-slate-700 bg-slate-800/20'
            }`}
          >
            <h3
              className={`mb-3 flex items-center gap-1.5 text-sm font-bold ${
                lightMode ? 'text-gray-800' : 'text-slate-200'
              }`}
            >
              <ShoppingCart className="size-4 text-emerald-500" />
              Produtos Adicionais
            </h3>
            {products.length === 0 ? (
              <p className={`text-xs italic ${lightMode ? 'text-gray-500' : 'text-slate-400'}`}>
                Nenhum produto ativo em estoque.
              </p>
            ) : (
              <div className="flex gap-2">
                <select
                  value={prodId}
                  onChange={(e) => setProdId(e.target.value)}
                  className={`${inputClass(lightMode)} flex-1 text-xs`}
                >
                  <option value="">-- Selecione o Produto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - R$ {p.price.toFixed(2)} ({p.stockQuantity} unid.)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={prodQty}
                  onChange={(e) => setProdQty(e.target.value)}
                  className={`${inputClass(lightMode)} w-16 text-center text-xs`}
                />
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!prodId}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            )}
            {cart.length > 0 ? (
              <div className="mt-4 max-h-32 space-y-2 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className={`flex items-center justify-between rounded-lg border p-2 text-xs shadow-sm ${
                      lightMode ? 'border-gray-100 bg-white' : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    <span className={`font-semibold ${lightMode ? 'text-gray-800' : 'text-slate-200'}`}>
                      {item.name} <span className="font-normal text-gray-400">x{item.quantity}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${lightMode ? 'text-gray-900' : 'text-white'}`}>
                        R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCart((c) => c.filter((i) => i.productId !== item.productId))}
                        className="p-1 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass(lightMode)}>Forma de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={inputClass(lightMode)}
              >
                <option value="PIX">PIX</option>
                <option value="CASH">Dinheiro</option>
                <option value="CREDIT_CARD">Crédito</option>
                <option value="DEBIT_CARD">Débito</option>
              </select>
            </div>
            <div>
              <label className={labelClass(lightMode)}>Valor do Serviço (R$)</label>
              <input
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                className={inputClass(lightMode)}
              />
            </div>
          </div>

          <div className={`space-y-1 text-sm ${lightMode ? 'text-gray-500' : 'text-slate-400'}`}>
            <p>Serviço: R$ {servicePrice.toFixed(2).replace('.', ',')}</p>
            <p>Produtos: R$ {cartTotal.toFixed(2).replace('.', ',')}</p>
            <p className={`text-base font-bold ${lightMode ? 'text-gray-900' : 'text-emerald-400'}`}>
              Total Geral: R$ {grandTotal.toFixed(2).replace('.', ',')}
            </p>
          </div>

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose} className="text-sm font-semibold text-gray-500">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Confirmar Recebimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
