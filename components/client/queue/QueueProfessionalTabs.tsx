'use client'

import type { QueueSession } from './types'

type Props = {
  queues: QueueSession[]
  selectedSessionId: string
  brandColor: string
  onSelect: (sessionId: string) => void
}

export function QueueProfessionalTabs({ queues, selectedSessionId, brandColor, onSelect }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {queues.map((q) => {
        const isActive = q.sessionId === selectedSessionId
        return (
          <button
            key={q.sessionId}
            type="button"
            onClick={() => onSelect(q.sessionId)}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-all cursor-pointer border-none ${
              isActive ? 'text-[#111] shadow-md' : 'bg-[#1a1a1a] text-white hover:bg-[#252525]'
            }`}
            style={isActive ? { backgroundColor: brandColor } : undefined}
          >
            {q.professionalName}
          </button>
        )
      })}
    </div>
  )
}
