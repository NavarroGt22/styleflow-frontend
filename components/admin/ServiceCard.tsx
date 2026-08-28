'use client'

import { CheckCircle2, Clock3, Pencil, Scissors, Trash2, XCircle } from 'lucide-react'
import type { Service } from '@/lib/admin/types'

type Props = { service: Service; onDelete: (id: string) => void; lightMode?: boolean }

export default function ServiceCard({ service, onDelete, lightMode = false }: Props) {
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl border transition duration-300 hover:-translate-y-0.5 ${
        lightMode
          ? 'border-slate-200 bg-white shadow-sm hover:shadow-md'
          : 'border-slate-700 bg-[#1d2a3e] hover:border-indigo-400/50 hover:ring-1 hover:ring-indigo-400/30'
      }`}
    >
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`grid size-9 place-items-center rounded-lg ${
              lightMode ? 'bg-indigo-50 text-indigo-500' : 'bg-[#142035] text-indigo-300'
            }`}
          >
            <Scissors className="size-4" />
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              service.active
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
            }`}
          >
            {service.active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
            {service.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        <h3 className={`mt-3 text-[11px] font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{service.name}</h3>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--brand)]">{service.category}</p>

        <div className={`my-3 h-px ${lightMode ? 'bg-slate-200' : 'bg-slate-600'}`} />

        <div className={`flex items-center gap-1.5 text-[9px] ${lightMode ? 'text-slate-600' : 'text-slate-400'}`}>
          <Clock3 className="size-3" />
          {service.duration} min
        </div>
        <p className="mt-2 text-[11px] font-bold text-emerald-400">
          R$ {service.price.toFixed(2).replace('.', ',')}
        </p>
      </div>

      <footer
        className={`flex items-center justify-end gap-3 border-t px-3.5 py-2.5 text-[9px] font-bold uppercase tracking-wide ${
          lightMode ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-600 text-slate-400'
        }`}
      >
        <button type="button" className="inline-flex items-center gap-1 transition-colors hover:text-[var(--brand)]">
          <Pencil className="size-3" />
          Editar
        </button>
        <button
          type="button"
          aria-label={`Excluir ${service.name}`}
          onClick={() => onDelete(service.id)}
          className="transition-colors hover:text-rose-400"
        >
          <Trash2 className="size-3" />
        </button>
      </footer>
    </article>
  )
}
