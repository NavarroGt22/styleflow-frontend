function normalizeOrigin(value: string | undefined): string {
  if (!value?.trim()) return ''
  const trimmed = value.trim().replace(/\/$/, '')
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

export const API_BASE_URL = normalizeOrigin(process.env.NEXT_PUBLIC_API_URL)

export const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api/v1` : ''

export const USE_MOCK_ADMIN = process.env.NEXT_PUBLIC_USE_MOCK_ADMIN === 'true' || !API_BASE_URL

export function apiUrl(path: string): string {
  if (!API_PREFIX) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_PREFIX}${normalized}`
}
