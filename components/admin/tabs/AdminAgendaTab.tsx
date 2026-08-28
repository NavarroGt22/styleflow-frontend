'use client'

import { CheckCircle2, Clock, Lock, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import AdminCheckoutModal from '../AdminCheckoutModal'
import { AdminEmpty, AdminError, AdminLoading } from '../ui/AdminUi'
import type { AdminTabProps, Appointment } from '@/lib/admin/types'
import { fetchAppointments, updateAppointmentStatus } from '@/lib/admin/api'

function formatPhone(phone?: string) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return phone
}

export default function AdminAgendaTab({ salonId, lightMode = false }: AdminTabProps) {
  const [items, setItems] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'PENDING' | 'COMPLETED'>('PENDING')
  const [checkoutApt, setCheckoutApt] = useState<Appointment | null>(null)

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

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${lightMode ? 'text-gray-900' : 'text-white'}`}>
            Agenda do Dia
          </h1>
          <p className={`mt-1 ${lightMode ? 'text-gray-500' : 'text-slate-400'}`}>
            Acompanhe quem agendou horário com o seu salão.
            {pendingCount > 0 ? ` (${pendingCount} pendente${pendingCount > 1 ? 's' : ''})` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-500"
          >
            <Plus className="size-4" /> Bloquear Horário
          </button>
          <div
            className={`flex gap-2 rounded-xl border p-1.5 ${
              lightMode ? 'border-gray-200 bg-gray-100' : 'border-slate-700 bg-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setFilter('PENDING')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
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
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
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
        <div
          className={`overflow-hidden rounded-2xl border shadow-sm ${
            lightMode ? 'border-gray-100 bg-white' : 'border-slate-700 bg-slate-800'
          }`}
        >
          <table className="w-full border-collapse text-left">
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
                    <div className={`font-medium ${lightMode ? 'text-gray-900' : 'text-white'}`}>
                      {new Date(apt.startTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="text-sm font-bold text-indigo-500">
                      {new Date(apt.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="p-4">
                    {apt.status === 'BLOCKED' ? (
                      <div className="flex items-center gap-1.5 italic text-slate-400">
                        <Lock className="size-3.5" /> Horário Bloqueado
                      </div>
                    ) : (
                      <>
                        <div className={`font-medium ${lightMode ? 'text-gray-900' : 'text-white'}`}>
                          {apt.customer?.user?.name || 'Cliente'}
                        </div>
                        <div className="text-sm text-slate-500">{formatPhone(apt.customer?.user?.phone)}</div>
                      </>
                    )}
                  </td>
                  <td className="p-4">
                    <div className={`font-medium ${lightMode ? 'text-gray-900' : 'text-white'}`}>
                      {apt.service?.name || '-'}
                    </div>
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
                    {apt.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" /> Concluído
                      </span>
                    )}
                    {apt.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock className="size-3" /> Pendente
                      </span>
                    )}
                    {apt.status === 'CONFIRMED' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        <CheckCircle2 className="size-3" /> Confirmado
                      </span>
                    )}
                    {apt.status === 'BLOCKED' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                        <Lock className="size-3" /> Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {apt.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatus(apt.id, 'CONFIRMED')}
                            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Cancelar este agendamento?')) handleStatus(apt.id, 'CANCELED_BY_SALON')
                            }}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {apt.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={() => setCheckoutApt(apt)}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600"
                        >
                          Finalizar & Cobrar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  )
}
