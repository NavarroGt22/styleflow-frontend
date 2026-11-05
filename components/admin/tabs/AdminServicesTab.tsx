'use client'

import { CheckCircle2, Clock3, Pencil, Plus, Scissors, Search, Trash2, XCircle } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AdminButton,
  AdminConfirm,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  inputClass,
  labelClass,
  sectionClass,
} from '../ui/AdminUi'
import type { AdminTabProps, Service } from '@/lib/admin/types'
import { createService, deleteService, fetchServices, updateService } from '@/lib/admin/api'
import { cutServiceIdsAmong } from '@/lib/admin/service-helpers'

const CATEGORIES = ['Cabelo', 'Sobrancelha', 'Coloração', 'Barba', 'Unha', 'Maquiagem', 'Depilação', 'Estética']

const emptyForm = {
  name: '',
  category: 'Cabelo',
  customCategory: '',
  price: '',
  duration: '',
  standaloneAllowed: true,
  addonAllowed: false,
  addonHostServiceIds: [] as string[],
  comboItemServiceIds: [] as string[],
  isDefaultCutAddon: false,
}

export default function AdminServicesTab({ salonId, lightMode = false }: AdminTabProps) {
  const [query, setQuery] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [togglingFixedId, setTogglingFixedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado. Faça login novamente.')
      return
    }
    setLoading(true)
    setError('')
    try {
      setServices(await fetchServices(salonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar serviços.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  const filtered = useMemo(
    () => services.filter((s) => `${s.name} ${s.category}`.toLowerCase().includes(query.toLowerCase())),
    [services, query],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(service: Service) {
    setEditing(service)
    const isKnown = CATEGORIES.includes(service.category)
    setForm({
      name: service.name,
      category: isKnown ? service.category : 'custom',
      customCategory: isKnown ? '' : service.category,
      price: String(service.price),
      duration: String(service.duration),
      standaloneAllowed: service.standaloneAllowed !== false,
      addonAllowed: service.addonAllowed === true,
      addonHostServiceIds: service.addonHostServiceIds ?? [],
      comboItemServiceIds: service.comboItemServiceIds ?? [],
      isDefaultCutAddon: service.isDefaultCutAddon === true,
    })
    setModalOpen(true)
  }

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    const category = form.category === 'custom' ? form.customCategory.trim() || 'Geral' : form.category
    const payload = {
      name: form.name.trim(),
      category,
      // Mantido em sincronia com category enquanto catálogos antigos ainda leem description.
      description: category,
      price: Number(form.price.replace(',', '.')),
      duration: Number(form.duration) || 30,
      standaloneAllowed: form.isDefaultCutAddon ? false : form.standaloneAllowed,
      addonAllowed: form.isDefaultCutAddon ? true : form.addonAllowed,
      isDefaultCutAddon: form.isDefaultCutAddon,
      addonHostServiceIds: form.isDefaultCutAddon ? [] : form.addonAllowed ? form.addonHostServiceIds : [],
      comboItemServiceIds: form.comboItemServiceIds,
    }
    try {
      if (editing) {
        await updateService(editing.id, payload)
      } else {
        // Cada barbeiro cria para si: o backend vincula ao perfil de quem está logado.
        await createService({ salonId, ...payload })
      }
      setModalOpen(false)
      setForm(emptyForm)
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar serviço.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(service: Service) {
    setTogglingId(service.id)
    setError('')
    try {
      const updated = await updateService(service.id, { isActive: !service.active })
      setServices((current) => current.map((item) => (item.id === service.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status do serviço.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleToggleFixedCutAddon(service: Service) {
    setTogglingFixedId(service.id)
    setError('')
    try {
      const next = !service.isDefaultCutAddon
      const updated = await updateService(service.id, {
        isDefaultCutAddon: next,
        addonAllowed: next ? true : service.addonAllowed,
        standaloneAllowed: next ? false : true,
      })
      setServices((current) => current.map((item) => (item.id === service.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar adicional fixo.')
    } finally {
      setTogglingFixedId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleting(true)
    setError('')
    try {
      await deleteService(id)
      // Soft delete no backend (deletedAt): some da lista na hora
      setServices((current) => current.filter((item) => item.id !== id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className={sectionClass(lightMode)}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar serviço por nome..."
            className={`${inputClass(lightMode)} pl-10`}
          />
        </label>
        <AdminButton onClick={openCreate}>
          <Plus className="size-4" />
          Novo Serviço
        </AdminButton>
      </div>

      {error ? (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      ) : null}

      {loading ? (
        <AdminLoading lightMode={lightMode} />
      ) : filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((service) => (
            <article
              key={service.id}
              className={`flex flex-col overflow-hidden rounded-2xl border ${
                lightMode ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-600 bg-[#142035]'
              }`}
            >
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Scissors className="size-4" />
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(service)}
                    disabled={togglingId === service.id}
                    title={service.active ? 'Clique para desativar' : 'Clique para ativar'}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase transition hover:scale-105 disabled:cursor-wait disabled:opacity-60 ${
                      service.active
                        ? lightMode
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : lightMode
                          ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    {service.active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                    {togglingId === service.id ? '...' : service.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <h3 className={`mt-3 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{service.name}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">{service.category}</p>
                <div className={`my-3 h-px ${lightMode ? 'bg-slate-100' : 'bg-slate-700'}`} />
                <p className={`flex items-center gap-1.5 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Clock3 className="size-3.5" /> Duração: {service.duration} min
                </p>
                <p className="mt-2 text-sm font-bold text-emerald-600">
                  R$ {service.price.toFixed(2).replace('.', ',')}
                </p>
                <p className={`mt-2 text-[10px] font-semibold uppercase tracking-wide ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {service.isDefaultCutAddon
                    ? 'Adicional fixo nos cortes'
                    : service.standaloneAllowed === false
                      ? 'Só adicional'
                      : 'Independente'}
                  {!service.isDefaultCutAddon && service.addonAllowed ? ' · Adicional' : ''}
                  {(service.comboItemServiceIds?.length ?? 0) > 0 ? ' · Combo' : ''}
                </p>
                {service.standaloneAllowed === false &&
                !service.isDefaultCutAddon &&
                !(service.addonHostServiceIds?.length) ? (
                  <p className={`mt-2 text-[10px] font-medium ${lightMode ? 'text-rose-600' : 'text-rose-300'}`}>
                    Não aparece no agendamento: marque “Fixo nos cortes” ou diga com quais serviços ele aparece.
                  </p>
                ) : null}
              </div>
              <footer
                className={`flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 ${
                  lightMode ? 'border-slate-100 bg-slate-50' : 'border-slate-700'
                }`}
              >
                <AdminButton
                  variant="soft"
                  onClick={() => handleToggleFixedCutAddon(service)}
                  disabled={togglingFixedId === service.id}
                  className={`h-9 px-3 text-xs ${
                    service.isDefaultCutAddon
                      ? lightMode
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                      : ''
                  }`}
                >
                  {togglingFixedId === service.id
                    ? '...'
                    : service.isDefaultCutAddon
                      ? 'Tirar fixo'
                      : 'Fixo nos cortes'}
                </AdminButton>
                <AdminButton variant="soft" onClick={() => openEdit(service)} className="h-9 px-3 text-xs">
                  <Pencil className="size-3.5" /> Editar
                </AdminButton>
                <AdminButton variant="danger" onClick={() => setDeleteTarget(service)} className="h-9 px-3 text-xs">
                  <Trash2 className="size-3.5" />
                  Excluir
                </AdminButton>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <AdminEmpty lightMode={lightMode} text="Nenhum serviço cadastrado." />
      )}

      {deleteTarget ? (
        <AdminConfirm
          lightMode={lightMode}
          danger
          busy={deleting}
          title="Você tem certeza?"
          message={
            <>
              Excluir o serviço <strong>{deleteTarget.name}</strong>? Ele some da sua lista e do agendamento dos
              clientes. Os agendamentos já feitos com ele continuam no histórico.
            </>
          }
          confirmLabel="Sim, excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {modalOpen ? (
        <AdminModal
          title={editing ? 'Editar Serviço' : 'Novo Serviço'}
          onClose={() => setModalOpen(false)}
          lightMode={lightMode}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass(lightMode)}>Nome do Serviço</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Corte Infantil"
                className={inputClass(lightMode)}
              />
            </div>
            {!editing ? (
              <p className={`text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Este corte fica só no seu menu. Clientes que escolherem outro barbeiro não veem ele.
              </p>
            ) : null}
            <div>
              <label className={labelClass(lightMode)}>Categoria do Serviço</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass(lightMode)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom">Outra...</option>
              </select>
            </div>
            {form.category === 'custom' ? (
              <div>
                <label className={labelClass(lightMode)}>Categoria personalizada</label>
                <input
                  required
                  value={form.customCategory}
                  onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                  className={inputClass(lightMode)}
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass(lightMode)}>Preço (R$)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className={inputClass(lightMode)}
                />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Duração (Minutos)</label>
                <input
                  required
                  type="number"
                  min="5"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="Ex: 40"
                  className={inputClass(lightMode)}
                />
              </div>
            </div>
            <div className={`space-y-2 rounded-xl border p-3 ${lightMode ? 'border-amber-200 bg-amber-50' : 'border-amber-500/30 bg-amber-500/10'}`}>
              <label className={`flex items-center gap-2 text-sm font-semibold ${lightMode ? 'text-amber-950' : 'text-amber-100'}`}>
                <input
                  type="checkbox"
                  checked={form.isDefaultCutAddon}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isDefaultCutAddon: e.target.checked,
                      addonAllowed: e.target.checked ? true : form.addonAllowed,
                      standaloneAllowed: e.target.checked ? false : form.standaloneAllowed,
                    })
                  }
                />
                Adicional fixo em todos os cortes
              </label>
              <p className={`text-[11px] ${lightMode ? 'text-amber-800' : 'text-amber-200/90'}`}>
                Quando marcado, este serviço aparece automaticamente ao escolher um corte (ex.: pigmentação, hidratação). Dá para ligar e desligar a qualquer momento.
              </p>
            </div>
            {!form.isDefaultCutAddon ? (
              <>
                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={form.standaloneAllowed}
                      onChange={(e) => setForm({ ...form, standaloneAllowed: e.target.checked })}
                    />
                    Cliente pode pedir sozinho
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={form.addonAllowed}
                      onChange={(e) => setForm({ ...form, addonAllowed: e.target.checked })}
                    />
                    Pode aparecer como adicional
                  </label>
                  <p className={`text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Mesmo cadastro serve para pedir sozinho e como adicional. Não cadastre o serviço duas vezes.
                  </p>
                </div>
                {form.addonAllowed && services.filter((item) => item.id !== editing?.id).length > 0 ? (
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label className={labelClass(lightMode)}>Aparece junto com quais serviços?</label>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            addonHostServiceIds: cutServiceIdsAmong(services, editing?.id),
                          })
                        }
                        className={`text-[11px] font-bold uppercase tracking-wide ${
                          lightMode ? 'text-indigo-600' : 'text-indigo-300'
                        }`}
                      >
                        Liberar com todos os cortes
                      </button>
                    </div>
                    <p className={`mb-2 text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Marque os serviços principais (ex.: corte). O cliente só vê este adicional depois de escolher um deles.
                    </p>
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-600">
                      {services
                        .filter((item) => item.id !== editing?.id)
                        .map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-xs font-medium">
                            <input
                              type="checkbox"
                              checked={form.addonHostServiceIds.includes(item.id)}
                              onChange={() =>
                                setForm({
                                  ...form,
                                  addonHostServiceIds: toggleId(form.addonHostServiceIds, item.id),
                                })
                              }
                            />
                            {item.name}
                          </label>
                        ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
            {services.filter((item) => item.id !== editing?.id).length > 0 ? (
              <div>
                <label className={labelClass(lightMode)}>Este combo já inclui (opcional)</label>
                <p className={`mb-2 text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Se for um combo (ex.: Corte + barba), marque o que já vem nele. Assim o cliente não paga de novo o mesmo item.
                </p>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-600">
                  {services
                    .filter((item) => item.id !== editing?.id)
                    .map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={form.comboItemServiceIds.includes(item.id)}
                          onChange={() =>
                            setForm({
                              ...form,
                              comboItemServiceIds: toggleId(form.comboItemServiceIds, item.id),
                            })
                          }
                        />
                        {item.name}
                      </label>
                    ))}
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={`text-sm font-semibold ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}
              >
                Cancelar
              </button>
              <AdminButton type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Serviço'}
              </AdminButton>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </section>
  )
}
