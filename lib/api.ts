import { apiUrl } from './config'
import { clearSession, getSessionToken } from './auth'

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getSessionToken()
  const headers = new Headers(options.headers ?? {})

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(path), { ...options, headers })

  if (response.status === 401 && typeof window !== 'undefined') {
    clearSession()
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
    window.location.href = `/login?next=${next}`
  }

  return response
}
