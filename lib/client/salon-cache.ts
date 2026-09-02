const CACHE_PREFIX = 'sf_public_salon_'
const CACHE_VERSION = 'v2'
const MAX_AGE_MS = 10 * 60 * 1000

type CachedSalon = {
  data: unknown
  ts: number
}

function cacheKey(salonSlug?: string) {
  return `${CACHE_PREFIX}${CACHE_VERSION}_${salonSlug || 'default'}`
}

export function getSalonCache(salonSlug?: string): unknown | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(cacheKey(salonSlug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedSalon
    if (Date.now() - parsed.ts > MAX_AGE_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

export function setSalonCache(salonSlug: string | undefined, data: unknown) {
  if (typeof window === 'undefined') return
  try {
    const payload: CachedSalon = { data, ts: Date.now() }
    sessionStorage.setItem(cacheKey(salonSlug), JSON.stringify(payload))
  } catch {
    /* ignore quota errors */
  }
}

export function readClientSession() {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem('client_user')
    const token = sessionStorage.getItem('client_token')
    if (!stored || !token) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}
