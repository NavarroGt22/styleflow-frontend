'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Headset } from 'lucide-react'
import { getSessionUser, isAdminSessionExpired } from '@/lib/auth'
import {
  bootstrapSupport, clearSupportContext, endSupport, subscribeToSupportInvalidation, supportAdminPath,
} from '@/lib/support/client'
import { isSupportSessionId, type SupportContext } from '@/lib/support/contract'
import AdminDashboard from './AdminDashboard'
import AdminPageShell from './AdminPageShell'

function normalSessionPath(): string {
  const user = getSessionUser()
  if (!user || isAdminSessionExpired()) return '/login'
  if (user.role === 'SUPER_ADMIN') return '/platform/super'
  if (user.role === 'CUSTOMER') return '/login'
  const salonSlug = user.professionalProfile?.salon?.slug || user.salons?.[0]?.slug
  if (!salonSlug || salonSlug === '.' || salonSlug === '..') return '/login'
  return `/admin/${encodeURIComponent(salonSlug)}`
}
async function returnSessionPath(): Promise<string> {
  const normal = normalSessionPath()
  if (normal !== '/login') return normal
  try {
    const response = await fetch('/api/platform/session', { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    if (response.ok) return '/platform/super/barbearias'
  } catch { /* The independent normal session keeps its original fallback. */ }
  return normal
}

export default function SupportAdminSession({ sessionId, salonSlug }: { sessionId: string; salonSlug?: string }) {
  const router = useRouter()
  const [context, setContext] = useState<SupportContext | null>(null)
  const [sessionError, setSessionError] = useState('')
  const [endError, setEndError] = useState('')
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function start() {
      try {
        const verified = await bootstrapSupport(sessionId, controller.signal)
        if (verified.session.salonSlug !== salonSlug) {
          router.replace(supportAdminPath(verified))
          return
        }
        setContext(verified)
      } catch (error) {
        if (!controller.signal.aborted) {
          setSessionError(error instanceof Error ? error.message : 'Não foi possível abrir o painel de suporte.')
        }
      }
    }
    void start()
    return () => {
      controller.abort()
      clearSupportContext(sessionId)
    }
  }, [router, sessionId, salonSlug])

  useEffect(() => {
    if (!context) return
    const expiry = window.setTimeout(() => {
      clearSupportContext(context.session.id)
      setSessionError('A sessão de suporte expirou.')
    }, Math.max(0, Date.parse(context.session.expiresAt) - Date.now()))
    const unsubscribe = subscribeToSupportInvalidation(setSessionError)
    return () => {
      window.clearTimeout(expiry)
      unsubscribe()
    }
  }, [context])

  async function handleEnd() {
    if (ending) return
    setEnding(true)
    setEndError('')
    try {
      await endSupport(sessionId)
      router.replace(await returnSessionPath())
    } catch (error) {
      setEndError(error instanceof Error ? error.message : 'Não foi possível encerrar o suporte. Tente novamente.')
      setEnding(false)
    }
  }

  if (!context || sessionError) {
    return (
      <AdminPageShell>
        <main className="mx-auto grid min-h-screen max-w-md place-content-center gap-4 px-6">
          <h1 className="text-xl font-semibold text-white">Acesso de suporte</h1>
          <p role={sessionError ? 'alert' : 'status'} className="text-sm leading-relaxed text-slate-300">
            {sessionError || 'Validando a sessão…'}
          </p>
          {sessionError && (
            <>
              {endError && <p role="alert" className="text-sm text-red-300">{endError}</p>}
              {isSupportSessionId(sessionId) && (
                <button type="button" onClick={handleEnd} disabled={ending}
                  className="w-fit rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-60">
                  {ending ? 'Encerrando…' : 'Encerrar suporte'}
                </button>
              )}
              <button type="button" onClick={async () => router.replace(await returnSessionPath())} disabled={ending}
                className="w-fit rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Voltar ao painel sem encerrar
              </button>
            </>
          )}
        </main>
      </AdminPageShell>
    )
  }

  const { session } = context
  const salonName = context.user.salons?.[0]?.name || session.tenantName
  const expiryLabel = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
    .format(new Date(session.expiresAt))

  return (
    <>
      <aside aria-label="Sessão de suporte" className="sticky top-0 z-40 border-b border-amber-400/60 bg-amber-100 text-amber-950">
        <div className="mx-auto flex max-w-[1260px] flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2.5 sm:px-8 lg:px-10">
          <div className="flex items-start gap-2.5">
            <Headset aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold">Suporte · {salonName}</p>
              <p className="text-xs">
                {session.actorName} · Expira às <time dateTime={session.expiresAt}>{expiryLabel}</time>
              </p>
              {endError && <p role="alert" className="mt-1 text-xs font-semibold text-red-800">{endError}</p>}
            </div>
          </div>
          <button type="button" onClick={handleEnd} disabled={ending}
            className="rounded-lg bg-amber-950 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-60">
            {ending ? 'Encerrando…' : 'Encerrar suporte'}
          </button>
        </div>
      </aside>
      <AdminDashboard salonSlug={session.salonSlug} support={{ context, ending, onEnd: handleEnd }} />
    </>
  )
}
