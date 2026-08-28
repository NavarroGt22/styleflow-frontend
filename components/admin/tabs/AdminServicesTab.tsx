'use client'

import { CheckCircle2, Clock3, Pencil, Plus, Scissors, Search, Trash2, XCircle } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AdminButton,
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

const CATEGORIES = ['Cabelo', 'Sobrancelha', 'Coloração', 'Barba', 'Unha', 'Maquiagem', 'Depilação', 'Estética']

const emptyForm = { name: '', category: 'Cabelo', customCategory: '', price: '', duration: '' }

export default function AdminServicesTab({ salonId, lightMode = false }: AdminTabProps) {
  const [query, setQuery] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(emptyForm)
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
    })
    setModalOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    const category = form.category === 'custom' ? form.customCategory.trim() || 'Geral' : form.category
    const payload = {
      name: form.name.trim(),
      description: category,
      price: Number(form.price.replace(',', '.')),
      duration: Number(form.duration) || 30,
    }
    try {
      if (editing) {
        await updateService(editing.id, payload)
      } else {
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

  async function handleDelete(id: string) {
    if (!confirm('Excluir este serviço?')) return
    try {
      await deleteService(id)
      setServices((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
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
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${
                      service.active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-600'
                    }`}
                  >
                    {service.active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                    {service.active ? 'Ativo' : 'Inativo'}
                  </span>
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
              </div>
              <footer
                className={`flex items-center justify-end gap-2 border-t px-4 py-3 ${
                  lightMode ? 'border-slate-100 bg-slate-50' : 'border-slate-700'
                }`}
              >
                <AdminButton variant="soft" onClick={() => openEdit(service)} className="h-9 px-3 text-xs">
                  <Pencil className="size-3.5" /> Editar
                </AdminButton>
                <AdminButton variant="danger" onClick={() => handleDelete(service.id)} className="h-9 w-9 px-0">
                  <Trash2 className="size-3.5" />
                </AdminButton>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <AdminEmpty lightMode={lightMode} text="Nenhum serviço cadastrado." />
      )}

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
