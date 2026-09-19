import { PRODUCT_DOMAIN } from '@/lib/brand'
import { isLocalhostHost, isPlatformHost, platformBaseDomain } from '@/lib/client/domains'

/**
 * Domínio base para links de subdomínio.
 * Até comprar meucorteja.com, mantenha env apontando para Vercel / placeholder.
 * Default permanece placeholder legado para não gerar subdomínios inválidos.
 */
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'styleflow.com'

/** Domínio do produto. */
export { PRODUCT_DOMAIN }

function normalizeOrigin(value: string | undefined): string {
  if (!value?.trim()) return ''
  const trimmed = value.trim().replace(/\/$/, '')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

/**
 * Override explícito (opcional). Sem ele, os links da plataforma são derivados do
 * domínio do produto: app.meucorteja.com e admin.meucorteja.com.
 */
export const PLATFORM_URL = normalizeOrigin(process.env.NEXT_PUBLIC_PLATFORM_URL)
const PLATFORM_APP_URL = normalizeOrigin(process.env.NEXT_PUBLIC_PLATFORM_APP_URL)
const PLATFORM_ADMIN_URL = normalizeOrigin(process.env.NEXT_PUBLIC_PLATFORM_ADMIN_URL)

export const ADMIN_LOGIN_PATH = process.env.NEXT_PUBLIC_ADMIN_LOGIN_PATH ?? '/login'
export const SUPER_ADMIN_PATH = process.env.NEXT_PUBLIC_SUPER_ADMIN_PATH ?? '/platform/super'

/** Em dev/preview (localhost, *.vercel.app) os links ficam no mesmo host, por path. */
function devOrigin(): string | null {
  if (typeof window === 'undefined') return null
  const host = window.location.hostname
  if (isLocalhostHost(host) || host.endsWith('.vercel.app') || host.endsWith('.netlify.app')) {
    return window.location.origin
  }
  return null
}

/**
 * Origem canônica da plataforma para a área do cliente (`app.`) ou do painel (`admin.`).
 *
 * Nunca usa `window.location.origin` de um host white-label: aberto em
 * admin.lelecobarbes.com, o link "Cliente" de outra barbearia ia sair como
 * admin.lelecobarbes.com/app/outra — host do Leleco com slug de outro tenant.
 */
export function platformOrigin(kind: 'app' | 'admin'): string {
  if (kind === 'app' && PLATFORM_APP_URL) return PLATFORM_APP_URL
  if (kind === 'admin' && PLATFORM_ADMIN_URL) return PLATFORM_ADMIN_URL

  const dev = devOrigin()
  if (dev) return dev

  return `https://${kind}.${platformBaseDomain()}`
}

/** Compat: URL genérica da plataforma (override ou host atual se for plataforma). */
export function platformUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (PLATFORM_URL) return `${PLATFORM_URL}${normalized}`
  const kind = normalized.startsWith('/admin') || normalized.startsWith('/platform') ? 'admin' : 'app'
  return `${platformOrigin(kind)}${normalized}`
}

export function ownerAdminUrl(salonSlug: string): string {
  return `${platformOrigin('admin')}/admin/${salonSlug}`
}

export function clientPublicUrl(salonSlug: string): string {
  return `${platformOrigin('app')}/app/${salonSlug}`
}

/** Domínios fictícios / legados — não usar como white-label real. */
const PLACEHOLDER_DOMAIN_MARKERS = [
  'meusite.com',
  'seudominio.com',
  'styleflow.com',
  'styleflow.com.br',
]

function extractHostname(domain: string): string {
  return domain.replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
}

export function isRealCustomDomain(domain?: string | null): boolean {
  if (!domain?.trim()) return false
  const raw = domain.trim().toLowerCase()
  if (raw.startsWith('/')) return false

  const host = extractHostname(raw)
  if (!host || host.includes(' ')) return false
  if (host.endsWith('.vercel.app') || host.endsWith('.netlify.app')) return false
  if (host.includes('.vercel.app') || host.includes('.netlify.app')) return false

  // Hosts da plataforma (apex/www/app/admin do produto e de BASE_DOMAIN) não são white-label
  if (isPlatformHost(host)) return false
  // Subdomínio do produto (leleco.meucorteja.com) também não é domínio próprio do salão
  if (host === PRODUCT_DOMAIN || host.endsWith(`.${PRODUCT_DOMAIN}`)) return false

  return !PLACEHOLDER_DOMAIN_MARKERS.some((p) => host === p || host.endsWith(`.${p}`))
}

export function resolveClientLink(salonSlug: string, storedDomain?: string | null): string {
  if (isRealCustomDomain(storedDomain)) {
    // White-label ainda usa path /app/:slug (ex.: app.lelecobarbes.com/app/leleco/login)
    return `https://${extractHostname(storedDomain!)}/app/${salonSlug}/login`
  }
  return clientPublicUrl(salonSlug)
}

/** URL fixa para QR da fila (não muda ao abrir/fechar sessão do dia). */
export function resolveQueuePublicUrl(
  salonSlug: string,
  opts?: { clientDomain?: string | null; customDomain?: string | null }
): string {
  if (isRealCustomDomain(opts?.clientDomain)) {
    return `https://${extractHostname(opts!.clientDomain!)}/app/${salonSlug}/login`
  }
  if (isRealCustomDomain(opts?.customDomain)) {
    return `https://${extractHostname(opts!.customDomain!)}/app/${salonSlug}/login`
  }
  return clientPublicUrl(salonSlug)
}

/**
 * Painel do dono: white-label (admin.suabarbearia.com) quando existir; senão
 * admin.meucorteja.com/admin/:slug. Nunca o host de onde o Super Admin está aberto.
 */
export function resolveAdminLink(salonSlug: string, storedDomain?: string | null): string {
  if (isRealCustomDomain(storedDomain)) {
    const host = extractHostname(storedDomain!)
    return `https://${host}/admin/${salonSlug}`
  }
  return ownerAdminUrl(salonSlug)
}
