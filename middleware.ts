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

async function resolveSalonSlug(host: string, pathSlug?: string | null): Promise<string | null> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
  if (!apiBase) return pathSlug || null

  // Com slug na URL: só aceita se o salão pertencer ao tenant deste host (fail-closed na API).
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
        if (data?.salon?.slug) return data.salon.slug
      }
    } catch {
      /* tenta fallback sem slug */
    }
  }

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
      if (data?.salon?.slug) return data.salon.slug
    }
  } catch {
    /* fallback abaixo */
  }

  try {
    const tenantRes = await fetch(
      `${apiBase}/api/v1/tenants/by-subdomain/${encodeURIComponent(host)}`,
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    )
    if (tenantRes.ok) {
      const data = (await tenantRes.json()) as { slug?: string }
      if (data?.slug) return data.slug
    }
  } catch {
    /* ignore */
  }

  return null
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

    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
  }

  // admin.<barbearia> → painel (/admin/:slug), nunca /app e NUNCA /platform.
  // O Super Admin só existe no host da plataforma; aqui qualquer /platform vira login.
  if (isAdminCustomHost(host)) {
    if (pathname.startsWith('/login')) {
      return NextResponse.next()
    }

    if (pathname.startsWith('/platform')) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      return NextResponse.redirect(loginUrl)
    }

    const adminMatch = pathname.match(/^\/admin\/([^/]+)/)
    const pathSlug = adminMatch?.[1] ?? null
    // Valida slug da URL contra o host; se for de outro tenant, cai no salão deste domínio.
    const hostSalonSlug = await resolveSalonSlug(host, pathSlug)

    if (adminMatch) {
      if (!hostSalonSlug) {
        const loginUrl = req.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search = ''
        return NextResponse.redirect(loginUrl)
      }
      if (adminMatch[1] !== hostSalonSlug) {
        const adminUrl = req.nextUrl.clone()
        adminUrl.pathname = `/admin/${hostSalonSlug}`
        adminUrl.search = ''
        return NextResponse.redirect(adminUrl)
      }
      return NextResponse.next()
    }

    if (pathname.startsWith('/admin')) {
      const fallbackSlug = hostSalonSlug ?? (await resolveSalonSlug(host, null))
      if (!fallbackSlug) {
        const loginUrl = req.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search = ''
        return NextResponse.redirect(loginUrl)
      }
      const adminUrl = req.nextUrl.clone()
      adminUrl.pathname = `/admin/${fallbackSlug}`
      adminUrl.search = ''
      return NextResponse.redirect(adminUrl)
    }

    const appMatch = pathname.match(/^\/app\/([^/]+)/)
    const slug = await resolveSalonSlug(host, appMatch?.[1] ?? null)

    if (!slug) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.search = ''
      return NextResponse.redirect(loginUrl)
    }

    // / ou /app/... → /admin/:slug (AuthGuard manda para login se necessário)
    if (pathname === '/' || pathname.startsWith('/app')) {
      const adminUrl = req.nextUrl.clone()
      adminUrl.pathname = `/admin/${slug}`
      adminUrl.search = ''
      return NextResponse.redirect(adminUrl)
    }

    // Qualquer outra rota no host admin → painel do salão
    const adminUrl = req.nextUrl.clone()
    adminUrl.pathname = `/admin/${slug}`
    adminUrl.search = ''
    return NextResponse.redirect(adminUrl)
  }

  // app.* → vitrine do cliente
  if (isClientAppCustomHost(host) && pathname === '/') {
    const slug = await resolveSalonSlug(host)
    if (slug) {
      const appUrl = req.nextUrl.clone()
      appUrl.pathname = `/app/${slug}`
      return NextResponse.redirect(appUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
