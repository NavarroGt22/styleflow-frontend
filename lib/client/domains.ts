import { PRODUCT_DOMAIN } from '@/lib/brand'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'localhost'

const EXTRA_PLATFORM_HOSTS = (process.env.NEXT_PUBLIC_PLATFORM_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)

const PLACEHOLDER_BASES = new Set(['localhost', 'styleflow.com', 'styleflow.com.br', 'meusite.com', 'seudominio.com'])

/** BASE_DOMAIN configurado e real (não placeholder de .env.example, não preview). */
function realBaseDomain(): string | null {
  const base = BASE_DOMAIN.toLowerCase().trim()
  if (!base || PLACEHOLDER_BASES.has(base)) return null
  if (base.endsWith('.vercel.app') || base.endsWith('.netlify.app')) return null
  return base
}

/**
 * Hosts da plataforma: apex, www, app e admin do produto (e de BASE_DOMAIN, se real).
 * Espelha `isDefaultHost` do backend. Subdomínio de tenant (leleco.meucorteja.com)
 * NÃO é plataforma — ali o tenant vem do host.
 */
const BUILTIN_PLATFORM_HOSTS = (() => {
  const hosts = new Set<string>(['styleflow.com', 'www.styleflow.com', 'styleflow.com.br', 'www.styleflow.com.br'])
  const bases = new Set<string>([PRODUCT_DOMAIN])
  const base = realBaseDomain()
  if (base) bases.add(base)
  for (const apex of bases) {
    hosts.add(apex)
    for (const label of ['www', 'app', 'admin', 'api']) hosts.add(`${label}.${apex}`)
  }
  return hosts
})()

export function isLocalhostHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase().split(':')[0]
  return host === 'localhost' || host === '127.0.0.1'
}

export function isPlatformHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase().split(':')[0]

  if (isLocalhostHost(host)) return true
  if (host.endsWith('.vercel.app') || host.endsWith('.netlify.app')) return true
  if (EXTRA_PLATFORM_HOSTS.includes(host)) return true
  if (BUILTIN_PLATFORM_HOSTS.has(host)) return true
  // Legado StyleFlow: todo *.styleflow.com é plataforma (path /app/:slug)
  if (host.endsWith('.styleflow.com') || host.endsWith('.styleflow.com.br')) return true

  return false
}

/** Domínio-base para montar links da plataforma (app.X / admin.X). */
export function platformBaseDomain(): string {
  return realBaseDomain() ?? PRODUCT_DOMAIN
}

export function isCustomDomainHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase().split(':')[0]
  // Tenant em subdomínio do produto (leleco.meucorteja.com) — não é domínio white-label externo
  if (host.endsWith(`.${PRODUCT_DOMAIN}`)) return false
  return !isPlatformHost(host)
}

/** Painel do dono em white-label: admin.suabarbearia.com (admin.meucorteja.com é plataforma). */
export function isAdminCustomHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase().split(':')[0]
  return host.startsWith('admin.') && !isPlatformHost(host)
}

/** App do cliente em white-label: app.suabarbearia.com (app.meucorteja.com é plataforma). */
export function isClientAppCustomHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase().split(':')[0]
  return host.startsWith('app.') && !isPlatformHost(host)
}

/** Painel da plataforma: admin.meucorteja.com (ou admin.BASE_DOMAIN). */
export function isPlatformAdminHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase().split(':')[0]
  return host.startsWith('admin.') && isPlatformHost(host)
}

export function extractTenantSubdomain(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): string | null {
  const host = hostname.toLowerCase().split(':')[0]
  if (isLocalhostHost(host) || host === BASE_DOMAIN) return null
  if (BUILTIN_PLATFORM_HOSTS.has(host)) return null

  if (host.endsWith(`.${PRODUCT_DOMAIN}`)) {
    const subdomain = host.slice(0, -(PRODUCT_DOMAIN.length + 1))
    if (!subdomain || ['www', 'app', 'admin', 'api'].includes(subdomain) || subdomain.includes('.')) return null
    return subdomain
  }

  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null
  const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1))
  return subdomain || null
}
