'use client'

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Clock,
  Copy,
  DollarSign,
  Play,
  Plus,
  Scissors,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import AdminCheckoutModal from '../AdminCheckoutModal'
import { AdminButton, AdminEmpty, AdminError, AdminLoading, AdminModal, inputClass, labelClass } from '../ui/AdminUi'
import type { AdminTabProps, Appointment, Professional, QueueEntry, QueueSession, Service } from '@/lib/admin/types'
import {
  addWalkInToQueue,
  fetchProfessionals,
  fetchSalon,
  fetchServices,
  openQueueSession,
  reorderQueueEntry,
  skipQueueEntry,
  startNextInQueue,
} from '@/lib/admin/api'

function localToday() {
  return new Date().toISOString().slice(0, 10)
}

function QueueTimer({ startedAt, className }: { startedAt?: string | null; className?: string }) {
  const [elapsed, setElapsed] = useState('00:00')
  useEffect(() => {
    if (!startedAt) return
    const start = new Date(startedAt).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
      const m = String(Math.floor(diff / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return <span className={className}>{elapsed}</span>
}

function entryName(entry: QueueEntry) {
  return entry.appointment?.customer?.user?.name || entry.customerName || entry.clientName || 'Cliente'
}

function entryService(entry: QueueEntry) {
  return entry.appointment?.service?.name || entry.serviceName || entry.service?.name || 'Serviço'
}

function entryDuration(entry: QueueEntry) {
  return entry.appointment?.service?.duration || entry.serviceDuration || entry.service?.duration || 30
}

export default function AdminQueueTab({ salonId, lightMode = false, salonSlug, onNavigateTab }: AdminTabProps) {
  const [salon, setSalon] = useState<{ queueMode?: boolean; slug?: string; queueAutoAdvance?: boolean; queueAllowClientView?: boolean } | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedProf, setSelectedProf] = useState('')
  const [session, setSession] = useState<QueueSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [walkInName, setWalkInName] = useState('')
  const [walkInService, setWalkInService] = useState('')
  const [checkoutApt, setCheckoutApt] = useState<Appointment | null>(null)
  const [checkoutAction, setCheckoutAction] = useState<'complete' | 'completeAndNext' | null>(null)
  const autoFinishTriggeredRef = useRef<string | null>(null)

  async function loadBase() {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [salonData, team, svc] = await Promise.all([
        fetchSalon(salonId),
        fetchProfessionals(salonId),
        fetchServices(salonId),
      ])
      setSalon(salonData)
      setProfessionals(team)
      setServices(svc.filter((s) => s.active))
      if (!selectedProf && team[0]) setSelectedProf(team[0].id)
      if (!walkInService && svc[0]) setWalkInService(svc[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fila.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSession(professionalId: string) {
    if (!professionalId) return
    try {
      const opened = await openQueueSession(professionalId, localToday())
      setSession(opened)
    } catch {
      setSession(null)
    }
  }

  useEffect(() => {
    loadBase()
  }, [salonId])

  useEffect(() => {
    if (salon?.queueMode && selectedProf) loadSession(selectedProf)
  }, [selectedProf, salon?.queueMode])

  const waiting = useMemo(
    () => (session?.entries ?? []).filter((e) => e.status === 'WAITING'),
    [session],
  )
  const activeEntry = useMemo(
    () => (session?.entries ?? []).find((e) => e.status === 'IN_PROGRESS') ?? null,
    [session],
  )

  // Finalização automática ao fim do tempo do serviço (quando queueAutoAdvance estiver ativo)
  useEffect(() => {
    if (!salon?.queueAutoAdvance || !activeEntry || checkoutApt) {
      if (!activeEntry) autoFinishTriggeredRef.current = null
      return
    }
    if (autoFinishTriggeredRef.current === activeEntry.id) return

    const durationMin = entryDuration(activeEntry)
    const startMs = activeEntry.actualStart ? new Date(activeEntry.actualStart).getTime() : NaN
    if (!Number.isFinite(startMs)) return

    const check = () => {
      if (Date.now() - startMs >= durationMin * 60 * 1000) {
        autoFinishTriggeredRef.current = activeEntry.id
        openCheckout(activeEntry, 'complete')
        setError('Tempo do serviço encerrado. Confirme o pagamento para o valor entrar no financeiro.')
      }
    }

    check()
    const id = window.setInterval(check, 1000)
    return () => window.clearInterval(id)
  }, [salon?.queueAutoAdvance, activeEntry, checkoutApt])

  const publicUrl =
    typeof window !== 'undefined' && (salonSlug || salon?.slug)
      ? `${window.location.origin}/app/${salonSlug || salon?.slug}`
      : ''

  function openCheckout(entry: QueueEntry, action: 'complete' | 'completeAndNext') {
    const apt = entry.appointment
    if (!apt) {
      setError('Agendamento não encontrado para este atendimento.')
      return
    }
    setCheckoutAction(action)
    setCheckoutApt(apt)
  }

  async function handleStartNext() {
    if (!session?.id) return
    if (activeEntry) {
      openCheckout(activeEntry, 'completeAndNext')
      return
    }
    setWorking(true)
    try {
      await startNextInQueue(session.id)
      await loadSession(selectedProf)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao chamar próximo.')
    } finally {
      setWorking(false)
    }
  }

  async function handleWalkIn() {
    if (!session?.id || !walkInName.trim() || !walkInService) return
    setWorking(true)
    try {
      await addWalkInToQueue(session.id, { name: walkInName.trim(), serviceId: walkInService })
      setWalkInOpen(false)
      setWalkInName('')
      await loadSession(selectedProf)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar na fila.')
    } finally {
      setWorking(false)
    }
  }

  async function handleSkip(entryId: string) {
    if (!confirm('Registrar ausência e pular este cliente?')) return
    try {
      await skipQueueEntry(entryId, 'Cliente Ausente')
      await loadSession(selectedProf)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pular cliente.')
    }
  }

  async function handleReorder(entryId: string, newPosition: number) {
    if (!session?.id) return
    try {
      await reorderQueueEntry(session.id, entryId, newPosition, 'Ajuste rápido')
      await loadSession(selectedProf)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reordenar.')
    }
  }

  if (loading) return <AdminLoading lightMode={lightMode} />

  if (!salon?.queueMode) {
    return (
      <div
        className={`rounded-2xl border p-8 text-center shadow-sm ${
          lightMode ? 'border-gray-100 bg-white' : 'border-slate-700 bg-slate-800'
        }`}
      >
        <Clock className="mx-auto mb-4 size-12 text-slate-400" />
        <h2 className={`mb-2 text-xl font-bold ${lightMode ? 'text-gray-900' : 'text-white'}`}>
          Fila Dinâmica Desativada
        </h2>
        <p className={`mx-auto mb-6 max-w-md text-sm ${lightMode ? 'text-gray-500' : 'text-slate-400'}`}>
          Para utilizar o sistema de fila de atendimento dinâmico (sem hora marcada) com estimativas reativas de tempo
          e painel público de vitrine de clientes, ative o Modo Fila nas configurações do salão.
        </p>
        <AdminButton onClick={() => onNavigateTab?.('salao', { salonSubTab: 'fila' })}>
          Ir para Configurações do Salão
        </AdminButton>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 mt-4">
        <h1 className={`text-3xl font-bold tracking-tight ${lightMode ? 'text-gray-900' : 'text-white'}`}>
          Painel de Fila Dinâmica
        </h1>
        <p className={`mt-1 ${lightMode ? 'text-gray-500' : 'text-slate-400'}`}>
          Gerencie a fila de clientes do dia por profissional em tempo real.
        </p>
      </div>

      {error ? (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      ) : null}

      <div
        className={`mb-8 flex flex-col gap-6 rounded-2xl border p-6 shadow-sm md:flex-row md:items-end md:justify-between ${
          lightMode ? 'border-gray-100 bg-white' : 'border-slate-700 bg-slate-800'
        }`}
      >
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-xs">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Selecionar Profissional
            </label>
            <select
              value={selectedProf}
              onChange={(e) => setSelectedProf(e.target.value)}
              className={inputClass(lightMode)}
            >
              <option value="" disabled>
                Selecione um profissional
              </option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user?.name}
                </option>
              ))}
            </select>
          </div>
          {session ? (
            <AdminButton variant="success" onClick={() => setWalkInOpen(true)} className="h-11">
              <Plus className="size-4" /> Adicionar na Fila
            </AdminButton>
          ) : null}
        </div>

        {salon.queueAllowClientView !== false && publicUrl ? (
          <div
            className={`flex flex-1 flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              lightMode ? 'border-indigo-100 bg-indigo-50/50' : 'border-indigo-900/40 bg-indigo-950/20'
            }`}
          >
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-indigo-500">Link Público da Fila</span>
              <span className="text-[11px] font-medium text-slate-500">
                Compartilhe para os clientes acompanharem a posição deles online
              </span>
            </div>
            <AdminButton
              onClick={() => {
                navigator.clipboard.writeText(publicUrl)
              }}
              className="h-10 text-xs"
            >
              <Copy className="size-3.5" /> Copiar Link
            </AdminButton>
          </div>
        ) : null}
      </div>

      {!selectedProf ? (
        <AdminEmpty lightMode={lightMode} text="Selecione um profissional da equipe acima para gerenciar a fila." />
      ) : !session ? (
        <div
          className={`flex flex-col items-center rounded-2xl border p-12 text-center shadow-sm ${
            lightMode ? 'border-gray-100 bg-white' : 'border-slate-700 bg-slate-800'
          }`}
        >
          <Clock className="mb-4 size-10 text-slate-400" />
          <h3 className={`mb-2 font-bold ${lightMode ? 'text-gray-900' : 'text-white'}`}>Fila Fechada</h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            Não há nenhuma sessão de fila de hoje aberta para este profissional no momento.
          </p>
          <AdminButton onClick={() => loadSession(selectedProf)} disabled={working}>
            Abrir Fila de Hoje
          </AdminButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Atendimento em Andamento</h3>
            {activeEntry ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-xl shadow-indigo-500/20">
                <Scissors className="pointer-events-none absolute right-0 top-0 size-32 translate-x-4 -translate-y-4 opacity-10" />
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                  Atendimento Ativo
                </span>
                <h2 className="mt-4 text-2xl font-black leading-tight">{entryName(activeEntry)}</h2>
                <p className="mt-1 text-xs font-semibold text-white/80">{entryService(activeEntry)}</p>
                <div className="mt-8 flex items-center justify-between rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <div>
                    <span className="block text-xs font-bold text-white/70">Tempo decorrido:</span>
                    <span className="text-[10px] text-white/50">
                      Duração prevista: {entryDuration(activeEntry)} min
                      {salon.queueAutoAdvance ? ' · finalização automática' : ' · finalização manual'}
                    </span>
                  </div>
                  <QueueTimer
                    startedAt={activeEntry.actualStart}
                    className="animate-pulse font-mono text-2xl font-bold tracking-wider"
                  />
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => openCheckout(activeEntry, 'complete')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white bg-white py-3 font-bold text-indigo-900 shadow-lg transition active:scale-95"
                  >
                    <DollarSign className="size-4" /> Finalizar & Cobrar
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNext}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-3 font-bold text-white transition hover:bg-white/20 active:scale-95"
                  >
                    <Play className="size-4" /> Cobrar & Chamar Próximo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSkip(activeEntry.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-600/35 py-3 font-bold text-white transition hover:bg-rose-600/50 active:scale-95"
                  >
                    <AlertCircle className="size-4" /> Registrar Ausência (Pular)
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`flex flex-col items-center rounded-2xl border p-8 text-center shadow-sm ${
                  lightMode ? 'border-gray-100 bg-white' : 'border-slate-700 bg-slate-800'
                }`}
              >
                <Play className="mb-3 size-8 animate-bounce text-indigo-500" />
                <h4 className={`font-bold ${lightMode ? 'text-gray-900' : 'text-white'}`}>Nenhum Cliente em Andamento</h4>
                <p className="mt-1 mb-4 text-xs text-slate-500">
                  Inicie o dia de atendimento chamando o primeiro cliente da lista.
                </p>
                {waiting.length > 0 ? (
                  <AdminButton onClick={handleStartNext} disabled={working}>
                    <Play className="size-4" /> Chamar Primeiro Cliente
                  </AdminButton>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Próximos na Fila (Lista de Espera)
              </h3>
              <span className="text-xs font-semibold text-slate-500">{waiting.length} clientes aguardando</span>
            </div>
            {waiting.length === 0 ? (
              <AdminEmpty lightMode={lightMode} text="Nenhum cliente aguardando na fila." />
            ) : (
              <div className="space-y-3">
                {waiting.map((entry, index) => {
                  const estTime = entry.estimatedStart
                    ? new Date(entry.estimatedStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'
                  return (
                    <div
                      key={entry.id}
                      className={`flex flex-col gap-4 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
                        lightMode ? 'border-gray-100 bg-white' : 'border-slate-700/60 bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {index + 1}º
                        </div>
                        <div>
                          <h4 className={`font-bold ${lightMode ? 'text-gray-900' : 'text-white'}`}>{entryName(entry)}</h4>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {entryService(entry)} • Duração: {entryDuration(entry)} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-slate-500">Previsão</span>
                          <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{estTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleReorder(entry.id, index)}
                            className="rounded-lg border border-indigo-100 p-1.5 text-indigo-600 disabled:opacity-30 dark:border-indigo-900/40 dark:text-indigo-400"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === waiting.length - 1}
                            onClick={() => handleReorder(entry.id, index + 2)}
                            className="rounded-lg border border-indigo-100 p-1.5 text-indigo-600 disabled:opacity-30 dark:border-indigo-900/40 dark:text-indigo-400"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSkip(entry.id)}
                            className="rounded-lg px-2 py-1 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            Ausente
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {walkInOpen ? (
        <AdminModal title="Adicionar na Fila" onClose={() => setWalkInOpen(false)} lightMode={lightMode}>
          <div className="space-y-3">
            <div>
              <label className={labelClass(lightMode)}>Nome do cliente</label>
              <input value={walkInName} onChange={(e) => setWalkInName(e.target.value)} className={inputClass(lightMode)} />
            </div>
            <div>
              <label className={labelClass(lightMode)}>Serviço</label>
              <select value={walkInService} onChange={(e) => setWalkInService(e.target.value)} className={inputClass(lightMode)}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.duration} min
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setWalkInOpen(false)} className="text-sm text-slate-500">
                Cancelar
              </button>
              <AdminButton onClick={handleWalkIn} disabled={working}>
                {working ? 'Adicionando...' : 'Confirmar'}
              </AdminButton>
            </div>
          </div>
        </AdminModal>
      ) : null}

      {checkoutApt && salonId ? (
        <AdminCheckoutModal
          appointment={checkoutApt}
          salonId={salonId}
          lightMode={lightMode}
          onClose={() => {
            setCheckoutApt(null)
            setCheckoutAction(null)
          }}
          onSuccess={async () => {
            if (checkoutAction === 'completeAndNext' && session?.id) {
              try {
                await startNextInQueue(session.id)
              } catch {
                /* payment ok */
              }
            }
            await loadSession(selectedProf)
          }}
        />
      ) : null}
    </div>
  )
}
