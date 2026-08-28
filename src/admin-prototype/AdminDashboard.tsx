import { useState } from 'react';
import {
  CalendarDays,
  DollarSign,
  Lock,
  LogOut,
  Moon,
  Plus,
  Scissors,
  Store,
  Sun,
  Timer,
  Users,
} from 'lucide-react';
import AdminPlaceholderTab from './AdminPlaceholderTab';
import AdminServicesTab from './AdminServicesTab';
import type { AdminDashboardProps, AdminTab } from './types';

const tabs: { id: AdminTab; label: string; icon: typeof Scissors }[] = [
  { id: 'services', label: 'Meus Serviços', icon: Scissors },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'equipe', label: 'Equipe', icon: Users },
  { id: 'fila', label: 'Fila Dinâmica', icon: Timer },
  { id: 'salao', label: 'Salão', icon: Store },
];

function WhatsAppIcon() {
  return (
    <svg className="size-3.5 fill-current" viewBox="0 0 24 24" aria-hidden>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.793 1.457 5.485.002 9.95-4.461 9.953-9.946.002-2.657-1.032-5.155-2.906-7.03C16.615 1.76 14.12.727 11.46.727 5.973.727 1.507 5.19 1.504 10.677c0 1.682.449 3.322 1.302 4.773L1.879 21.05l5.768-1.512-.1 1.616z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="size-3.5 fill-current" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

export default function AdminDashboard({
  brandName = 'Leleco',
  unitName = 'Leleco Barbes',
  ownerName = 'Joel',
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('services');
  const [lightMode, setLightMode] = useState(false);
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <main
      className={`min-h-screen px-4 py-5 transition-colors sm:px-8 lg:px-10 ${
        lightMode ? 'bg-slate-100 text-slate-950' : 'bg-[#0a0e1a] text-white'
      }`}
    >
      <div className="mx-auto max-w-[1180px]">
        <header className="border-b border-slate-700/80 pb-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
                <Scissors className="size-7 text-white" />
              </div>
              <div>
                <div className="mb-1 inline-flex rounded bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                  SaaS Styleflow
                </div>
                <h1 className="text-3xl font-black tracking-tight">{brandName}</h1>
                <p className="text-sm text-slate-400">Unidade: {unitName}</p>
                <span className="mt-2 inline-flex rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
                  Plano Básico
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/50 px-3 py-2 text-xs font-bold text-indigo-300"
              >
                <Plus className="size-3.5" />
                Adicionar unidade
              </button>
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
              <a
                href="https://instagram.com/leleco.barbers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 px-3 py-2 text-xs font-bold text-white"
              >
                <InstagramIcon />
                Instagram
              </a>
              <button
                type="button"
                aria-label="Alternar tema"
                onClick={() => setLightMode((value) => !value)}
                className="ml-2 grid size-9 place-items-center rounded-full bg-slate-800 text-slate-300"
              >
                {lightMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </button>
              <button
                type="button"
                aria-label="Alterar senha"
                className="grid size-9 place-items-center rounded-full bg-slate-800 text-slate-300"
              >
                <Lock className="size-4" />
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-500/50 px-3 py-2 text-xs font-bold text-rose-400"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </div>
          </div>
          <div className="mt-6">
            <h2 className="text-2xl font-black">Painel Administrativo</h2>
            <p className="mt-1 text-sm text-slate-400">
              Bem-vindo(a), <strong className="text-white">{ownerName}</strong>
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">
              Ambiente de teste · dados mockados
            </p>
          </div>
        </header>

        <nav
          aria-label="Navegação administrativa"
          className="flex gap-1 overflow-x-auto border-b border-slate-700/80 py-2"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
                activeTab === id
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <section className="pt-8">
          {activeTab === 'services' ? (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold">Meus Serviços</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Gerencie os serviços oferecidos pelo seu salão.
                </p>
              </div>
              <AdminServicesTab />
            </>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold">{active.label}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Acompanhe e gerencie esta área do seu salão.
                </p>
              </div>
              <AdminPlaceholderTab
                icon={active.icon}
                title="Em breve"
                description="Esta funcionalidade está sendo preparada para deixar sua operação ainda mais simples."
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
