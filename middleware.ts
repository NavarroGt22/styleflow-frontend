import { NextRequest, NextResponse } from 'next/server'

function requestHost(req: NextRequest): string {
  const raw =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    ''
  return raw.split(',')[0].trim().split(':')[0].toLowerCase()
}

/** Painel do dono: admin.suabarbearia.com */
export function isAdminCustomHost(host: string): boolean {
  return host.startsWith('admin.')
}

/** App do cliente: app.suabarbearia.com */
export function isClientAppCustomHost(host: string): boolean {
  return host.startsWith('app.')
}

function isPassthroughPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/screenshots') ||
    pathname.startsWith('/tenants') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

async function resolveSalonSlug(host: string, pathSlug?: string | null): Promise<string | null> {
  if (pathSlug) return pathSlug

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
  if (!apiBase) return null

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

  // admin.* → painel (/admin/:slug), nunca /app
  if (isAdminCustomHost(host)) {
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/platform')
    ) {
      return NextResponse.next()
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
