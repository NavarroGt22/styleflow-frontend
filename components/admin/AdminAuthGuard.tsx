'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { getSessionUser, userCanAccessSalon, clearSession, isAdminSessionExpired } from '@/lib/auth'
import { PRODUCT_NAME } from '@/lib/brand'
import { isAdminCustomHost, isPlatformHost } from '@/lib/client/domains'
import { apiUrl } from '@/lib/config'
import AdminPageShell from './AdminPageShell'

type Props = {
  salonSlug: string
  children: ReactNode
}

type HostTenant = {
  id?: string
  slug?: string
}

async function fetchHostTenant(host: string): Promise<HostTenant | null> {
  // Query primeiro (API nova); path como plano B (API antiga aceita e resolve o host).
  const urls = [
    apiUrl(`/tenants/by-subdomain?host=${encodeURIComponent(host)}`),
    apiUrl(`/tenants/by-subdomain/${encodeURIComponent(host)}`),
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      return (await res.json()) as HostTenant
    } catch {
      /* tenta a próxima variante */
    }
  }
  return null
}

export default function AdminAuthGuard({ salonSlug, children }: Props) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [billingLocked, setBillingLocked] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function gate() {
      const user = getSessionUser()
      const next = encodeURIComponent(`/admin/${salonSlug}`)
      const host = window.location.hostname

      if (!user || isAdminSessionExpired()) {
        if (user) clearSession()
        router.replace(`/login?next=${next}&reason=session_expired`)
        return
      }

      // White-label: sessão de outra barbearia (ou Super Admin) não pode ficar neste host.
      if (isAdminCustomHost(host) && !isPlatformHost(host)) {
        if (user.role === 'SUPER_ADMIN') {
          clearSession()
          router.replace('/login?reason=wrong_host')
          return
        }

        const hostTenant = await fetchHostTenant(host)
        if (cancelled) return

        const sessionTenantSlug =
          typeof user.tenant?.slug === 'string' ? user.tenant.slug : null
        // Só com a API respondendo E os dois slugs presentes dá para AFIRMAR que a conta é deste host.
        const confirmedSameTenant = Boolean(
          hostTenant?.slug && sessionTenantSlug && sessionTenantSlug === hostTenant.slug,
        )

        if (hostTenant?.slug && sessionTenantSlug && sessionTenantSlug !== hostTenant.slug) {
          clearSession()
          router.replace('/login?reason=wrong_host')
          return
        }

        if (!userCanAccessSalon(user, salonSlug)) {
          // Redirecionar para o salão "da conta" só quando a conta é comprovadamente
          // deste tenant. Sem confirmação, nada de /admin/{slugDeOutro} neste host.
          const fallback = user.salons?.[0]?.slug ?? user.professionalProfile?.salon?.slug
          if (confirmedSameTenant && fallback && fallback !== salonSlug) {
            router.replace(`/admin/${fallback}`)
            return
          }
          clearSession()
          router.replace('/login?reason=wrong_host')
          return
        }

        setBillingLocked(
          (user.role === 'OWNER' || user.role === 'PROFESSIONAL') && Boolean(user.tenant?.adminLocked),
        )
        setReady(true)
        return
      }

      // Plataforma: dono só vê o próprio salão; se a URL for de outro, manda para o dele.
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
    }

    void gate()
    return () => {
      cancelled = true
    }
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
            O pagamento da plataforma está em atraso. Peça ao suporte {PRODUCT_NAME} para liberar o acesso no Super Admin.
          </p>
          <p className="text-sm text-slate-300">
            Contato:{' '}
            <a href="mailto:rafaelnavarro.ti@gmail.com" className="font-semibold text-indigo-300 underline">
              rafaelnavarro.ti@gmail.com
            </a>
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
