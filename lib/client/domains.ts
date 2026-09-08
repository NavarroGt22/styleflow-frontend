import { PRODUCT_DOMAIN } from '@/lib/brand'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'localhost'

const EXTRA_PLATFORM_HOSTS = (process.env.NEXT_PUBLIC_PLATFORM_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)

const BUILTIN_PLATFORM_APEX = new Set([
  'styleflow.com',
  'www.styleflow.com',
  'styleflow.com.br',
  'www.styleflow.com.br',
  PRODUCT_DOMAIN,
  `www.${PRODUCT_DOMAIN}`,
])

export function isLocalhostHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase()
  return host === 'localhost' || host === '127.0.0.1'
}

export function isPlatformHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase()
  const base = BASE_DOMAIN.toLowerCase()

  if (isLocalhostHost(host)) return true
  if (host.endsWith('.vercel.app') || host.endsWith('.netlify.app')) return true
  if (EXTRA_PLATFORM_HOSTS.includes(host)) return true
  if (BUILTIN_PLATFORM_APEX.has(host)) return true
  // Legado StyleFlow: todo *.styleflow.com é plataforma (path /app/:slug)
  if (host.endsWith('.styleflow.com') || host.endsWith('.styleflow.com.br')) return true

  return host === base || host.endsWith(`.${base}`)
}

export function isCustomDomainHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  const host = hostname.toLowerCase()
  // Tenant em subdomínio do produto (leleco.meucorteja.com) — não é domínio white-label externo
  if (host.endsWith(`.${PRODUCT_DOMAIN}`) && host !== `www.${PRODUCT_DOMAIN}`) return false
  return !isPlatformHost(hostname)
}

/** Painel do dono em white-label: admin.suabarbearia.com */
export function isAdminCustomHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  return hostname.toLowerCase().startsWith('admin.')
}

/** App do cliente em white-label: app.suabarbearia.com */
export function isClientAppCustomHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  return hostname.toLowerCase().startsWith('app.')
}

export function extractTenantSubdomain(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): string | null {
  const host = hostname.toLowerCase()
  if (isLocalhostHost(host) || host === BASE_DOMAIN) return null
  if (BUILTIN_PLATFORM_APEX.has(host)) return null

  if (host.endsWith(`.${PRODUCT_DOMAIN}`)) {
    const subdomain = host.slice(0, -(PRODUCT_DOMAIN.length + 1))
    if (!subdomain || subdomain === 'www' || subdomain.includes('.')) return null
    return subdomain
  }

  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null
  const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1))
  return subdomain || null
}
