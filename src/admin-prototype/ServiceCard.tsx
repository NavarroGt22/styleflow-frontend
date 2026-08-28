import { CheckCircle2, Clock3, DollarSign, Pencil, Scissors, Trash2, XCircle } from 'lucide-react';
import type { Service } from './types';

type Props = { service: Service; onDelete: (id: number) => void };

export default function ServiceCard({ service, onDelete }: Props) {
  return (
    <article className="group flex min-h-[238px] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/90 shadow-xl shadow-black/10">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-slate-700 text-blue-400">
            <Scissors className="size-5" />
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
              service.active
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
            }`}
          >
            {service.active ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
            {service.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <h3 className="mt-5 text-base font-bold text-white">{service.name}</h3>
        <p className="mt-1 text-sm font-medium text-indigo-400">{service.category}</p>
        <div className="my-4 h-px bg-slate-700" />
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Clock3 className="size-4 text-slate-400" />
          Duração: {service.duration} min
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
          <DollarSign className="size-4 text-emerald-400" />
          R$ {service.price.toFixed(2).replace('.', ',')}
        </div>
      </div>
      <footer className="flex items-center justify-end gap-4 border-t border-slate-700 bg-slate-900/30 px-5 py-3 text-sm text-slate-400">
        <button type="button" className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
          <Pencil className="size-4" />
          Editar
        </button>
        <button
          type="button"
          aria-label={`Excluir ${service.name}`}
          onClick={() => onDelete(service.id)}
          className="text-slate-400 transition-colors hover:text-rose-400"
        >
          <Trash2 className="size-4" />
        </button>
      </footer>
    </article>
  );
}
