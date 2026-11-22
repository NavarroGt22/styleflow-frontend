'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { endPlatformSession } from '@/lib/platform/client'

const sections = [['', 'Visão geral'], ['/crm', 'CRM'], ['/prospeccao', 'Prospecção'], ['/barbearias', 'Barbearias'], ['/financeiro', 'Financeiro'], ['/tarefas', 'Tarefas e modelos'], ['/relatorios', 'Relatórios'], ['/suporte', 'Suporte']] as const
export function PlatformShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [name, setName] = useState(''), [error, setError] = useState(''), [ready, setReady] = useState(false)
  useEffect(() => { const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload() }; window.addEventListener('pageshow', restored); return () => window.removeEventListener('pageshow', restored); }, [])
  useEffect(() => {
    let alive = true, validating = false, actorId = ''
    let expiryTimer: ReturnType<typeof setTimeout> | undefined
    const requireLogin = () => { if (alive) { setReady(false); window.location.replace('/login?next=/platform/super') } }
    const validate = async () => {
      if (validating || !alive) return
      validating = true
      try {
        const response = await fetch('/api/platform/session', { cache: 'no-store' })
        if (!alive) return
        if (response.status === 401 || response.status === 403) { requireLogin(); return }
        if (!response.ok) throw new Error('Não foi possível validar a sessão do Master.')
        const data = await response.json()
        if (!alive) return
        if (actorId && actorId !== data.user.id) { window.location.reload(); return }
        actorId = data.user.id
        const remaining = Date.parse(data.expiresAt) - Date.now()
        if (!Number.isFinite(remaining) || remaining <= 0) { requireLogin(); return }
        clearTimeout(expiryTimer)
        expiryTimer = setTimeout(requireLogin, remaining)
        setName(data.user.name); setError(''); setReady(true)
      } catch (cause) {
        if (alive) { setReady(false); setError(cause instanceof Error ? cause.message : 'Não foi possível validar a sessão do Master.') }
      } finally { validating = false }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void validate() }
    void validate()
    const interval = setInterval(onVisible, 60_000)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; clearTimeout(expiryTimer); clearInterval(interval); window.removeEventListener('focus', onVisible); document.removeEventListener('visibilitychange', onVisible) }
  }, [])
  if (!ready) return <main className="grid min-h-screen place-content-center bg-slate-950 p-6 text-slate-200"><p role={error ? 'alert' : 'status'}>{error || 'Validando acesso ao Master…'}</p>{error && <button onClick={() => window.location.reload()}>Tentar novamente</button>}</main>
  return <div className="min-h-screen bg-slate-950 text-slate-100"><header className="border-b border-slate-800 px-5 py-4"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><div><strong>MeuCorteJá Master</strong><p className="text-sm text-slate-400">{name} · Gestão da plataforma</p></div><button className="rounded-lg border border-slate-700 px-4 py-2" onClick={async () => { try { await endPlatformSession(); window.location.replace('/login?next=/platform/super') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao sair.') } }}>Sair do Master</button></div><nav aria-label="Gestão da plataforma" className="mx-auto mt-4 flex max-w-7xl flex-wrap gap-2">{sections.map(([suffix, label]) => <Link key={suffix} href={`/platform/super${suffix}`} aria-current={path === `/platform/super${suffix}` ? 'page' : undefined} className={`rounded-lg px-4 py-2 text-sm ${path === `/platform/super${suffix}` ? 'bg-lime-300 font-semibold text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>{label}</Link>)}</nav></header>{error && <p role="alert" className="mx-auto max-w-7xl p-4 text-red-300">{error}</p>}{children}</div>
}
