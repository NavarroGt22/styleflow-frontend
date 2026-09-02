export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'styleflow.com'

function normalizeOrigin(value: string | undefined): string {
  if (!value?.trim()) {
    if (typeof window !== 'undefined') return window.location.origin
    return ''
  }
  const trimmed = value.trim().replace(/\/$/, '')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

export const PLATFORM_URL = normalizeOrigin(process.env.NEXT_PUBLIC_PLATFORM_URL)

export const ADMIN_LOGIN_PATH = process.env.NEXT_PUBLIC_ADMIN_LOGIN_PATH ?? '/login'
export const SUPER_ADMIN_PATH = process.env.NEXT_PUBLIC_SUPER_ADMIN_PATH ?? '/platform/super'

export function platformUrl(path: string): string {
  const base = PLATFORM_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base.replace(/\/$/, '')}${normalized}`
}

export function ownerAdminUrl(salonSlug: string): string {
  return platformUrl(`/admin/${salonSlug}`)
}

export function clientPublicUrl(salonSlug: string): string {
  return platformUrl(`/app/${salonSlug}`)
}

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
  if (raw.startsWith('/') || raw.startsWith('http')) return false
  if (raw.includes('/')) return false

  const host = extractHostname(raw)
  if (!host || host.includes(' ')) return false
  if (host.endsWith('.vercel.app') || host.endsWith('.netlify.app')) return false
  if (host.includes('.vercel.app') || host.includes('.netlify.app')) return false

  const platformHost = PLATFORM_URL ? extractHostname(PLATFORM_URL) : ''
  if (platformHost && (host === platformHost || host.endsWith(`.${platformHost}`))) return false

  return !PLACEHOLDER_DOMAIN_MARKERS.some((p) => host === p || host.endsWith(`.${p}`))
}

export function resolveClientLink(salonSlug: string, storedDomain?: string | null): string {
  if (isRealCustomDomain(storedDomain)) {
    return `https://${extractHostname(storedDomain!)}`
  }
  return clientPublicUrl(salonSlug)
}

export function resolveAdminLink(salonSlug: string, storedDomain?: string | null): string {
  if (isRealCustomDomain(storedDomain)) {
    const host = extractHostname(storedDomain!)
    return `https://${host}${ADMIN_LOGIN_PATH}`
  }
  return ownerAdminUrl(salonSlug)
}
