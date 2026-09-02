'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { QueuePanel } from './QueuePanel'
import { QueueProfessionalTabs } from './QueueProfessionalTabs'
import type { QueueSession } from './types'

type Props = {
  queues: QueueSession[]
  brandColor: string
  brandName?: string
  currentUser: { id: string; name?: string } | null
  salonSlug?: string
  isCustomDomain: boolean
  onJoin: (queue: QueueSession) => void
  onLeave: (sessionId: string) => void
}

function findInitialSessionId(queues: QueueSession[], currentUser: Props['currentUser']): string {
  if (!queues.length) return ''
  if (currentUser) {
    const withUser = queues.find((q) =>
      q.entries.some(
        (e) => e.isCurrentUser && ['IN_PROGRESS', 'WAITING'].includes(e.status),
      ),
    )
    if (withUser) return withUser.sessionId
  }
  return queues[0].sessionId
}

export function DynamicQueueSection({
  queues,
  brandColor,
  brandName,
  currentUser,
  salonSlug,
  isCustomDomain,
  onJoin,
  onLeave,
}: Props) {
  const [selectedSessionId, setSelectedSessionId] = useState('')

  useEffect(() => {
    if (!queues.length) {
      setSelectedSessionId('')
      return
    }
    const stillExists = queues.some((q) => q.sessionId === selectedSessionId)
    if (!selectedSessionId || !stillExists) {
      setSelectedSessionId(findInitialSessionId(queues, currentUser))
    }
  }, [queues, currentUser, selectedSessionId])

  const selectedQueue = queues.find((q) => q.sessionId === selectedSessionId)

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center justify-center pb-6 text-center">
        <span
          className="mb-3 rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#111]"
          style={{ backgroundColor: brandColor }}
        >
          {brandName ? brandName.toUpperCase() : 'STYLEFLOW'} • FILA DINÂMICA
        </span>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Acompanhe os Atendimentos
        </h1>
        <p className="mt-2 max-w-lg text-sm text-slate-400">
          Veja quem está sendo atendido e os próximos da fila em tempo real.
        </p>
      </header>

      {queues.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#2a2622] p-8 text-center">
          <Users size={40} className="mx-auto mb-4 text-slate-500" />
          <h3 className="font-bold text-white">Nenhuma fila aberta hoje</h3>
          <p className="mt-1 text-sm text-slate-400">
            Os barbeiros ainda não iniciaram os atendimentos por fila hoje.
          </p>
        </div>
      ) : (
        <>
          <QueueProfessionalTabs
            queues={queues}
            selectedSessionId={selectedSessionId}
            brandColor={brandColor}
            onSelect={setSelectedSessionId}
          />
          {selectedQueue && (
            <QueuePanel
              queue={selectedQueue}
              brandColor={brandColor}
              currentUser={currentUser}
              salonSlug={salonSlug}
              isCustomDomain={isCustomDomain}
              onJoin={onJoin}
              onLeave={onLeave}
            />
          )}
        </>
      )}
    </div>
  )
}
