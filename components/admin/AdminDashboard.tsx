'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Camera,
  DollarSign,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Package,
  Plus,
  Scissors,
  Store,
  Sun,
  Timer,
  Users,
} from 'lucide-react'
import AdminServicesTab from './tabs/AdminServicesTab'
import AdminAgendaTab from './tabs/AdminAgendaTab'
import AdminFinancialTab from './tabs/AdminFinancialTab'
import AdminTeamTab from './tabs/AdminTeamTab'
import AdminStockTab from './tabs/AdminStockTab'
import AdminQueueTab from './tabs/AdminQueueTab'
import AdminSalonTab from './tabs/AdminSalonTab'
import AdminPageShell from './AdminPageShell'
import type { AdminTab, AdminDashboardProps } from '@/lib/admin/types'
import { clearSession, getSessionUser, resolveSalonForSlug } from '@/lib/auth'
import { apiUrl } from '@/lib/config'

const DEFAULT_BRAND = '#d5a85c'

const tabs: { id: AdminTab; label: string; icon: typeof Scissors }[] = [
  { id: 'services', label: 'Meus Serviços', icon: Scissors },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'equipe', label: 'Equipe', icon: Users },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'fila', label: 'Fila Dinâmica', icon: Timer },
  { id: 'salao', label: 'Salão', icon: Store },
]

function resolveBrandColor(options: {
  prop?: string
  salon?: { primaryColor?: string | null; tenant?: { primaryColor?: string | null } }
  tenant?: { primaryColor?: string | null }
  fetched?: string | null
}): string {
  return (
    options.prop ||
    options.fetched ||
    options.salon?.primaryColor ||
    options.salon?.tenant?.primaryColor ||
    options.tenant?.primaryColor ||
    DEFAULT_BRAND
  )
}

export default function AdminDashboard({
  salonSlug = 'leleco',
  brandName,
  unitName,
  ownerName,
  salonId,
  primaryColor,
}: AdminDashboardProps) {
  const router = useRouter()
  const sessionUser = getSessionUser()
  const salonFromSession = sessionUser ? resolveSalonForSlug(sessionUser, salonSlug) : null

  const resolvedBrand = brandName ?? salonFromSession?.name ?? 'Leleco'
  const resolvedUnit = unitName ?? salonFromSession?.name ?? 'Leleco Barbers'
  const resolvedOwner = ownerName ?? sessionUser?.name ?? 'Joel'
  const brandUpper = resolvedBrand.toUpperCase()

  const [resolvedSalonId, setResolvedSalonId] = useState<string | undefined>(salonId ?? salonFromSession?.id)
  const [fetchedBrandColor, setFetchedBrandColor] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('services')
  const [lightMode, setLightMode] = useState(false)

  const brandColor = resolveBrandColor({
    prop: primaryColor,
    salon: salonFromSession ?? undefined,
    tenant: sessionUser?.tenant,
    fetched: fetchedBrandColor,
  })

  useEffect(() => {
    let cancelled = false

    async function resolveSalon() {
      if (resolvedSalonId && primaryColor) return

      try {
        const response = await fetch(apiUrl(`/queue/public/${salonSlug}`))
        if (!response.ok) return
        const data = await response.json()
        const id = data?.salon?.id ?? data?.salonId ?? data?.id
        const color =
          data?.tenant?.primaryColor ??
          data?.salon?.tenant?.primaryColor ??
          data?.primaryColor ??
          null

        if (!cancelled) {
          if (!resolvedSalonId && typeof id === 'string' && id.trim()) {
            setResolvedSalonId(id.trim())
          }
          if (!primaryColor && typeof color === 'string' && color.trim()) {
            setFetchedBrandColor(color.trim())
          }
        }
      } catch {
        /* fallback */
      }
    }

    resolveSalon()
    return () => {
      cancelled = true
    }
  }, [salonSlug, primaryColor, resolvedSalonId])

  const handleLogout = () => {
    clearSession()
    router.push('/login')
  }

  const shellClass = lightMode ? '!bg-slate-100 !text-slate-950' : ''

  return (
    <AdminPageShell variant="client" className={shellClass} brandColor={brandColor}>
      <main className={`min-h-screen px-4 py-5 transition-colors sm:px-8 lg:px-10 ${lightMode ? 'text-slate-950' : 'text-slate-100'}`}>
        <div className="mx-auto max-w-[1180px]">
          <header
            className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-[10px] font-bold ${
              lightMode ? 'border-slate-300 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
            }`}
          >
            <span className={`flex items-center gap-2 ${lightMode ? 'text-slate-600' : 'text-slate-300'}`}>
              <span className="size-2 rounded-full bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]" />
              Admin: {resolvedOwner}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="uppercase tracking-wide text-rose-400 transition-colors hover:text-rose-300"
            >
              Sair
            </button>
          </header>

          <section className={`mb-6 border-b pb-5 text-center ${lightMode ? 'border-slate-300' : 'border-slate-700'}`}>
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg border border-[var(--brand)]/60 bg-[var(--brand)]/10 text-[var(--brand)]">
              <Scissors className="size-5 -rotate-45" />
            </div>
            <p className="mx-auto mb-1 w-fit rounded bg-gradient-to-r from-indigo-500 to-pink-500 px-2 py-0.5 text-[8px] font-bold tracking-wide text-white">
              {brandUpper} · STYLEFLOW
            </p>
            <h1 className={`text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{resolvedBrand}</h1>
            <p className={`mt-1 text-[9px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {resolvedUnit} · Plano Básico · /{salonSlug}
            </p>
          </section>

          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition ${
                lightMode
                  ? 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                  : 'border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10'
              }`}
            >
              <Plus className="size-3.5" />
              Adicionar unidade
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#10251f] transition hover:bg-emerald-400"
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              <Camera className="size-3.5" />
              Instagram
            </button>
            <button
              type="button"
              aria-label="Alternar tema"
              onClick={() => setLightMode((value) => !value)}
              className={`grid size-9 place-items-center rounded-full transition ${
                lightMode ? 'bg-slate-200 text-slate-700' : 'bg-[#1d2a3e] text-slate-300 hover:bg-[#142035]'
              }`}
            >
              {lightMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
            <button
              type="button"
              aria-label="Alterar senha"
              className={`grid size-9 place-items-center rounded-full transition ${
                lightMode ? 'bg-slate-200 text-slate-700' : 'bg-[#1d2a3e] text-slate-300 hover:bg-[#142035]'
              }`}
            >
              <Lock className="size-4" />
            </button>
          </div>

          <div className="mb-4 text-center">
            <h2 className="text-xl font-black tracking-tight">Painel Administrativo</h2>
            <p className={`mt-1 text-[10px] ${lightMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Bem-vindo(a),{' '}
              <strong className={lightMode ? 'text-slate-900' : 'text-white'}>{resolvedOwner}</strong>
            </p>
          </div>

          <nav
            aria-label="Navegação administrativa"
            className={`mb-8 flex gap-4 overflow-x-auto border-b ${
              lightMode ? 'border-gray-200' : 'border-slate-700'
            }`}
          >
            {tabs.map(({ id, label, icon: Icon }) => {
              const selected = activeTab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-[var(--brand)] text-[var(--brand)]'
                      : lightMode
                        ? 'border-transparent text-gray-500 hover:text-gray-700'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              )
            })}
          </nav>

          <section className="pt-2">
            {!resolvedSalonId ? (
              <div className={`rounded-xl border border-dashed p-8 text-center text-[10px] font-bold uppercase tracking-wide ${lightMode ? 'border-slate-300 text-slate-500' : 'border-slate-600 text-slate-400'}`}>
                Identificando salão... Se demorar, saia e entre novamente.
              </div>
            ) : (
              <>
                {activeTab === 'services' && <AdminServicesTab salonId={resolvedSalonId} lightMode={lightMode} />}
                {activeTab === 'agenda' && <AdminAgendaTab salonId={resolvedSalonId} lightMode={lightMode} />}
                {activeTab === 'financeiro' && <AdminFinancialTab salonId={resolvedSalonId} lightMode={lightMode} />}
                {activeTab === 'equipe' && <AdminTeamTab salonId={resolvedSalonId} lightMode={lightMode} />}
                {activeTab === 'estoque' && <AdminStockTab salonId={resolvedSalonId} lightMode={lightMode} />}
                {activeTab === 'fila' && (
                  <AdminQueueTab
                    salonId={resolvedSalonId}
                    salonSlug={salonSlug}
                    lightMode={lightMode}
                    onNavigateTab={setActiveTab}
                  />
                )}
                {activeTab === 'salao' && <AdminSalonTab salonId={resolvedSalonId} lightMode={lightMode} />}
              </>
            )}
          </section>
        </div>
      </main>
    </AdminPageShell>
  )
}
