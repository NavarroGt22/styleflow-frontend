'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Gift, Pencil, Phone, Search, Ticket, Trash2, Users } from 'lucide-react'
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
  createClientGroup,
  createCoupon,
  createLoyaltyReward,
  deleteClientGroup,
  deleteCoupon,
  deleteLoyaltyReward,
  fetchClientGroups,
  fetchCoupons,
  fetchCustomers,
  fetchLoyaltyRewards,
  fetchProducts,
  redeemLoyaltyEarn,
  updateClientGroup,
  updateCoupon,
  updateCustomer,
  type ClientGroup,
  type SalonCoupon,
} from '@/lib/admin/api'

type ClientsSubTab = 'lista' | 'grupos' | 'cupons'

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

export default function AdminClientsTab({ salonId, lightMode = false }: AdminTabProps) {
  const [subTab, setSubTab] = useState<ClientsSubTab>('lista')
  const [data, setData] = useState<CustomersListResponse | null>(null)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [groups, setGroups] = useState<ClientGroup[]>([])
  const [coupons, setCoupons] = useState<SalonCoupon[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null)

  const [groupForm, setGroupForm] = useState({
    name: '',
    color: '#3B82F6',
    description: '',
    autoAssign: false,
    criteriaType: 'CUTS' as 'CUTS' | 'REWARDS',
    criteriaValue: '10',
    resetMode: 'LIFETIME' as 'LIFETIME' | 'MONTHLY',
    sortOrder: '0',
  })
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupForm, setEditGroupForm] = useState({
    name: '',
    color: '#3B82F6',
    description: '',
    isActive: true,
    autoAssign: false,
    criteriaType: 'CUTS' as 'CUTS' | 'REWARDS',
    criteriaValue: '10',
    resetMode: 'LIFETIME' as 'LIFETIME' | 'MONTHLY',
    sortOrder: '0',
  })
  const [rewardForm, setRewardForm] = useState({
    title: '',
    description: '',
    cutsRequired: '10',
    rewardType: 'FREE_CUT' as LoyaltyRewardType,
    productId: '',
  })
  const [couponForm, setCouponForm] = useState({
    code: '',
    percentOff: '10',
    maxUsesTotal: '',
    maxUsesPerUser: '',
  })
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)

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
      const [customers, loyaltyRewards, productList, groupList, couponList] = await Promise.all([
        fetchCustomers(salonId, search),
        fetchLoyaltyRewards(salonId),
        fetchProducts(salonId),
        fetchClientGroups(salonId),
        fetchCoupons(salonId),
      ])
      setData(customers)
      setRewards(loyaltyRewards)
      setProducts(productList)
      setGroups(groupList)
      setCoupons(couponList)
      if (!selectedGroupId && groupList[0]) setSelectedGroupId(groupList[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId])

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    await load(query)
  }

  async function handleClearSearch() {
    setQuery('')
    await load('')
  }

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    try {
      await createClientGroup({
        salonId,
        name: groupForm.name,
        color: groupForm.color,
        description: groupForm.description || null,
        autoAssign: groupForm.autoAssign,
        criteriaType: groupForm.autoAssign ? groupForm.criteriaType : null,
        criteriaValue: groupForm.autoAssign ? Number(groupForm.criteriaValue) : null,
        resetMode: groupForm.resetMode,
        sortOrder: Number(groupForm.sortOrder) || 0,
      })
      setGroupForm({
        name: '',
        color: '#3B82F6',
        description: '',
        autoAssign: false,
        criteriaType: 'CUTS',
        criteriaValue: '10',
        resetMode: 'LIFETIME',
        sortOrder: '0',
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar grupo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateReward(event: FormEvent) {
    event.preventDefault()
    const groupId = editingGroupId || selectedGroupId
    if (!salonId || !groupId) {
      setError('Abra um grupo em Editar para vincular o prêmio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createLoyaltyReward({
        salonId,
        groupId,
        title: rewardForm.title,
        description: rewardForm.description || undefined,
        cutsRequired: Number(rewardForm.cutsRequired),
        rewardType: rewardForm.productId ? 'PRODUCT' : rewardForm.rewardType,
        productId: rewardForm.productId || null,
      })
      setRewardForm({ title: '', description: '', cutsRequired: '10', rewardType: 'FREE_CUT', productId: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar prêmio.')
    } finally {
      setSaving(false)
    }
  }

  function startEditGroup(group: ClientGroup) {
    setEditingGroupId(group.id)
    setSelectedGroupId(group.id)
    setEditGroupForm({
      name: group.name,
      color: group.color || '#3B82F6',
      description: group.description || '',
      isActive: group.isActive !== false,
      autoAssign: Boolean(group.autoAssign),
      criteriaType: group.criteriaType === 'REWARDS' ? 'REWARDS' : 'CUTS',
      criteriaValue: String(group.criteriaValue ?? 10),
      resetMode: group.resetMode === 'MONTHLY' ? 'MONTHLY' : 'LIFETIME',
      sortOrder: String(group.sortOrder ?? 0),
    })
    setError('')
  }

  async function handleSaveGroup(event: FormEvent) {
    event.preventDefault()
    if (!editingGroupId) return
    setSaving(true)
    setError('')
    try {
      await updateClientGroup(editingGroupId, {
        name: editGroupForm.name,
        color: editGroupForm.color,
        description: editGroupForm.description || null,
        isActive: editGroupForm.isActive,
        autoAssign: editGroupForm.autoAssign,
        criteriaType: editGroupForm.autoAssign ? editGroupForm.criteriaType : null,
        criteriaValue: editGroupForm.autoAssign ? Number(editGroupForm.criteriaValue) : null,
        resetMode: editGroupForm.resetMode,
        sortOrder: Number(editGroupForm.sortOrder) || 0,
      })
      setEditingGroupId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar grupo.')
    } finally {
      setSaving(false)
    }
  }

  const editingGroup = useMemo(
    () => groups.find((g) => g.id === editingGroupId) ?? null,
    [groups, editingGroupId],
  )

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [groups],
  )

  async function handleCreateCoupon(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    try {
      await createCoupon({
        salonId,
        code: couponForm.code,
        name: couponForm.code.trim(),
        percentOff: Number(couponForm.percentOff),
        maxUsesTotal: couponForm.maxUsesTotal ? Number(couponForm.maxUsesTotal) : null,
        maxUsesPerUser: couponForm.maxUsesPerUser ? Number(couponForm.maxUsesPerUser) : null,
      })
      setCouponForm({ code: '', percentOff: '10', maxUsesTotal: '', maxUsesPerUser: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cupom.')
    } finally {
      setSaving(false)
    }
  }

  function startEditCustomer(customer: { id: string; name: string; phone?: string | null }) {
    setEditingCustomerId(customer.id)
    setEditName(customer.name)
    setEditPhone(customer.phone || '')
    setError('')
  }

  async function saveCustomerEdit() {
    if (!salonId || !editingCustomerId) return
    setSavingCustomer(true)
    setError('')
    try {
      await updateCustomer(editingCustomerId, {
        salonId,
        name: editName.trim(),
        phone: editPhone.trim() || null,
      })
      setEditingCustomerId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar cliente.')
    } finally {
      setSavingCustomer(false)
    }
  }

  const tabs: { id: ClientsSubTab; label: string }[] = [
    { id: 'lista', label: 'Lista' },
    { id: 'grupos', label: 'Grupos' },
    { id: 'cupons', label: 'Cupons' },
  ]

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
      {loading && !data ? <AdminLoading lightMode={lightMode} /> : null}

      {subTab === 'lista' && data ? (
        <>
          <div>
            <h3 className={`text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>Lista de Clientes</h3>
            <p className={`mt-1 text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Cortes no período atual (
              {data.loyaltyResetMode === 'MONTHLY' ? 'mensal' : 'infinito'}
              ) · busque por nome ou telefone
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AdminStat
              lightMode={lightMode}
              label="Total de Clientes"
              value={String(data.summary.totalCustomers)}
            />
            <AdminStat
              lightMode={lightMode}
              label="Cortes no Período"
              value={String(data.summary.totalCutsInPeriod)}
            />
            <AdminStat
              lightMode={lightMode}
              tone="success"
              label="Prêmios Disponíveis"
              value={String(data.summary.availableRewards)}
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
            <div className="flex gap-2">
              <AdminButton type="submit" className="flex-1 sm:flex-none">
                Buscar
              </AdminButton>
              <AdminButton type="button" variant="ghost" className="flex-1 sm:flex-none" onClick={handleClearSearch}>
                Limpar
              </AdminButton>
            </div>
          </form>

          <div className={`${sectionClass(lightMode)} overflow-hidden p-0`}>
            {!data.customers.length ? (
              <div className="p-4">
                <AdminEmpty lightMode={lightMode} text="Nenhum cliente encontrado." />
              </div>
            ) : (
              <>
                {/* Mobile: cards — scroll vertical da página livre */}
                <ul className={`divide-y sm:hidden ${lightMode ? 'divide-slate-100' : 'divide-slate-700/80'}`}>
                  {data.customers.map((customer) => (
                    <li key={customer.id} className="px-3 py-3">
                      {editingCustomerId === customer.id ? (
                        <div className="grid gap-2">
                          <div>
                            <label className={labelClass(lightMode)}>Nome</label>
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className={inputClass(lightMode)}
                              required
                            />
                          </div>
                          <div>
                            <label className={labelClass(lightMode)}>Telefone</label>
                            <input
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="(11) 99999-9999"
                              className={inputClass(lightMode)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <AdminButton type="button" disabled={savingCustomer} onClick={saveCustomerEdit}>
                              {savingCustomer ? 'Salvando...' : 'Salvar'}
                            </AdminButton>
                            <AdminButton type="button" variant="ghost" onClick={() => setEditingCustomerId(null)}>
                              Cancelar
                            </AdminButton>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                            {initials(customer.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate font-semibold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                              {customer.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              <Phone className="mr-1 inline size-3" />
                              {formatPhone(customer.phone)}
                            </p>
                            {customer.availableRewards.length ? (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {customer.availableRewards.map((earn) => (
                                  <button
                                    key={earn.earnId}
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300"
                                    onClick={() => redeemLoyaltyEarn(earn.earnId).then(() => load())}
                                  >
                                    <Gift className="size-3" />
                                    {earn.title}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className="text-base font-bold tabular-nums text-emerald-400">
                              {customer.completedCuts}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditCustomer(customer)}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-700/80 px-2 py-1 text-[11px] font-semibold text-slate-100"
                            >
                              <Pencil className="size-3" /> Editar
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Desktop: tabela */}
                <div className="hidden scrollbar-none overflow-x-auto sm:block [-webkit-overflow-scrolling:touch]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className={`border-b text-left text-[11px] font-bold uppercase tracking-wide ${
                          lightMode ? 'border-slate-200 text-slate-500' : 'border-slate-700 text-slate-500'
                        }`}
                      >
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Telefone</th>
                        <th className="px-4 py-3">Cortes</th>
                        <th className="px-4 py-3">Prêmios</th>
                        <th className="px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.map((customer) => (
                        <tr
                          key={customer.id}
                          className={`border-b last:border-0 ${lightMode ? 'border-slate-100' : 'border-slate-700/80'}`}
                        >
                          {editingCustomerId === customer.id ? (
                            <td colSpan={5} className="px-4 py-3">
                              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                                <div>
                                  <label className={labelClass(lightMode)}>Nome</label>
                                  <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className={inputClass(lightMode)}
                                    required
                                  />
                                </div>
                                <div>
                                  <label className={labelClass(lightMode)}>Telefone</label>
                                  <input
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                    className={inputClass(lightMode)}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <AdminButton type="button" disabled={savingCustomer} onClick={saveCustomerEdit}>
                                    {savingCustomer ? 'Salvando...' : 'Salvar'}
                                  </AdminButton>
                                </div>
                                <div className="flex items-end">
                                  <AdminButton type="button" variant="ghost" onClick={() => setEditingCustomerId(null)}>
                                    Cancelar
                                  </AdminButton>
                                </div>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="grid size-9 place-items-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                                    {initials(customer.name)}
                                  </div>
                                  <p className={`font-semibold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                                    {customer.name}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-400">
                                <Phone className="mr-1 inline size-3" />
                                {formatPhone(customer.phone)}
                              </td>
                              <td className="px-4 py-3 font-semibold tabular-nums text-emerald-400">
                                {customer.completedCuts}
                              </td>
                              <td className="px-4 py-3 text-slate-400">
                                {customer.availableRewards.length
                                  ? customer.availableRewards.map((earn) => (
                                      <button
                                        key={earn.earnId}
                                        type="button"
                                        className="mr-1 inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300"
                                        onClick={() => redeemLoyaltyEarn(earn.earnId).then(() => load())}
                                      >
                                        <Gift className="size-3" />
                                        {earn.title}
                                      </button>
                                    ))
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => startEditCustomer(customer)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-700/80 px-2.5 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-600"
                                >
                                  <Pencil className="size-3.5" /> Editar
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}

      {subTab === 'grupos' ? (
        <div className="space-y-4">
          <div>
            <h3 className={`flex items-center gap-2 text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
              <Users className="size-5" /> Grupos de clientes
            </h3>
            <p className={`mt-1 text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Escada de níveis só no painel admin. O app do cliente não mostra grupos. Valor = cortes/prêmios
              necessários (≥). Ordem = qual nível vem primeiro na promoção automática.
            </p>
          </div>

          <form onSubmit={handleCreateGroup} className={`${sectionClass(lightMode)} space-y-3`}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Novo grupo</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass(lightMode)}>Nome do grupo *</label>
                <input
                  required
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className={inputClass(lightMode)}
                />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Cor</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={groupForm.color}
                    onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
                    className="h-11 w-14 rounded-lg border border-slate-600 bg-transparent"
                  />
                  <input
                    value={groupForm.color}
                    onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
                    className={inputClass(lightMode)}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass(lightMode)}>Descrição</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  rows={2}
                  placeholder="Ex.: clientes VIP após 10 cortes"
                  className={`${inputClass(lightMode)} h-auto py-3`}
                />
              </div>
            </div>
            <label className={`flex items-start gap-2 text-sm ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
              <input
                type="checkbox"
                checked={groupForm.autoAssign}
                onChange={(e) => setGroupForm({ ...groupForm, autoAssign: e.target.checked })}
                className="mt-1"
              />
              Atribuir automaticamente quando o cliente atingir o critério (nunca remove quem entrou manualmente)
            </label>
            {groupForm.autoAssign ? (
              <div className="grid gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass(lightMode)}>Critério</label>
                  <select
                    value={groupForm.criteriaType}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, criteriaType: e.target.value as 'CUTS' | 'REWARDS' })
                    }
                    className={inputClass(lightMode)}
                  >
                    <option value="CUTS">Cortes de cabelo</option>
                    <option value="REWARDS">Prêmios ganhos</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass(lightMode)}>Quantidade mínima (≥)</label>
                  <input
                    type="number"
                    min={1}
                    value={groupForm.criteriaValue}
                    onChange={(e) => setGroupForm({ ...groupForm, criteriaValue: e.target.value })}
                    className={inputClass(lightMode)}
                  />
                </div>
                <div>
                  <label className={labelClass(lightMode)}>Contagem</label>
                  <select
                    value={groupForm.resetMode}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, resetMode: e.target.value as 'LIFETIME' | 'MONTHLY' })
                    }
                    className={inputClass(lightMode)}
                  >
                    <option value="LIFETIME">Infinito (lifetime)</option>
                    <option value="MONTHLY">Reset por mês</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass(lightMode)}>Ordem na escada</label>
                  <input
                    type="number"
                    value={groupForm.sortOrder}
                    onChange={(e) => setGroupForm({ ...groupForm, sortOrder: e.target.value })}
                    className={inputClass(lightMode)}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Menor número = sobe primeiro (ex.: 0 → 1 → 2)</p>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end">
              <AdminButton type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Criar grupo'}
              </AdminButton>
            </div>
          </form>

          <div className={`${sectionClass(lightMode)} overflow-hidden p-0`}>
            <div className="scrollbar-none overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b text-left text-[11px] font-bold uppercase tracking-wide ${lightMode ? 'border-slate-200 text-slate-500' : 'border-slate-700 text-slate-500'}`}>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Critério</th>
                    <th className="px-4 py-3">Ordem</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.map((group) => (
                    <tr
                      key={group.id}
                      className={`border-b last:border-0 ${lightMode ? 'border-slate-100' : 'border-slate-700/80'} ${
                        editingGroupId === group.id ? 'bg-indigo-500/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="mt-1 size-3 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                          <div>
                            <p className={`font-semibold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{group.name}</p>
                            {group.description ? (
                              <p className="mt-0.5 max-w-xs text-xs text-slate-500">{group.description}</p>
                            ) : null}
                            <p className="mt-1 text-[11px] text-slate-500">
                              {group._count?.members ?? 0} membros · {group._count?.rewards ?? 0} prêmios
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {group.autoAssign
                          ? `${group.criteriaType === 'REWARDS' ? 'Prêmios' : 'Cortes'} ≥ ${group.criteriaValue ?? '—'} (${group.resetMode === 'MONTHLY' ? 'mês' : 'lifetime'})`
                          : 'Manual'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-300">{group.sortOrder ?? 0}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            group.isActive !== false
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {group.isActive !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditGroup(group)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-700/80 px-2.5 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-600"
                            title="Editar grupo e prêmios"
                          >
                            <Pencil className="size-3.5" /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Excluir o grupo "${group.name}"?`)) return
                              await deleteClientGroup(group.id)
                              if (editingGroupId === group.id) setEditingGroupId(null)
                              await load()
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25"
                          >
                            <Trash2 className="size-3.5" /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!sortedGroups.length ? (
              <div className="p-4">
                <AdminEmpty lightMode={lightMode} text="Nenhum grupo criado ainda." />
              </div>
            ) : null}
          </div>

          {editingGroup ? (
            <div className={`${sectionClass(lightMode)} space-y-4 border-indigo-500/40`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-4 rounded-full" style={{ backgroundColor: editGroupForm.color }} />
                  <h4 className={`text-base font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                    Editar: {editingGroup.name}
                  </h4>
                </div>
                <AdminButton type="button" variant="ghost" onClick={() => setEditingGroupId(null)}>
                  Fechar
                </AdminButton>
              </div>

              <form onSubmit={handleSaveGroup} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass(lightMode)}>Nome *</label>
                    <input
                      required
                      value={editGroupForm.name}
                      onChange={(e) => setEditGroupForm({ ...editGroupForm, name: e.target.value })}
                      className={inputClass(lightMode)}
                    />
                  </div>
                  <div>
                    <label className={labelClass(lightMode)}>Cor</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editGroupForm.color}
                        onChange={(e) => setEditGroupForm({ ...editGroupForm, color: e.target.value })}
                        className="h-11 w-14 rounded-lg border border-slate-600 bg-transparent"
                      />
                      <input
                        value={editGroupForm.color}
                        onChange={(e) => setEditGroupForm({ ...editGroupForm, color: e.target.value })}
                        className={inputClass(lightMode)}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass(lightMode)}>Descrição</label>
                    <textarea
                      value={editGroupForm.description}
                      onChange={(e) => setEditGroupForm({ ...editGroupForm, description: e.target.value })}
                      rows={2}
                      className={`${inputClass(lightMode)} h-auto py-3`}
                    />
                  </div>
                  <div>
                    <label className={labelClass(lightMode)}>Ordem na escada</label>
                    <input
                      type="number"
                      value={editGroupForm.sortOrder}
                      onChange={(e) => setEditGroupForm({ ...editGroupForm, sortOrder: e.target.value })}
                      className={inputClass(lightMode)}
                    />
                  </div>
                  <label className={`flex items-center gap-2 self-end pb-2 text-sm ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input
                      type="checkbox"
                      checked={editGroupForm.isActive}
                      onChange={(e) => setEditGroupForm({ ...editGroupForm, isActive: e.target.checked })}
                    />
                    Grupo ativo
                  </label>
                </div>

                <label className={`flex items-start gap-2 text-sm ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                  <input
                    type="checkbox"
                    checked={editGroupForm.autoAssign}
                    onChange={(e) => setEditGroupForm({ ...editGroupForm, autoAssign: e.target.checked })}
                    className="mt-1"
                  />
                  Atribuir automaticamente quando cumprir o critério
                </label>

                {editGroupForm.autoAssign ? (
                  <div className="grid gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass(lightMode)}>Critério</label>
                      <select
                        value={editGroupForm.criteriaType}
                        onChange={(e) =>
                          setEditGroupForm({
                            ...editGroupForm,
                            criteriaType: e.target.value as 'CUTS' | 'REWARDS',
                          })
                        }
                        className={inputClass(lightMode)}
                      >
                        <option value="CUTS">Cortes de cabelo</option>
                        <option value="REWARDS">Prêmios ganhos</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass(lightMode)}>Quantidade mínima (≥)</label>
                      <input
                        type="number"
                        min={1}
                        value={editGroupForm.criteriaValue}
                        onChange={(e) => setEditGroupForm({ ...editGroupForm, criteriaValue: e.target.value })}
                        className={inputClass(lightMode)}
                      />
                    </div>
                    <div>
                      <label className={labelClass(lightMode)}>Contagem</label>
                      <select
                        value={editGroupForm.resetMode}
                        onChange={(e) =>
                          setEditGroupForm({
                            ...editGroupForm,
                            resetMode: e.target.value as 'LIFETIME' | 'MONTHLY',
                          })
                        }
                        className={inputClass(lightMode)}
                      >
                        <option value="LIFETIME">Infinito (lifetime)</option>
                        <option value="MONTHLY">Reset por mês</option>
                      </select>
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-end gap-2">
                  <AdminButton type="button" variant="ghost" onClick={() => setEditingGroupId(null)}>
                    Cancelar
                  </AdminButton>
                  <AdminButton type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar grupo'}
                  </AdminButton>
                </div>
              </form>

              <div className={`border-t pt-4 ${lightMode ? 'border-slate-200' : 'border-slate-700'}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Prêmios deste grupo
                </p>
                <div className="mb-3 space-y-2">
                  {(editingGroup.rewards ?? []).length ? (
                    (editingGroup.rewards ?? []).map((reward) => (
                      <div
                        key={reward.id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                          lightMode ? 'border-slate-200' : 'border-slate-600'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-semibold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                            {reward.title}
                          </p>
                          <p className="text-xs text-slate-400">a cada {reward.cutsRequired} cortes</p>
                        </div>
                        <button
                          type="button"
                          className="text-xs font-semibold text-rose-400"
                          onClick={() => deleteLoyaltyReward(reward.id).then(() => load())}
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Nenhum prêmio neste grupo ainda.</p>
                  )}
                </div>

                <form onSubmit={handleCreateReward} className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass(lightMode)}>Título do prêmio</label>
                    <input
                      required
                      value={rewardForm.title}
                      onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                      className={inputClass(lightMode)}
                    />
                  </div>
                  <div>
                    <label className={labelClass(lightMode)}>Cortes necessários</label>
                    <input
                      required
                      type="number"
                      min={1}
                      value={rewardForm.cutsRequired}
                      onChange={(e) => setRewardForm({ ...rewardForm, cutsRequired: e.target.value })}
                      className={inputClass(lightMode)}
                    />
                  </div>
                  <div>
                    <label className={labelClass(lightMode)}>Tipo</label>
                    <select
                      value={rewardForm.rewardType}
                      onChange={(e) =>
                        setRewardForm({ ...rewardForm, rewardType: e.target.value as LoyaltyRewardType })
                      }
                      className={inputClass(lightMode)}
                    >
                      <option value="FREE_CUT">Corte grátis</option>
                      <option value="CUSTOM_TEXT">Texto customizado</option>
                      <option value="PRODUCT">Produto do estoque</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass(lightMode)}>Produto prêmio (opcional)</label>
                    <select
                      value={rewardForm.productId}
                      onChange={(e) => setRewardForm({ ...rewardForm, productId: e.target.value })}
                      className={inputClass(lightMode)}
                    >
                      <option value="">Nenhum</option>
                      {rewardProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <AdminButton type="submit" disabled={saving}>
                      <Gift className="size-3.5" /> Adicionar prêmio a este grupo
                    </AdminButton>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {rewards.filter((r) => !(r as LoyaltyReward & { groupId?: string }).groupId).length ? (
            <div className={sectionClass(lightMode)}>
              <p className="mb-2 text-xs text-slate-400">Prêmios antigos (sem grupo) — ainda válidos</p>
              {rewards
                .filter((r) => !(r as LoyaltyReward & { groupId?: string }).groupId)
                .map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between py-1 text-sm">
                    <span>{reward.title}</span>
                    <button
                      type="button"
                      className="text-xs text-rose-400"
                      onClick={() => deleteLoyaltyReward(reward.id).then(() => load())}
                    >
                      Excluir
                    </button>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {subTab === 'cupons' ? (
        <div className="space-y-4">
          <div>
            <h3 className={`flex items-center gap-2 text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
              <Ticket className="size-5" /> Cupons
            </h3>
            <p className={`mt-1 text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Sempre percentual sobre o valor do corte. O cliente aplica o código no resumo da reserva.
            </p>
          </div>
          <form onSubmit={handleCreateCoupon} className={`${sectionClass(lightMode)} space-y-3`}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Informações básicas</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass(lightMode)}>Código do cupom *</label>
                <input
                  required
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  placeholder="corte10"
                  className={inputClass(lightMode)}
                />
                <p className="mt-1 text-[10px] text-slate-500">É o código que o cliente digita no resumo da reserva.</p>
              </div>
              <div>
                <label className={labelClass(lightMode)}>Percentual de desconto (%) *</label>
                <input required type="number" min={1} max={100} value={couponForm.percentOff} onChange={(e) => setCouponForm({ ...couponForm, percentOff: e.target.value })} className={inputClass(lightMode)} />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Limites de uso</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass(lightMode)}>Uso por usuário</label>
                <input type="number" min={1} value={couponForm.maxUsesPerUser} onChange={(e) => setCouponForm({ ...couponForm, maxUsesPerUser: e.target.value })} placeholder="Ilimitado" className={inputClass(lightMode)} />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Uso total</label>
                <input type="number" min={1} value={couponForm.maxUsesTotal} onChange={(e) => setCouponForm({ ...couponForm, maxUsesTotal: e.target.value })} placeholder="Ilimitado" className={inputClass(lightMode)} />
              </div>
            </div>
            <AdminButton type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Criar cupom'}</AdminButton>
          </form>

          <div className={sectionClass(lightMode)}>
            {!coupons.length ? (
              <AdminEmpty lightMode={lightMode} text="Nenhum cupom cadastrado." />
            ) : (
              <div className="space-y-2">
                {coupons.map((coupon) => {
                  const isToggling = togglingCouponId === coupon.id
                  return (
                  <div
                    key={coupon.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all duration-300 ${
                      isToggling ? 'scale-[0.99] opacity-80' : 'scale-100 opacity-100'
                    } ${
                      coupon.isActive
                        ? lightMode
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : 'border-emerald-500/40 bg-emerald-500/5'
                        : lightMode
                          ? 'border-slate-200 bg-slate-50/50'
                          : 'border-slate-600 bg-slate-900/20'
                    }`}
                  >
                    <div>
                      <p className={`font-semibold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                        {coupon.code} · {coupon.percentOff}%
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-300 ${
                            coupon.isActive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {coupon.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        usos {coupon._count?.redemptions ?? 0}
                        {coupon.maxUsesTotal != null ? ` / ${coupon.maxUsesTotal}` : ''}
                        {coupon.maxUsesPerUser != null ? ` · máx ${coupon.maxUsesPerUser}/usuário` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AdminButton
                        variant={coupon.isActive ? 'ghost' : 'success'}
                        disabled={isToggling}
                        className={`min-w-[110px] transition-all duration-300 ${
                          isToggling ? 'scale-95 animate-pulse' : 'hover:scale-[1.02] active:scale-95'
                        }`}
                        onClick={async () => {
                          setTogglingCouponId(coupon.id)
                          try {
                            await updateCoupon(coupon.id, { isActive: !coupon.isActive })
                            await load()
                          } finally {
                            setTogglingCouponId(null)
                          }
                        }}
                      >
                        {isToggling
                          ? coupon.isActive
                            ? 'Desativando...'
                            : 'Ativando...'
                          : coupon.isActive
                            ? 'Desativar'
                            : 'Ativar'}
                      </AdminButton>
                      <AdminButton
                        variant="danger"
                        disabled={isToggling}
                        onClick={async () => {
                          if (!confirm('Excluir cupom?')) return
                          await deleteCoupon(coupon.id)
                          await load()
                        }}
                      >
                        Excluir
                      </AdminButton>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
