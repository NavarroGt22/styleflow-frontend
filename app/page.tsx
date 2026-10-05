import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { PRODUCT_NAME } from '@/lib/brand'
import { isClientAppCustomHost, isPlatformHost } from '@/lib/client/domains'

/**
 * Raiz do site.
 *
 * - admin.* → login
 * - app.<barbearia> → middleware reescreve para /app/:slug; aqui é fallback SSR
 * - app.meucorteja.com → atalho /slug → /app/slug (middleware); raiz mostra instrução curta
 */
async function resolveSalonSlugFromHost(host: string): Promise<string | null> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
  if (!apiBase) return null
  try {
    const res = await fetch(
      `${apiBase}/api/v1/tenants/resolve-host?host=${encodeURIComponent(host)}`,
      {
        headers: { Accept: 'application/json', 'X-Custom-Host': host },
        cache: 'no-store',
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { salonSlug?: string }
    return data.salonSlug || null
  } catch {
    return null
  }
}

export default async function HomePage() {
  const h = await headers()
  const host = (h.get('x-forwarded-host') || h.get('host') || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase()

  if (host.startsWith('admin.')) {
    redirect('/login')
  }

  // White-label: se o middleware falhou, tenta de novo no SSR e manda para a vitrine
  if (isClientAppCustomHost(host)) {
    const slug = await resolveSalonSlugFromHost(host)
    if (slug) {
      redirect(`/app/${slug}`)
    }
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0d0e] px-6 text-slate-100">
        <div className="w-full max-w-md text-center">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
            {PRODUCT_NAME}
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Abrindo a barbearia…</h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Não encontramos o salão deste domínio. Confira o DNS ou o link que a barbearia enviou.
          </p>
        </div>
      </main>
    )
  }

  // Plataforma: mensagem curta (cliente deve usar o domínio da barbearia ou /app/slug)
  const tip = isPlatformHost(host)
    ? 'Use o link da sua barbearia (app.suabarbearia.com) ou app.meucorteja.com/nome-da-barbearia.'
    : 'Use o link que a sua barbearia enviou.'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0d0e] px-6 text-slate-100">
      <div className="w-full max-w-md text-center">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">{PRODUCT_NAME}</p>
        <h1 className="font-serif text-3xl tracking-tight">Agenda online para barbearias</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">{tip}</p>
      </div>
    </main>
  )
}
