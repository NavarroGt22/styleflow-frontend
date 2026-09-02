'use client'

import { Scissors, MapPin } from 'lucide-react'

type Props = {
  brandName?: string
  salonName: string
  salonAddress?: string
  logoUrl?: string
  brandColor: string
  mode?: 'booking' | 'queue'
}

export function BookingHero({
  brandName,
  salonName,
  salonAddress,
  logoUrl,
  brandColor,
  mode = 'booking',
}: Props) {
  const badgeSuffix = mode === 'booking' ? 'AGENDA ONLINE' : 'FILA DINÂMICA'
  const subtitle =
    mode === 'booking'
      ? 'Escolha seu serviço, profissional e reserve seu horário em poucos cliques.'
      : 'Veja quem está sendo atendido e os próximos da fila em tempo real.'

  return (
    <header className="mb-8 pb-6 text-center">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={brandName || salonName}
          className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-xl"
        />
      ) : (
        <div
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-xl"
          style={{ backgroundColor: brandColor }}
        >
          <Scissors size={36} className="-rotate-45" />
        </div>
      )}
      <span
        className="mb-3 inline-block rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#111]"
        style={{ backgroundColor: brandColor }}
      >
        {brandName ? brandName.toUpperCase() : 'STYLEFLOW'} • {badgeSuffix}
      </span>
      <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{salonName}</h1>
      {salonAddress && (
        <p className="mx-auto mt-2 flex max-w-md items-center justify-center gap-1.5 text-sm text-slate-400">
          <MapPin size={14} className="shrink-0" style={{ color: brandColor }} />
          <span>{salonAddress}</span>
        </p>
      )}
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
    </header>
  )
}
