'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Gift, Phone, Search, Users } from 'lucide-react'
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
import type {
  AdminTabProps,
  CustomersListResponse,
  LoyaltyReward,
  LoyaltyRewardType,
  Product,
} from '@/lib/admin/types'
import {
  createLoyaltyReward,
  deleteLoyaltyReward,
  fetchCustomers,
  fetchLoyaltyRewards,
  fetchProducts,
  redeemLoyaltyEarn,
  updateLoyaltyReward,
} from '@/lib/admin/api'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function formatPhone(phone?: string | null) {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

function isInternalClientEmail(email?: string | null) {
  if (!email) return true
  return email.endsWith('@clients.styleflow') || email.startsWith('c.')
}

export default function AdminClientsTab({ salonId, lightMode = false }: AdminTabProps) {
  const [data, setData] = useState<CustomersListResponse | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    cutsRequired: '10',
    rewardType: 'FREE_CUT' as LoyaltyRewardType,
    productId: '',
  })

  const rewardProducts = useMemo(
    () => products.filter((p) => p.isReward && p.isActive !== false),
    [products],
  )

  async function load(search = query) {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado. Faça login novamente.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [customers, loyaltyRewards, productList] = await Promise.all([
        fetchCustomers(salonId, search),
        fetchLoyaltyRewards(salonId),
        fetchProducts(salonId),
      ])
      setData(customers)
      setRewards(loyaltyRewards)
      setProducts(productList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    await load(query)
  }

  async function handleCreateReward(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    try {
      await createLoyaltyReward({
        salonId,
        title: form.title,
        description: form.description || undefined,
        cutsRequired: Number(form.cutsRequired),
        rewardType: form.productId ? 'PRODUCT' : form.rewardType,
        productId: form.productId || null,
      })
      setForm({ title: '', description: '', cutsRequired: '10', rewardType: 'FREE_CUT', productId: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar prêmio.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRedeem(earnId: string) {
    if (!confirm('Confirmar resgate deste prêmio?')) return
    try {
      await redeemLoyaltyEarn(earnId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao resgatar.')
    }
  }

  async function toggleReward(reward: LoyaltyReward) {
    try {
      await updateLoyaltyReward(reward.id, { isActive: !reward.isActive })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar prêmio.')
    }
  }

  async function removeReward(id: string) {
    if (!confirm('Excluir esta regra de fidelidade?')) return
    try {
      await deleteLoyaltyReward(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className={`text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
          Lista de Clientes
        </h3>
        <p className={`mt-1 text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Cortes no período atual
          {data?.periodKey ? ` (${data.periodKey === 'lifetime' ? 'infinito' : data.periodKey})` : ''}
          · busque por nome ou telefone
        </p>
      </div>

      {error ? <AdminError message={error} /> : null}

      {loading && !data ? (
        <AdminLoading lightMode={lightMode} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminStat
              lightMode={lightMode}
              label="Total de clientes"
              value={String(data?.summary.totalCustomers ?? 0)}
            />
            <AdminStat
              lightMode={lightMode}
              label="Cortes no período"
              value={String(data?.summary.totalCutsInPeriod ?? 0)}
            />
            <AdminStat
              lightMode={lightMode}
              label="Prêmios disponíveis"
              value={String(data?.summary.availableRewards ?? 0)}
              tone="success"
            />
          </div>

          <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar por nome ou telefone"
                className={`${inputClass(lightMode)} pl-9`}
              />
            </div>
            <AdminButton type="submit">Buscar</AdminButton>
            <AdminButton
              type="button"
              variant="ghost"
              onClick={() => {
                setQuery('')
                load('')
              }}
            >
              Limpar
            </AdminButton>
          </form>

          <div className={sectionClass(lightMode)}>
            {data?.customers.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className={`border-b text-[10px] uppercase tracking-wide ${lightMode ? 'border-slate-200 text-slate-500' : 'border-slate-700 text-slate-400'}`}>
                      <th className="px-2 py-2 font-semibold">Cliente</th>
                      <th className="px-2 py-2 font-semibold">Telefone</th>
                      <th className="px-2 py-2 font-semibold">Cortes</th>
                      <th className="px-2 py-2 font-semibold">Prêmios</th>
                      <th className="px-2 py-2 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className={`border-b last:border-0 ${lightMode ? 'border-slate-100' : 'border-slate-800'}`}
                      >
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <span className="grid size-8 place-items-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300">
                              {initials(customer.name) || <Users className="size-3" />}
                            </span>
                            <div>
                              <p className={`font-semibold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                                {customer.name}
                              </p>
                              {!isInternalClientEmail(customer.email) ? (
                                <p className="text-[11px] text-slate-400">{customer.email}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <span className="inline-flex items-center gap-1 text-slate-300">
                            <Phone className="size-3.5 opacity-60" />
                            {formatPhone(customer.phone)}
                          </span>
                        </td>
                        <td className="px-2 py-3 font-bold text-emerald-400">{customer.completedCuts}</td>
                        <td className="px-2 py-3">
                          {customer.availableRewards.length ? (
                            <div className="flex flex-wrap gap-1">
                              {customer.availableRewards.map((r) => (
                                <span
                                  key={r.earnId}
                                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                                >
                                  {r.title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-wrap gap-1">
                            {customer.availableRewards.map((r) => (
                              <AdminButton key={r.earnId} onClick={() => handleRedeem(r.earnId)}>
                                Resgatar
                              </AdminButton>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmpty lightMode={lightMode} text="Nenhum cliente encontrado." />
            )}
          </div>

          <div className={sectionClass(lightMode)}>
            <div className="mb-4 flex items-center gap-2">
              <Gift className="size-4 text-indigo-400" />
              <h4 className={`text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                Prêmios / Fidelidade
              </h4>
            </div>
            <p className={`mb-4 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Escreva a regra em texto livre (ex.: a cada 10 cortes o 11º é grátis). Opcionalmente vincule um
              produto marcado como prêmio no estoque.
            </p>

            <form
              onSubmit={handleCreateReward}
              className={`mb-4 grid gap-3 rounded-lg border p-3 md:grid-cols-2 ${lightMode ? 'border-slate-200' : 'border-slate-600'}`}
            >
              <div className="md:col-span-2">
                <label className={labelClass(lightMode)}>Título do prêmio</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="A cada 10 cortes o 11º é de graça"
                  className={inputClass(lightMode)}
                />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Cortes necessários</label>
                <input
                  type="number"
                  min="1"
                  value={form.cutsRequired}
                  onChange={(e) => setForm({ ...form, cutsRequired: e.target.value })}
                  required
                  className={inputClass(lightMode)}
                />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Tipo</label>
                <select
                  value={form.rewardType}
                  onChange={(e) => setForm({ ...form, rewardType: e.target.value as LoyaltyRewardType })}
                  className={inputClass(lightMode)}
                  disabled={!!form.productId}
                >
                  <option value="FREE_CUT">Corte grátis</option>
                  <option value="CUSTOM_TEXT">Texto / benefício</option>
                  <option value="PRODUCT">Produto do estoque</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass(lightMode)}>Produto prêmio (opcional)</label>
                <select
                  value={form.productId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      productId: e.target.value,
                      rewardType: e.target.value ? 'PRODUCT' : form.rewardType === 'PRODUCT' ? 'FREE_CUT' : form.rewardType,
                    })
                  }
                  className={inputClass(lightMode)}
                >
                  <option value="">Sem produto (só texto / corte grátis)</option>
                  {rewardProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · estoque {p.stockQuantity}
                    </option>
                  ))}
                </select>
                {!rewardProducts.length ? (
                  <p className="mt-1 text-[10px] text-slate-400">
                    Marque produtos como prêmio na aba Estoque para aparecerem aqui.
                  </p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className={labelClass(lightMode)}>Descrição (opcional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass(lightMode)}
                  placeholder="Detalhes que o cliente verá no app"
                />
              </div>
              <div className="md:col-span-2">
                <AdminButton type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Adicionar regra'}
                </AdminButton>
              </div>
            </form>

            {rewards.length ? (
              <div className="space-y-2">
                {rewards.map((reward) => (
                  <article
                    key={reward.id}
                    className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${lightMode ? 'border-slate-200' : 'border-slate-600'}`}
                  >
                    <div>
                      <p className={`text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                        {reward.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        A cada {reward.cutsRequired} cortes · {reward.rewardType}
                        {reward.product ? ` · ${reward.product.name}` : ''}
                        {!reward.isActive ? ' · inativa' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AdminButton variant="ghost" onClick={() => toggleReward(reward)}>
                        {reward.isActive ? 'Desativar' : 'Ativar'}
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => removeReward(reward.id)}>
                        Excluir
                      </AdminButton>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <AdminEmpty lightMode={lightMode} text="Nenhuma regra de fidelidade cadastrada." />
            )}
          </div>
        </>
      )}
    </section>
  )
}
