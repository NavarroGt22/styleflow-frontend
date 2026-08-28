import { API_BASE_URL } from '@/lib/config'

const API_PREFIX = API_BASE_URL ? `${API_BASE_URL}/api/v1` : ''

export function apiUrl(path: string): string {
  if (!API_PREFIX) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_PREFIX}${normalized}`
}

export function wsUrl(path: string): string {
  if (!API_BASE_URL) return path
  const wsBase = API_BASE_URL.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${wsBase}${normalized}`
}

export function isInternalApiUrl(url: string): boolean {
  return Boolean(API_PREFIX && (url.startsWith(API_PREFIX) || url.startsWith('/api/v1')))
}
