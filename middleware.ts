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

/** Cache curto host → slug (só sucessos). Falhas não são cacheadas. */
const slugCache = new Map<string, { slug: string; expires: number }>()
const SLUG_CACHE_TTL_MS = 5 * 60_000

function cachedSlug(host: string): string | undefined {
  const hit = slugCache.get(host)
  if (!hit) return undefined
  if (Date.now() > hit.expires) {
    slugCache.delete(host)
    return undefined
  }
  return hit.slug
}

function putSlugCache(host: string, slug: string) {
  slugCache.set(host, { slug, expires: Date.now() + SLUG_CACHE_TTL_MS })
}

/**
 * Resolve slug do salão pelo host.
 * Usa /tenants/resolve-host (JSON mínimo) — NÃO usa queue/public (logo base64 mata o Edge).
 */
async function resolveSalonSlug(host: string, pathSlug?: string | null): Promise<string | null> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
  if (!apiBase) return pathSlug || null

  const cached = cachedSlug(host)
  if (cached) {
    if (pathSlug && pathSlug !== cached) return cached
    return cached
  }

  try {
    const url = `${apiBase}/api/v1/tenants/resolve-host?host=${encodeURIComponent(host)}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Custom-Host': host,
      },
      cache: 'no-store',
    })
    if (res.ok) {
      const data = (await res.json()) as { salonSlug?: string }
      if (data?.salonSlug) {
        putSlugCache(host, data.salonSlug)
        return data.salonSlug
      }
    }
  } catch {
    /* edge offline / API lenta */
  }

  return pathSlug || null
}

function rewriteTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.rewrite(url)
}

function redirectTo(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone()
  url.pathname = pathname
  url.search = req.nextUrl.search
  return NextResponse.redirect(url)
}

const RESERVED_SHORT = new Set([
  'app',
  'admin',
  'login',
  'platform',
  'api',
  'offline',
  'icons',
  'favicon',
  'manifest',
  'sw',
  'tenants',
])

export async function middleware(req: NextRequest) {
  const host = requestHost(req)
  const { pathname } = req.nextUrl

  if (isPassthroughPath(pathname)) {
    return NextResponse.next()
  }

  // admin.meucorteja.com → painel da plataforma
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

  // admin.<barbearia> → painel
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

    if (pathname === '/' || pathname.startsWith('/app')) {
      return redirectTo(req, `/admin/${slug}`)
    }

    return redirectTo(req, `/admin/${slug}`)
  }

  // app.<barbearia> → abre a barbearia na hora (URL limpa)
  if (isClientAppCustomHost(host)) {
    const appMatch = pathname.match(/^\/app\/([^/]+)(\/.*)?$/)
    const pathSlug = appMatch?.[1] ?? null
    const rest = appMatch?.[2] || ''

    if (appMatch) {
      const slug = await resolveSalonSlug(host, pathSlug)
      if (slug && slug !== pathSlug) {
        return redirectTo(req, `/app/${slug}${rest}`)
      }
      return NextResponse.next()
    }

    if (pathname === '/login' || pathname.startsWith('/login/')) {
      const slug = await resolveSalonSlug(host, null)
      if (slug) return rewriteTo(req, `/app/${slug}/login`)
      return NextResponse.next()
    }

    // Raiz e qualquer path curto → vitrine do salão deste domínio
    const slug = await resolveSalonSlug(host, null)
    if (slug) {
      if (pathname === '/' || pathname === '') {
        return rewriteTo(req, `/app/${slug}`)
      }
      if (!pathname.startsWith('/app') && !pathname.startsWith('/admin')) {
        return rewriteTo(req, `/app/${slug}`)
      }
    }
    return NextResponse.next()
  }

  // app.meucorteja.com/meucorte → /app/meucorte (atalho curto na plataforma)
  if (host.startsWith('app.') && isPlatformHost(host)) {
    const short = pathname.match(/^\/([a-z0-9][a-z0-9-]{1,62})$/i)
    if (short && !RESERVED_SHORT.has(short[1].toLowerCase())) {
      return redirectTo(req, `/app/${short[1].toLowerCase()}`)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
