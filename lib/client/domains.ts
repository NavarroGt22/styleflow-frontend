const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'localhost'

const EXTRA_PLATFORM_HOSTS = (process.env.NEXT_PUBLIC_PLATFORM_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)

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

  return host === base || host.endsWith(`.${base}`)
}

export function isCustomDomainHost(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): boolean {
  return !isPlatformHost(hostname)
}

export function extractTenantSubdomain(hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'): string | null {
  const host = hostname.toLowerCase()
  if (isLocalhostHost(host) || host === BASE_DOMAIN) return null
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null
  const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1))
  return subdomain || null
}
