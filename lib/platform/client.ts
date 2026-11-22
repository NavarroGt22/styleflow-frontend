const pending = new Map<string, { key: string; until: number; request: Promise<Response> | null }>()
export async function platformFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!/^\/admin\//.test(path) || path.includes('..') || path.includes('\\')) throw new Error('Destino inválido.')
  const headers = new Headers(options.headers)
  headers.delete('authorization'); headers.set('content-type', 'application/json'); headers.set('x-platform-csrf', '1')
  const method = (options.method ?? 'GET').toUpperCase()
  let fingerprint: string | undefined, entry: { key: string; until: number; request: Promise<Response> | null } | undefined
  if (!['GET', 'HEAD'].includes(method) && !headers.has('idempotency-key')) {
    const encoded = new TextEncoder().encode(JSON.stringify([method, path, options.body ?? '']))
    fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoded))).map(value => value.toString(16).padStart(2, '0')).join('')
    for (const [id, value] of pending) if (value.until < Date.now()) pending.delete(id)
    entry = pending.get(fingerprint) ?? { key: crypto.randomUUID(), until: Date.now() + 10 * 60 * 1000, request: null }
    if (entry.request) return (await entry.request).clone()
    pending.set(fingerprint, entry); headers.set('idempotency-key', entry.key)
  }
  const task = fetch(`/api/platform${path}`, { ...options, headers, credentials: 'same-origin', cache: 'no-store' })
  if (entry) entry.request = task
  let response: Response
  try { response = await task; if (response.ok && fingerprint) pending.delete(fingerprint) }
  finally { if (entry) entry.request = null }
  if (response.status === 401 && typeof window !== 'undefined') window.location.assign('/login?next=/platform/super')
  return response.clone()
}
export async function endPlatformSession() {
  const response = await fetch('/api/platform/session', { method: 'DELETE', headers: { 'content-type': 'application/json', 'x-platform-csrf': '1' } })
  if (!response.ok) throw new Error('Não foi possível encerrar a sessão. Tente novamente.')
}

export async function enterPlatformSupport(entry: { code: string; sessionId: string; enterUrl: string }) {
  const destination = new URL(entry.enterUrl, window.location.origin)
  if (destination.origin !== window.location.origin || destination.pathname !== '/api/support/enter' || destination.search || destination.hash || !/^[0-9a-f-]{36}$/i.test(entry.sessionId)) throw new Error('Destino de suporte inválido.')
  // A navigation form under no-referrer sends Origin:null in Chromium.
  // Fetch preserves the strict same-origin check and accepts the HttpOnly cookie.
  const response = await fetch(destination, { method: 'POST', body: new URLSearchParams({ code: entry.code, sessionId: entry.sessionId }), credentials: 'same-origin', cache: 'no-store', redirect: 'follow' })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível iniciar o suporte. Solicite uma nova entrada.')
  }
  const target = new URL(response.url)
  if (target.origin !== window.location.origin || target.pathname !== '/support' || target.searchParams.get('session') !== entry.sessionId) throw new Error('A entrada de suporte retornou um destino inválido.')
  window.location.assign(`${target.pathname}${target.search}`)
}
