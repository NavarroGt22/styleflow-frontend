import { getSessionUser } from '../auth'
import {
  asRecord, isSupportSessionId, readSupportContext, SUPPORT_CSRF_HEADER,
  SUPPORT_SESSION_HEADER, type SupportContext,
} from './contract'

let verifiedContext: SupportContext | null = null
const invalidationListeners = new Set<(message: string) => void>()

// The public id in this admin URL pins the tab to its original handoff, including after reload.
export function supportAdminMarker(): string | null {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/admin/')) return null
  const ids = new URLSearchParams(window.location.search).getAll('session')
  if (ids.length === 0) return null
  return ids.length === 1 && isSupportSessionId(ids[0]) ? ids[0] : ''
}

export function getSupportContext(): SupportContext | null {
  if (!verifiedContext || supportAdminMarker() !== verifiedContext.session.id ||
      Date.parse(verifiedContext.session.expiresAt) <= Date.now()) return null
  return verifiedContext
}

export function getAdminSessionUser() {
  return supportAdminMarker() === null ? getSessionUser() : getSupportContext()?.user ?? null
}

export function clearSupportContext(id?: string) {
  if (id === undefined || verifiedContext?.session.id === id) verifiedContext = null
}

export function subscribeToSupportInvalidation(listener: (message: string) => void): () => void {
  invalidationListeners.add(listener)
  return () => { invalidationListeners.delete(listener) }
}

async function readResponse(response: Response) {
  return asRecord(await response.json().catch(() => null))
}

export async function bootstrapSupport(id: string, signal?: AbortSignal): Promise<SupportContext> {
  if (!isSupportSessionId(id)) throw new Error('Abra uma sessão de suporte pela Gestão.')
  const response = await fetch(`/api/support/session?session=${encodeURIComponent(id)}`, {
    credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal,
  })
  const data = await readResponse(response)
  const context = readSupportContext(data)
  if (!response.ok || !context || context.session.id !== id) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Não foi possível validar a sessão de suporte.')
  }
  if (signal?.aborted) throw signal.reason
  verifiedContext = context
  return context
}

export function supportAdminPath(context: SupportContext): string {
  return `/admin/${encodeURIComponent(context.session.salonSlug)}?session=${encodeURIComponent(context.session.id)}`
}

export async function endSupport(id: string): Promise<void> {
  const response = await fetch('/api/support/end', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
    headers: { [SUPPORT_CSRF_HEADER]: '1', [SUPPORT_SESSION_HEADER]: id },
  })
  const data = await readResponse(response)
  if (!response.ok || data?.ended !== true) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Não foi possível encerrar o suporte. Tente novamente.')
  }
  clearSupportContext(id)
}

export async function supportFetch(path: string, options: RequestInit): Promise<Response> {
  const context = getSupportContext()
  if (!context) return Response.json({ error: 'A sessão de suporte não está ativa.' }, { status: 401 })

  // The caller supplies an API path, and this transport always builds a same-origin proxy URL.
  if (!/^\/[A-Za-z0-9_/-]+(?:\?[^#]*)?$/.test(path) || path.includes('//')) {
    return Response.json({ error: 'Esta operação não está disponível no modo de suporte.' }, { status: 403 })
  }
  const headers = new Headers(options.headers)
  headers.delete('Authorization')
  headers.set(SUPPORT_SESSION_HEADER, context.session.id)
  headers.set(SUPPORT_CSRF_HEADER, '1')
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`/api/support/proxy${path}`, {
    ...options, headers, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
  })
  if (response.status === 401 || response.status === 409) {
    const data = await readResponse(response.clone())
    if ((data?.code === 'SUPPORT_SESSION_INVALID' || data?.code === 'SUPPORT_SESSION_MISMATCH') &&
        getSupportContext()?.session.id === context.session.id) {
      clearSupportContext(context.session.id)
      const message = typeof data.error === 'string' ? data.error : 'A sessão de suporte foi encerrada.'
      invalidationListeners.forEach(listener => listener(message))
    }
  }
  return response
}
