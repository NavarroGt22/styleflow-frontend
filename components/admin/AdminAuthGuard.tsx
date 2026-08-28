'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { getSessionUser, userCanAccessSalon, clearSession, isAdminSessionExpired } from '@/lib/auth'
import AdminPageShell from './AdminPageShell'

type Props = {
  salonSlug: string
  children: ReactNode
}

export default function AdminAuthGuard({ salonSlug, children }: Props) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [billingLocked, setBillingLocked] = useState(false)

  useEffect(() => {
    const user = getSessionUser()
    const next = encodeURIComponent(`/admin/${salonSlug}`)

    if (!user || isAdminSessionExpired()) {
      if (user) clearSession()
      router.replace(`/login?next=${next}&reason=session_expired`)
      return
    }

    if (!userCanAccessSalon(user, salonSlug)) {
      const fallback = user.salons?.[0]?.slug ?? user.professionalProfile?.salon?.slug
      if (fallback) {
        router.replace(`/admin/${fallback}`)
        return
      }
      router.replace('/login')
      return
    }

    const locked =
      (user.role === 'OWNER' || user.role === 'PROFESSIONAL') && Boolean(user.tenant?.adminLocked)
    setBillingLocked(locked)
    setReady(true)
  }, [router, salonSlug])

  useEffect(() => {
    if (!ready) return

    const interval = window.setInterval(() => {
      if (!isAdminSessionExpired()) return
      clearSession()
      const next = encodeURIComponent(`/admin/${salonSlug}`)
      router.replace(`/login?next=${next}&reason=session_expired`)
    }, 30_000)

    return () => window.clearInterval(interval)
  }, [ready, router, salonSlug])

  if (!ready) {
    return (
      <AdminPageShell>
        <div className="grid min-h-screen place-items-center text-slate-300">
          <p className="text-sm">Carregando painel...</p>
        </div>
      </AdminPageShell>
    )
  }

  if (billingLocked) {
    return (
      <AdminPageShell>
        <div className="flex min-h-screen items-center justify-center p-6 text-white">
          <div className="max-w-md space-y-4 rounded-2xl border border-rose-500/30 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-400">
            <Lock className="size-7" />
          </div>
          <h1 className="text-xl font-bold">Painel temporariamente bloqueado</h1>
          <p className="text-sm text-slate-400">
            O pagamento da plataforma está em atraso. Peça ao suporte StyleFlow para liberar o acesso no Super Admin.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-slate-900"
          >
            Voltar ao login
          </button>
        </div>
      </div>
      </AdminPageShell>
    )
  }

  return <>{children}</>
}
