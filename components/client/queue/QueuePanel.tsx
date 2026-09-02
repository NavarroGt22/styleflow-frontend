'use client'

import Link from 'next/link'
import { Clock, Users } from 'lucide-react'
import { computeQueueWaitMinutes } from '@/lib/client/queue-wait'
import { QueueActiveBlock } from './QueueActiveBlock'
import { QueueEntryCard } from './QueueEntryCard'
import type { QueueEntry, QueueSession } from './types'

type Props = {
  queue: QueueSession
  brandColor: string
  currentUser: { id: string } | null
  salonSlug?: string
  isCustomDomain: boolean
  onJoin: (queue: QueueSession) => void
  onLeave: (sessionId: string) => void
}

export function QueuePanel({
  queue,
  brandColor,
  currentUser,
  salonSlug,
  isCustomDomain,
  onJoin,
  onLeave,
}: Props) {
  const inProgressEntry = queue.entries.find((e) => e.status === 'IN_PROGRESS')
  const waitingEntries = queue.entries.filter((e) => e.status === 'WAITING')
  const userEntry = currentUser
    ? queue.entries.find(
        (e) => e.isCurrentUser && ['IN_PROGRESS', 'WAITING'].includes(e.status),
      )
    : null

  const totalWaitMinutes = computeQueueWaitMinutes({
    waitingEntries,
    inProgressEntry,
    queueServices: queue.services,
    userEntry,
  })

  const userWaitingIndex = userEntry?.status === 'WAITING'
    ? waitingEntries.findIndex((e) => e.isCurrentUser)
    : -1

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#2a2622] shadow-xl">
      <div className="flex flex-col gap-4 border-b border-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">{queue.professionalName}</h2>
          <div className="mt-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Users size={14} style={{ color: brandColor }} />
            <span>
              {waitingEntries.length}{' '}
              {waitingEntries.length === 1 ? 'cliente aguardando' : 'clientes aguardando'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold text-slate-200">
            <Clock size={14} style={{ color: brandColor }} />
            <span>Espera estimada: ~{totalWaitMinutes} min</span>
          </div>

          {userEntry ? (
            <div className="flex items-center gap-2">
              <span
                className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider border ${
                  userEntry.status === 'IN_PROGRESS'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'animate-pulse border-transparent text-[#111]'
                }`}
                style={
                  userEntry.status !== 'IN_PROGRESS'
                    ? { backgroundColor: `${brandColor}33`, color: brandColor, borderColor: `${brandColor}50` }
                    : undefined
                }
              >
                {userEntry.status === 'IN_PROGRESS'
                  ? 'Sua Vez!'
                  : `${userWaitingIndex + 1}º da Fila`}
              </span>
              <button
                type="button"
                onClick={() => onLeave(queue.sessionId)}
                className="cursor-pointer rounded-xl border-none bg-red-500 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-red-500/30 transition-all hover:bg-red-600 hover:scale-105 active:scale-95"
              >
                Sair da Fila
              </button>
            </div>
          ) : currentUser ? (
            <button
              type="button"
              onClick={() => onJoin(queue)}
              className="cursor-pointer rounded-xl border-none px-4 py-2 text-xs font-black uppercase tracking-wider text-[#111] shadow-md transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: brandColor }}
            >
              Entrar na Fila
            </button>
          ) : (
            <Link
              href={isCustomDomain ? '/login' : `/app/${salonSlug}/login`}
              className="flex items-center justify-center rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider text-[#111] no-underline shadow-md transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: brandColor }}
            >
              Entrar na Fila
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-6 p-6">
        <QueueActiveBlock entry={inProgressEntry} brandColor={brandColor} />

        <div className="space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: brandColor }} />
            Próximos na Fila
          </h4>

          {waitingEntries.length === 0 ? (
            <p className="pl-3 text-sm font-medium italic text-slate-400">
              A fila está vazia. Seja o próximo!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {waitingEntries.map((entry, index) => (
                <QueueEntryCard key={entry.id} entry={entry} index={index} brandColor={brandColor} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
