'use client'

import type { QueueEntry } from './types'

type Props = {
  entry: QueueEntry
  index: number
  brandColor: string
}

export function QueueEntryCard({ entry, index, brandColor }: Props) {
  const estTime = new Date(entry.estimatedStart).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const isMe = entry.isCurrentUser

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
        isMe ? '' : 'border-white/5'
      }`}
      style={
        isMe
          ? { borderColor: brandColor, boxShadow: `0 0 0 2px ${brandColor}33` }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
            isMe ? 'text-[#111] animate-pulse' : 'bg-black/40 text-slate-300'
          }`}
          style={isMe ? { backgroundColor: brandColor } : undefined}
        >
          {index + 1}º
        </div>
        <div>
          <h5 className="flex items-center gap-2 text-sm font-bold text-white">
            {entry.customerName}
            {isMe && (
              <span
                className="rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#111] animate-pulse"
                style={{ backgroundColor: brandColor }}
              >
                você
              </span>
            )}
          </h5>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">{entry.serviceName}</p>
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
          isMe ? 'text-[#111] border-transparent' : 'border-white/10 text-slate-300 bg-black/30'
        }`}
        style={isMe ? { backgroundColor: brandColor } : undefined}
      >
        Previsão: {estTime}
      </span>
    </div>
  )
}
