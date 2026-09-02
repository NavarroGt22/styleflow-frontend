'use client'

import { QueueActiveTimer } from '@/components/client/QueueActiveTimer'
import type { QueueEntry } from './types'

type Props = {
  entry: QueueEntry | null | undefined
  brandColor: string
}

export function QueueActiveBlock({ entry, brandColor }: Props) {
  if (!entry) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-black/40 p-4 text-center text-sm font-medium text-slate-400">
        Nenhum atendimento ativo no momento.
      </div>
    )
  }

  const isMe = entry.isCurrentUser

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-5 sm:flex-row sm:items-center sm:justify-between"
      style={isMe ? { borderColor: `${brandColor}40` } : undefined}
    >
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-xs font-bold tracking-wide text-[#111] shadow-md"
          style={{ backgroundColor: brandColor }}
        >
          ATUAL
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Atendimento em Andamento
          </span>
          <h3 className="mt-0.5 text-lg font-extrabold text-white">
            {entry.customerName}
            {isMe && (
              <span
                className="ml-2 rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#111]"
                style={{ backgroundColor: brandColor }}
              >
                Você
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{entry.serviceName}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-4 py-2.5">
        <span className="text-xs font-bold text-slate-500">Cronômetro:</span>
        <QueueActiveTimer entry={entry} />
      </div>
    </div>
  )
}
