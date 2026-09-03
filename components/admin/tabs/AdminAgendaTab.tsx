'use client'

import { CheckCircle2, Clock, Lock, Plus, Scissors, User } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import AdminCheckoutModal from '../AdminCheckoutModal'
import { AdminButton, AdminEmpty, AdminError, AdminLoading, AdminModal, inputClass, labelClass } from '../ui/AdminUi'
import type { AdminTabProps, Appointment, Professional } from '@/lib/admin/types'
import {
  blockAppointment,
  fetchAppointments,
  fetchProfessionals,
  updateAppointmentStatus,
} from '@/lib/admin/api'

function formatPhone(phone?: string) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return phone
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="size-3" /> Concluído
      </span>
    )
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
        <Clock className="size-3" /> Pendente
      </span>
    )
  }
  if (status === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
        <CheckCircle2 className="size-3" /> Confirmado
      </span>
    )
  }
  if (status === 'BLOCKED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-300">
        <Lock className="size-3" /> Bloqueado
      </span>
    )
  }
  return null
}

function AppointmentActions({
  apt,
  onConfirm,
  onCancel,
  onCheckout,
  onUnblock,
}: {
  apt: Appointment
  onConfirm: () => void
  onCancel: () => void
  onCheckout: () => void
  onUnblock: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {apt.status === 'PENDING' && (
        <>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-xl border border-blue-500/40 px-3 py-2.5 text-sm font-bold text-blue-400 transition hover:bg-blue-500/10 sm:min-h-0 sm:flex-none sm:rounded-lg sm:py-1.5 sm:text-xs"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border border-red-500/40 px-3 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/10 sm:min-h-0 sm:flex-none sm:rounded-lg sm:py-1.5 sm:text-xs"
          >
            Cancelar
          </button>
        </>
      )}
      {apt.status === 'CONFIRMED' && (
        <button
          type="button"
          onClick={onCheckout}
          className="min-h-11 w-full rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 sm:min-h-0 sm:w-auto sm:rounded-lg sm:py-1.5 sm:text-xs"
        >
          Finalizar & Cobrar
        </button>
      )}
      {apt.status === 'BLOCKED' && (
        <button
          type="button"
          onClick={onUnblock}
          className="min-h-11 w-full rounded-xl border border-slate-500/40 px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-700/40 sm:min-h-0 sm:w-auto sm:rounded-lg sm:py-1.5 sm:text-xs"
        >
          Desbloquear
        </button>
      )}
    </div>
  )
}

export default function AdminAgendaTab({ salonId, lightMode = false }: AdminTabProps) {
  const [items, setItems] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'PENDING' | 'COMPLETED'>('PENDING')
  const [checkoutApt, setCheckoutApt] = useState<Appointment | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [blocking, setBlocking] = useState(false)
  const [blockForm, setBlockForm] = useState({
    professionalId: '',
    date: '',
    startTime: '',
    endTime: '',
  })

  const localToday = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  async function openBlockModal() {
    setError('')
    setBlockOpen(true)
    try {
      if (!salonId) return
      const list = professionals.length ? professionals : await fetchProfessionals(salonId)
      if (!professionals.length) setProfessionals(list)
      setBlockForm((prev) => ({
        ...prev,
        professionalId: prev.professionalId || list[0]?.id || '',
        date: prev.date || localToday,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar profissionais.')
    }
  }

  async function handleBlockSubmit(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    if (!blockForm.professionalId || !blockForm.date || !blockForm.startTime || !blockForm.endTime) {
      setError('Preencha todos os campos do bloqueio.')
      return
    }

    const start = new Date(`${blockForm.date}T${blockForm.startTime}:00`)
    const end = new Date(`${blockForm.date}T${blockForm.endTime}:00`)
    if (end <= start) {
      setError('O horário de término deve ser posterior ao início.')
      return
    }

    setBlocking(true)
    setError('')
    try {
      await blockAppointment({
        salonId,
        professionalId: blockForm.professionalId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })
      setBlockOpen(false)
      setBlockForm({ professionalId: professionals[0]?.id || '', date: '', startTime: '', endTime: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao bloquear horário.')
    } finally {
      setBlocking(false)
    }
  }

  async function load() {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado. Faça login novamente.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await fetchAppointments(salonId)
      setItems(data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agenda.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  const filtered = useMemo(
    () =>
      items.filter((apt) =>
        filter === 'PENDING'
          ? apt.status === 'PENDING' || apt.status === 'CONFIRMED' || apt.status === 'BLOCKED'
          : apt.status === 'COMPLETED',
      ),
    [items, filter],
  )

  const pendingCount = items.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length

  async function handleStatus(id: string, status: string) {
    try {
      await updateAppointmentStatus(id, status)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar agendamento.')
    }
  }

  const cardBg = lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
  const muted = lightMode ? 'text-slate-500' : 'text-slate-400'
  const title = lightMode ? 'text-slate-900' : 'text-white'

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-5 mt-2 flex flex-col gap-4 sm:mb-8 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${title}`}>Agenda do Dia</h1>
          <p className={`mt-1 text-sm ${muted}`}>
            Acompanhe quem agendou horário com o seu salão.
            {pendingCount > 0 ? ` (${pendingCount} pendente${pendingCount > 1 ? 's' : ''})` : ''}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={openBlockModal}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-500 sm:min-h-0 sm:w-auto sm:py-2"
          >
            <Plus className="size-4" /> Bloquear Horário
          </button>
          <div
            className={`grid grid-cols-2 gap-1 rounded-xl border p-1.5 ${
              lightMode ? 'border-gray-200 bg-gray-100' : 'border-slate-700 bg-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setFilter('PENDING')}
              className={`min-h-10 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                filter === 'PENDING'
                  ? lightMode
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'bg-slate-700 text-blue-400 shadow-sm'
                  : lightMode
                    ? 'text-gray-500'
                    : 'text-slate-400'
              }`}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setFilter('COMPLETED')}
              className={`min-h-10 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                filter === 'COMPLETED'
                  ? lightMode
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'bg-slate-700 text-emerald-400 shadow-sm'
                  : lightMode
                    ? 'text-gray-500'
                    : 'text-slate-400'
              }`}
            >
              Concluídos
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      ) : null}

      {loading ? (
        <AdminLoading lightMode={lightMode} />
      ) : filtered.length === 0 ? (
        <AdminEmpty
          lightMode={lightMode}
          text={filter === 'PENDING' ? 'Ainda não há agendamentos pendentes.' : 'Nenhum agendamento concluído.'}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((apt) => {
              const dateLabel = new Date(apt.startTime).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              })
              const timeLabel = new Date(apt.startTime).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <article key={apt.id} className={`rounded-2xl border p-4 ${cardBg}`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-[var(--brand,#d5a85c)]">{timeLabel}</p>
                      <p className={`text-xs font-medium ${muted}`}>{dateLabel}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>

                  {apt.status === 'BLOCKED' ? (
                    <p className={`mb-3 flex items-center gap-1.5 text-sm italic ${muted}`}>
                      <Lock className="size-3.5" /> Horário Bloqueado
                    </p>
                  ) : (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className={`size-4 shrink-0 ${muted}`} />
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${title}`}>
                            {apt.customer?.user?.name || 'Cliente'}
                          </p>
                          {apt.customer?.user?.phone ? (
                            <p className={`text-xs ${muted}`}>{formatPhone(apt.customer.user.phone)}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scissors className={`size-4 shrink-0 ${muted}`} />
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${title}`}>
                            {apt.service?.name || '-'}
                          </p>
                          {apt.service?.price != null ? (
                            <p className={`text-xs ${muted}`}>
                              R$ {Number(apt.service.price).toFixed(2).replace('.', ',')}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className={`text-xs ${muted}`}>
                        Profissional:{' '}
                        <span className={title}>{apt.professional?.user?.name || 'Não informado'}</span>
                      </p>
                    </div>
                  )}

                  <AppointmentActions
                    apt={apt}
                    onConfirm={() => handleStatus(apt.id, 'CONFIRMED')}
                    onCancel={() => {
                      if (confirm('Cancelar este agendamento?')) handleStatus(apt.id, 'CANCELED_BY_SALON')
                    }}
                    onCheckout={() => setCheckoutApt(apt)}
                    onUnblock={() => {
                      if (confirm('Desbloquear este horário?')) handleStatus(apt.id, 'CANCELED_BY_SALON')
                    }}
                  />
                </article>
              )
            })}
          </div>

          {/* Desktop: table */}
          <div
            className={`hidden overflow-hidden rounded-2xl border shadow-sm md:block ${
              lightMode ? 'border-gray-100 bg-white' : 'border-slate-700 bg-slate-800'
            }`}
          >
            <div className="scrollbar-none overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr
                    className={`border-b text-sm font-semibold ${
                      lightMode
                        ? 'border-gray-100 bg-gray-50 text-gray-600'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <th className="p-4">Data/Hora</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Serviço</th>
                    <th className="p-4">Profissional</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${lightMode ? 'divide-gray-100' : 'divide-slate-700'}`}>
                  {filtered.map((apt) => (
                    <tr key={apt.id} className={lightMode ? 'hover:bg-gray-50/50' : 'hover:bg-slate-700/50'}>
                      <td className="p-4">
                        <div className={`font-medium ${title}`}>
                          {new Date(apt.startTime).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                        <div className="text-sm font-bold text-indigo-500">
                          {new Date(apt.startTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        {apt.status === 'BLOCKED' ? (
                          <div className="flex items-center gap-1.5 italic text-slate-400">
                            <Lock className="size-3.5" /> Horário Bloqueado
                          </div>
                        ) : (
                          <>
                            <div className={`font-medium ${title}`}>
                              {apt.customer?.user?.name || 'Cliente'}
                            </div>
                            <div className="text-sm text-slate-500">
                              {formatPhone(apt.customer?.user?.phone)}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="p-4">
                        <div className={`font-medium ${title}`}>{apt.service?.name || '-'}</div>
                        {apt.service?.price != null ? (
                          <div className="text-sm text-slate-500">
                            R$ {Number(apt.service.price).toFixed(2).replace('.', ',')}
                          </div>
                        ) : null}
                      </td>
                      <td className={`p-4 ${lightMode ? 'text-gray-700' : 'text-slate-300'}`}>
                        {apt.professional?.user?.name || 'Não informado'}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={apt.status} />
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end">
                          <AppointmentActions
                            apt={apt}
                            onConfirm={() => handleStatus(apt.id, 'CONFIRMED')}
                            onCancel={() => {
                              if (confirm('Cancelar este agendamento?')) {
                                handleStatus(apt.id, 'CANCELED_BY_SALON')
                              }
                            }}
                            onCheckout={() => setCheckoutApt(apt)}
                            onUnblock={() => {
                              if (confirm('Desbloquear este horário?')) {
                                handleStatus(apt.id, 'CANCELED_BY_SALON')
                              }
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {checkoutApt && salonId ? (
        <AdminCheckoutModal
          appointment={checkoutApt}
          salonId={salonId}
          lightMode={lightMode}
          onClose={() => setCheckoutApt(null)}
          onSuccess={load}
        />
      ) : null}

      {blockOpen ? (
        <AdminModal title="Bloquear Horário" onClose={() => setBlockOpen(false)} lightMode={lightMode}>
          <form onSubmit={handleBlockSubmit} className="space-y-4">
            <div>
              <label className={labelClass(lightMode)}>Profissional</label>
              <select
                required
                value={blockForm.professionalId}
                onChange={(e) => setBlockForm({ ...blockForm, professionalId: e.target.value })}
                className={inputClass(lightMode)}
              >
                <option value="" disabled>
                  Selecione um profissional
                </option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.user?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass(lightMode)}>Data do Bloqueio</label>
              <input
                required
                type="date"
                min={localToday}
                value={blockForm.date}
                onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                className={inputClass(lightMode)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass(lightMode)}>Horário Início</label>
                <input
                  required
                  type="time"
                  value={blockForm.startTime}
                  onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                  className={inputClass(lightMode)}
                />
              </div>
              <div>
                <label className={labelClass(lightMode)}>Horário Término</label>
                <input
                  required
                  type="time"
                  value={blockForm.endTime}
                  onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                  className={inputClass(lightMode)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <AdminButton type="button" variant="ghost" onClick={() => setBlockOpen(false)}>
                Cancelar
              </AdminButton>
              <AdminButton type="submit" disabled={blocking}>
                {blocking ? 'Bloqueando...' : 'Confirmar Bloqueio'}
              </AdminButton>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </div>
  )
}
