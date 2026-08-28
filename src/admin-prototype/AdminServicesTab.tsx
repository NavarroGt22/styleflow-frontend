import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import ServiceCard from './ServiceCard';
import { mockServices } from './mock-data';

export default function AdminServicesTab() {
  const [query, setQuery] = useState('');
  const [services, setServices] = useState(mockServices);

  const filtered = useMemo(
    () =>
      services.filter((service) =>
        `${service.name} ${service.category}`.toLowerCase().includes(query.toLowerCase())
      ),
    [services, query]
  );

  return (
    <section aria-labelledby="services-heading">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Buscar serviço</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar serviço por nome..."
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
          />
        </label>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110"
        >
          <Plus className="size-4" />
          Novo Serviço
        </button>
      </div>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onDelete={(id) => setServices((current) => current.filter((item) => item.id !== id))}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 py-16 text-center text-slate-400">
          Nenhum serviço encontrado.
        </div>
      )}
    </section>
  );
}
