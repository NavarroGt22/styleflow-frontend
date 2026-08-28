'use client'

import { Check, Clock3, Pencil, Plus, Trash2 } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
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
import type { AdminTabProps, Professional } from '@/lib/admin/types'
import { createProfessional, deleteProfessional, fetchProfessionals, updateProfessional } from '@/lib/admin/api'
import { getSessionUser } from '@/lib/auth'

function formatPhone(phone?: string | null) {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return phone
}

export default function AdminTeamTab({ salonId, lightMode = false, ownerUserId }: AdminTabProps) {
  const sessionUser = getSessionUser()
  const resolvedOwnerId = ownerUserId ?? sessionUser?.id

  const [team, setTeam] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Professional | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    commissionRate: '30',
    workStart: '09:00',
    workEnd: '18:00',
    password: '',
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
      setTeam(await fetchProfessionals(salonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar equipe.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  function openCreate() {
    setEditing(null)
    setForm({
      name: '',
      email: '',
      phone: '',
      commissionRate: '30',
      workStart: '09:00',
      workEnd: '18:00',
      password: '',
    })
    setModal('create')
  }

  function openEdit(member: Professional) {
    setEditing(member)
    setForm({
      name: member.user?.name || '',
      email: member.user?.email || '',
      phone: member.user?.phone || '',
      commissionRate: String(member.commissionRate ?? 0),
      workStart: member.workStart || '09:00',
      workEnd: member.workEnd || '18:00',
      password: '',
    })
    setModal('edit')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    try {
      if (modal === 'create') {
        await createProfessional({
          salonId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          commissionRate: Number(form.commissionRate),
          workStart: form.workStart,
          workEnd: form.workEnd,
          password: form.password || undefined,
        })
      } else if (editing) {
        await updateProfessional(editing.id, {
          name: form.name,
          phone: form.phone,
          commissionRate: Number(form.commissionRate),
          workStart: form.workStart,
          workEnd: form.workEnd,
          password: form.password || undefined,
        })
      }
      setModal(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar profissional.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(member: Professional) {
    const isOwner = member.userId === resolvedOwnerId || member.user?.id === resolvedOwnerId
    if (isOwner) {
      setError('Não é possível remover o dono do salão.')
      return
    }
    if (!confirm(`Remover ${member.user?.name || 'profissional'} da equipe?`)) return
    try {
      await deleteProfessional(member.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover.')
    }
  }

  return (
    <section className={sectionClass(lightMode)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className={`text-base font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>Equipe</h3>
          <p className={`text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Gerencie barbeiros, comissões e status.
          </p>
        </div>
        <AdminButton onClick={openCreate}>
          <Plus className="size-4" /> Adicionar
        </AdminButton>
      </div>

      {error ? (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      ) : null}

      {loading ? (
        <AdminLoading lightMode={lightMode} />
      ) : team.length ? (
        <div className={`overflow-x-auto rounded-2xl border ${lightMode ? 'border-slate-200' : 'border-slate-600'}`}>
          <table className="min-w-full text-left text-sm">
            <thead className={lightMode ? 'bg-slate-50 text-slate-500' : 'bg-[#142035] text-slate-400'}>
              <tr className="text-xs font-semibold uppercase tracking-wide">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Comissão (%)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const isOwner = member.userId === resolvedOwnerId || member.user?.id === resolvedOwnerId
                return (
                  <tr
                    key={member.id}
                    className={`border-t ${lightMode ? 'border-slate-100' : 'border-slate-700'}`}
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                          {member.user?.name || 'Profissional'}
                        </span>
                        {isOwner ? (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">
                            Dono / Barbeiro
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-amber-700/80">
                        <Clock3 className="size-3.5" />
                        {member.workStart} - {member.workEnd}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className={lightMode ? 'text-slate-800' : 'text-slate-200'}>{member.user?.email || '—'}</p>
                      <p className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatPhone(member.user?.phone)}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top font-semibold text-indigo-600">
                      {isOwner || member.commissionRate === 0
                        ? '0% (lucro da casa)'
                        : `${member.commissionRate}%`}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <Check className="size-3.5" /> Ativo
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <AdminButton variant="soft" onClick={() => openEdit(member)} className="h-9 px-3 text-xs">
                          <Pencil className="size-3.5" /> Editar
                        </AdminButton>
                        <AdminButton
                          variant="danger"
                          onClick={() => handleDelete(member)}
                          className="h-9 w-9 px-0"
                          disabled={isOwner}
                        >
                          <Trash2 className="size-3.5" />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmpty lightMode={lightMode} text="Nenhum profissional na equipe." />
      )}

      {modal ? (
        <AdminModal
          title={modal === 'create' ? 'Novo profissional' : 'Editar profissional'}
          onClose={() => setModal(null)}
          lightMode={lightMode}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelClass(lightMode)}>Nome</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass(lightMode)}
              />
            </div>
            {modal === 'create' ? (
              <div>
                <label className={labelClass(lightMode)}>E-mail</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass(lightMode)}
                />
              </div>
            ) : null}
            <div>
              <label className={labelClass(lightMode)}>Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass(lightMode)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass(lightMode)}>Comissão %</label>
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  value={form.commissionRate}
                  onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                  className={inputClass(lightMode)}
                />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Início</label>
                <input
                  type="time"
                  value={form.workStart}
                  onChange={(e) => setForm({ ...form, workStart: e.target.value })}
                  className={inputClass(lightMode)}
                />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Fim</label>
                <input
                  type="time"
                  value={form.workEnd}
                  onChange={(e) => setForm({ ...form, workEnd: e.target.value })}
                  className={inputClass(lightMode)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass(lightMode)}>
                {modal === 'create' ? 'Senha temporária (opcional)' : 'Nova senha (opcional)'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass(lightMode)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="text-sm font-semibold text-slate-500">
                Cancelar
              </button>
              <AdminButton type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </AdminButton>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </section>
  )
}
