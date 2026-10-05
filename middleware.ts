import { NextRequest, NextResponse } from 'next/server'
import { isPlatformHost, platformBaseDomain } from '@/lib/client/domains'

function requestHost(req: NextRequest): string {
  const raw =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    ''
  return raw.split(',')[0].trim().split(':')[0].toLowerCase()
}

/** Painel do dono em white-label: admin.suabarbearia.com (admin.meucorteja.com NÃO entra aqui). */
export function isAdminCustomHost(host: string): boolean {
  return host.startsWith('admin.') && !isPlatformHost(host)
}

/** App do cliente em white-label: app.suabarbearia.com (app.meucorteja.com NÃO entra aqui). */
export function isClientAppCustomHost(host: string): boolean {
  return host.startsWith('app.') && !isPlatformHost(host)
}

/** Painel da plataforma: admin.meucorteja.com — único host onde /platform (Super Admin) existe. */
export function isPlatformAdminHost(host: string): boolean {
  return host.startsWith('admin.') && isPlatformHost(host)
}

function isPassthroughPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/screenshots') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/swe-worker') ||
    pathname.startsWith('/fallback') ||
    pathname.endsWith('/manifest.webmanifest') ||
    pathname.startsWith('/offline') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

/** Cache curto host → slug (edge/runtime). Evita bater na API a cada request. */
const slugCache = new Map<string, { slug: string | null; expires: number }>()
const SLUG_CACHE_TTL_MS = 60_000

function cachedSlug(host: string): string | null | undefined {
  const hit = slugCache.get(host)
  if (!hit) return undefined
  if (Date.now() > hit.expires) {
    slugCache.delete(host)
    return undefined
  }
  return hit.slug
}

function putSlugCache(host: string, slug: string | null) {
  slugCache.set(host, { slug, expires: Date.now() + SLUG_CACHE_TTL_MS })
}

async function resolveSalonSlug(host: string, pathSlug?: string | null): Promise<string | null> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
  if (!apiBase) return pathSlug || null

  async function firstSalonOfHost(): Promise<string | null> {
    const cached = cachedSlug(host)
    if (cached !== undefined) return cached

    try {
      const queueRes = await fetch(`${apiBase}/api/v1/queue/public`, {
        headers: {
          Accept: 'application/json',
          'X-Custom-Host': host,
        },
        cache: 'no-store',
      })
      if (queueRes.ok) {
        const data = (await queueRes.json()) as { salon?: { slug?: string } }
        const slug = data?.salon?.slug || null
        putSlugCache(host, slug)
        return slug
      }
    } catch {
      /* ignore */
    }
    putSlugCache(host, null)
    return null
  }

  // Com slug na URL: só aceita se o salão pertencer ao tenant deste host.
  if (pathSlug) {
    try {
      const res = await fetch(`${apiBase}/api/v1/queue/public/${encodeURIComponent(pathSlug)}`, {
        headers: {
          Accept: 'application/json',
          'X-Custom-Host': host,
        },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = (await res.json()) as { salon?: { slug?: string } }
        if (data?.salon?.slug) {
          putSlugCache(host, data.salon.slug)
          return data.salon.slug
        }
      }
      // Slug de outro tenant / inexistente neste host → salão correto do domínio (se a API responder).
      if (res.status === 404 || res.status === 403 || res.status === 400) {
        return (await firstSalonOfHost()) ?? pathSlug
      }
    } catch {
      // API indisponível no edge → deixa passar o slug; AuthGuard decide.
      return pathSlug
    }
  }

  return firstSalonOfHost()
}

/** Rewrite interno (URL do browser fica limpa: app.barbearia.com/). */
function rewriteTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.rewrite(url)
}

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  return NextResponse.redirect(url)
}

export async function middleware(req: NextRequest) {
  const host = requestHost(req)
  const { pathname } = req.nextUrl

  if (isPassthroughPath(pathname)) {
    return NextResponse.next()
  }

  // admin.meucorteja.com → painel da plataforma: /admin/:slug, /login e /platform (Super Admin).
  // /app/... aqui vai para o host do cliente (app.meucorteja.com), nunca renderiza vitrine.
  if (isPlatformAdminHost(host)) {
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/platform')
    ) {
      return NextResponse.next()
    }

    if (pathname.startsWith('/app')) {
      const appUrl = new URL(req.nextUrl)
      appUrl.protocol = 'https:'
      appUrl.host = `app.${platformBaseDomain()}`
      appUrl.port = ''
      return NextResponse.redirect(appUrl)
    }

    return redirectTo(req, '/login')
  }

  // admin.<barbearia> → painel (/admin/:slug), nunca /app e NUNCA /platform.
  if (isAdminCustomHost(host)) {
    if (pathname.startsWith('/login')) {
      return NextResponse.next()
    }

    if (pathname.startsWith('/platform')) {
      return redirectTo(req, '/login')
    }

    const adminMatch = pathname.match(/^\/admin\/([^/]+)/)
    const pathSlug = adminMatch?.[1] ?? null
    const hostSalonSlug = await resolveSalonSlug(host, pathSlug)

    if (adminMatch) {
      if (hostSalonSlug && hostSalonSlug !== adminMatch[1]) {
        return redirectTo(req, `/admin/${hostSalonSlug}`)
      }
      return NextResponse.next()
    }

    if (pathname.startsWith('/admin')) {
      const fallbackSlug = await resolveSalonSlug(host, null)
      if (!fallbackSlug) return redirectTo(req, '/login')
      return redirectTo(req, `/admin/${fallbackSlug}`)
    }

    const appMatch = pathname.match(/^\/app\/([^/]+)/)
    const slug = await resolveSalonSlug(host, appMatch?.[1] ?? null)

    if (!slug) return redirectTo(req, '/login')

    // / ou /app/... → /admin/:slug
    if (pathname === '/' || pathname.startsWith('/app')) {
      return redirectTo(req, `/admin/${slug}`)
    }

    return redirectTo(req, `/admin/${slug}`)
  }

  // app.<barbearia> → abre a vitrine daquela barbearia na hora (sem path longo).
  // Browser fica em app.nomedabarbearia.com/ ; rewrite interno para /app/:slug.
  if (isClientAppCustomHost(host)) {
    const appMatch = pathname.match(/^\/app\/([^/]+)(\/.*)?$/)
    const pathSlug = appMatch?.[1] ?? null
    const rest = appMatch?.[2] || ''

    // Já está em /app/:slug — só corrige slug errado; senão deixa passar (rápido).
    if (appMatch) {
      const cached = cachedSlug(host)
      if (cached && cached !== pathSlug) {
        return redirectTo(req, `/app/${cached}${rest}`)
      }
      if (cached === pathSlug || cached === null) {
        return NextResponse.next()
      }
      // Cache miss: resolve e corrige se preciso
      const slug = await resolveSalonSlug(host, pathSlug)
      if (slug && slug !== pathSlug) {
        return redirectTo(req, `/app/${slug}${rest}`)
      }
      return NextResponse.next()
    }

    // /login → /app/:slug/login (rewrite: URL pode continuar /login se preferir — usamos rewrite)
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      const slug = await resolveSalonSlug(host, null)
      if (slug) return rewriteTo(req, `/app/${slug}/login`)
      return NextResponse.next()
    }

    // / → rewrite para /app/:slug (URL do cliente continua app.barbearia.com/)
    if (pathname === '/' || pathname === '') {
      const slug = await resolveSalonSlug(host, null)
      if (slug) return rewriteTo(req, `/app/${slug}`)
      return NextResponse.next()
    }

    // Outras rotas curtas (ex.: /agenda) → manda para a vitrine do salão deste domínio
    if (!pathname.startsWith('/app') && !pathname.startsWith('/admin')) {
      const slug = await resolveSalonSlug(host, null)
      if (slug) return rewriteTo(req, `/app/${slug}`)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
