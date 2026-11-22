const COOKIE = 'platform_management'
const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }
function result(body: unknown, status = 200) { return Response.json(body, { status, headers: privateHeaders }) }
function fail(status: number, message: string) { return result({ error: message }, status) }
function configuration() {
  try {
    if (process.env.PLATFORM_MANAGEMENT_ENABLED !== 'true') return null
    const origin = new URL(process.env.PLATFORM_ADMIN_ORIGIN ?? ''), api = new URL(process.env.PLATFORM_API_BASE_URL ?? '')
    for (const url of [origin, api]) if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return null
    if (origin.pathname !== '/' || api.pathname.replace(/\/$/, '') !== '/api/v1') return null
    return { origin, api: `${api.origin}/api/v1` }
  } catch { return null }
}
async function readBody(request: Request | Response, maximum = 32 * 1024): Promise<string> {
  const reader = request.body?.getReader(); if (!reader) return ''
  const parts: Uint8Array[] = []; let size = 0
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > maximum) { await reader.cancel(); throw new Error('BODY_TOO_LARGE') }; parts.push(value) }
  return Buffer.concat(parts).toString('utf8')
}
function credential(request: Request) {
  const values = (request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${COOKIE}=`))
  if (values.length !== 1) return null
  const token = values[0].slice(COOKIE.length + 1)
  return /^pm1_[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}
function csrf(request: Request, config: NonNullable<ReturnType<typeof configuration>>) {
  return request.headers.get('host') === config.origin.host && request.headers.get('origin') === config.origin.origin && request.headers.get('x-platform-csrf') === '1' && /^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
}
async function upstream(request: Request, path: string, token: string | null, body?: string) {
  const config = configuration()!
  const headers: Record<string, string> = { accept: 'application/json', 'X-Custom-Host': config.origin.host }
  if (token) headers.authorization = `Bearer ${token}`
  if (body !== undefined) headers['content-type'] = 'application/json'
  const idempotency = request.headers.get('idempotency-key'); if (idempotency && idempotency.length <= 128) headers['idempotency-key'] = idempotency
  const response = await fetch(`${config.api}${path}`, { method: request.method, headers, ...(body !== undefined ? { body } : {}), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000) })
  const text = await readBody(response, 2 * 1024 * 1024)
  return { response, text }
}
export async function platformSession(request: Request): Promise<Response> {
  const config = configuration(); if (!config) return fail(503, 'A gestão integrada ainda não foi configurada.')
  if (request.headers.get('host') !== config.origin.host) return fail(403, 'Endereço administrativo inválido.')
  if (new URL(request.url).search) return fail(400, 'Não envie parâmetros nesta operação.')
  if (request.method !== 'GET' && !csrf(request, config)) return fail(403, 'Origem da solicitação recusada.')
  const token = credential(request)
  if (request.method !== 'POST' && !token) return fail(401, 'Entre no Master para continuar.')
  try {
    let body: string | undefined
    if (request.method === 'POST') {
      body = await readBody(request, 4096)
      try { const data = JSON.parse(body); if (typeof data.email !== 'string' || typeof data.password !== 'string' || Object.keys(data).some(key => !['email', 'password'].includes(key))) return fail(400, 'Confira e-mail e senha.') } catch { return fail(400, 'Envie um formulário válido.') }
    }
    const { response, text } = await upstream(request, '/platform-management/session', token, body)
    if (request.method === 'DELETE' && response.ok) {
      return new Response(null, { status: 204, headers: { ...privateHeaders, 'Set-Cookie': `${COOKIE}=; Path=/api/platform; HttpOnly; SameSite=Strict; Max-Age=0${config.origin.protocol === 'https:' ? '; Secure' : ''}` } })
    }
    let data: { credential?: unknown; expiresAt?: unknown; user?: { id?: unknown; name?: unknown; role?: unknown }; error?: unknown }
    try { data = JSON.parse(text) } catch { return fail(502, 'A API retornou uma resposta inválida.') }
    if (!response.ok) return fail(response.status, typeof data.error === 'string' ? data.error : 'Não foi possível autenticar.')
    if (typeof data.user?.id !== 'string' || typeof data.user?.name !== 'string' || data.user.role !== 'SUPER_ADMIN' || typeof data.expiresAt !== 'string' || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) return fail(502, 'A API retornou uma sessão inválida.')
    const answer = result({ user: { id: data.user.id, name: data.user.name, role: data.user.role }, expiresAt: data.expiresAt }, response.status)
    if (request.method === 'POST') {
      if (typeof data.credential !== 'string' || !/^pm1_[A-Za-z0-9_-]{43}$/.test(data.credential)) return fail(502, 'A API retornou uma sessão inválida.')
      answer.headers.set('Set-Cookie', `${COOKIE}=${data.credential}; Path=/api/platform; HttpOnly; SameSite=Strict; Expires=${new Date(data.expiresAt).toUTCString()}${config.origin.protocol === 'https:' ? '; Secure' : ''}`)
    }
    return answer
  } catch (error) { return fail(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 502, 'Não foi possível concluir a autenticação. Tente novamente.') }
}
export function allowedPlatformPath(parts: string[], method: string): boolean {
  if (parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return false
  const path = parts.join('/'), id = '[0-9a-fA-F-]{36}'
  if (parts[0] === 'management') {
    const resource = parts.slice(1).join('/')
    if (/^(leads|tasks|message-templates|expenses|expense-series)$/.test(resource)) return ['GET', 'POST'].includes(method)
    if (new RegExp(`^(leads|tasks|message-templates|expenses|expense-series)/${id}$`).test(resource)) return ['GET', 'PATCH', 'DELETE'].includes(method)
    if (new RegExp(`^leads/${id}/activities$`).test(resource)) return ['GET', 'POST'].includes(method)
    if (new RegExp(`^expense-series/${id}/occurrences$`).test(resource)) return method === 'POST'
    if (/^(finance\/overview|billing\/summary|exports\/(leads|expenses)|tenants)$/.test(resource)) return method === 'GET'
    if (resource === 'receipts') return ['GET', 'POST'].includes(method)
    if (resource === 'prospects/search') return method === 'POST'
    return false
  }
  if (path === 'dashboard') return method === 'GET'
  if (path === 'tenants/copy-sources' || path === 'tenants/access-directory') return method === 'GET'
  if (path === 'tenants') return method === 'POST'
  if (new RegExp(`^tenants/${id}$`).test(path)) return ['PATCH', 'DELETE'].includes(method)
  if (new RegExp(`^tenants/${id}/(restore|provision-dns|confirm-payment|support-sessions)$`).test(path)) return method === 'POST'
  if (new RegExp(`^tenants/${id}/payments$`).test(path)) return ['GET', 'POST'].includes(method)
  return false
}
export async function platformProxy(request: Request, parts: string[]): Promise<Response> {
  const config = configuration(); if (!config) return fail(503, 'A gestão integrada ainda não foi configurada.')
  if (request.headers.get('host') !== config.origin.host) return fail(403, 'Endereço administrativo inválido.')
  if (!allowedPlatformPath(parts, request.method)) return fail(403, 'Operação não permitida no Master.')
  if (!['GET', 'HEAD'].includes(request.method) && !csrf(request, config)) return fail(403, 'Origem da solicitação recusada.')
  const token = credential(request); if (!token) return fail(401, 'Entre no Master para continuar.')
  try {
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await readBody(request)
    const { response, text } = await upstream(request, `/admin/${parts.join('/')}${new URL(request.url).search}`, token, body)
    if (response.status === 204) return new Response(null, { status: 204, headers: privateHeaders })
    if (response.headers.get('content-type')?.includes('text/csv')) return new Response(text, { status: response.status, headers: { ...privateHeaders, 'content-type': 'text/csv; charset=utf-8', 'content-disposition': response.headers.get('content-disposition') ?? 'attachment; filename="export.csv"' } })
    let data; try { data = JSON.parse(text) } catch { return fail(502, 'A API retornou uma resposta inválida.') }
    if (response.ok && /^tenants\/[0-9a-fA-F-]{36}\/support-sessions$/.test(parts.join('/'))) data = { ...data, enterUrl: `${config.origin.origin}/api/support/enter` }
    return result(data, response.status)
  } catch (error) { return fail(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 502, 'Não foi possível conectar ao serviço. Tente novamente.') }
}
