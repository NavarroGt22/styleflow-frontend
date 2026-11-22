import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import {
  asRecord, isSupportExpiry, isSupportId, isSupportSessionId, readSupportContext,
  SUPPORT_CSRF_HEADER, SUPPORT_SESSION_HEADER,
} from './contract'
import { configuredSupportUrl } from './origin'
import { supportApiPath, supportMutationAllowed } from './proxy-policy'

const COOKIE_PREFIX = 'support_session_'
const COOKIE_PATH = '/api/support'
const MAX_BODY_BYTES = 10 * 1024 * 1024
const MAX_ENTRY_BYTES = 2048
const MAX_COOKIE_VALUE_LENGTH = 3800
const UPSTREAM_TIMEOUT_MS = 10_000
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

type SupportConfig = {
  apiBase: string
  adminOrigin: URL
  gestaoOrigin: string
  cookieKey: Buffer
}

type SupportCredential = {
  id: string
  salonId: string
  accessToken: string
  expiresAt: string
}

export function readSupportConfig(env: NodeJS.ProcessEnv = process.env): SupportConfig | null {
  const api = configuredSupportUrl(env.SUPPORT_API_BASE_URL)
  const adminOrigin = configuredSupportUrl(env.SUPPORT_ADMIN_ORIGIN)
  const gestaoOrigin = configuredSupportUrl(env.SUPPORT_ALLOWED_GESTAO_ORIGIN)
  const secret = env.SUPPORT_SESSION_SECRET
  if (!api || !/^\/api\/v1\/?$/.test(api.pathname) ||
      adminOrigin?.pathname !== '/' || gestaoOrigin?.pathname !== '/' ||
      !secret || Buffer.byteLength(secret.trim(), 'utf8') < 32) return null

  return {
    apiBase: `${api.origin}/api/v1`,
    adminOrigin,
    gestaoOrigin: gestaoOrigin.origin,
    cookieKey: createHash('sha256').update(secret).digest(),
  }
}

function cookieScope(config: SupportConfig): Buffer {
  return Buffer.from(`${COOKIE_PREFIX}:${config.adminOrigin.origin}:${config.apiBase}:v1`)
}

export function sealSupportCookie(credential: SupportCredential, config: SupportConfig): string {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', config.cookieKey, nonce)
  cipher.setAAD(cookieScope(config))
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credential)), cipher.final()])
  return `v1.${nonce.toString('base64url')}.${encrypted.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`
}

function isAccessToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 2300 && /^[A-Za-z0-9._~-]+$/.test(value)
}

export function unsealSupportCookie(value: string, config: SupportConfig): SupportCredential | null {
  if (value.length > MAX_COOKIE_VALUE_LENGTH) return null
  const parts = value.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1' || !parts.slice(1).every(part => /^[A-Za-z0-9_-]+$/.test(part))) {
    return null
  }
  const [nonce, encrypted, tag] = parts.slice(1).map(part => Buffer.from(part, 'base64url'))
  if (nonce.length !== 12 || tag.length !== 16) return null

  try {
    const decipher = createDecipheriv('aes-256-gcm', config.cookieKey, nonce)
    decipher.setAAD(cookieScope(config))
    decipher.setAuthTag(tag)
    const data = asRecord(JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')))
    if (!data) return null
    const { id, salonId, accessToken, expiresAt } = data
    if (!isSupportSessionId(id) || !isSupportId(salonId) || !isAccessToken(accessToken) || !isSupportExpiry(expiresAt)) return null
    return { id, salonId, accessToken, expiresAt }
  } catch {
    return null
  }
}

function sessionCookies(request: Request): Map<string, string | null> {
  const cookies = new Map<string, string | null>()
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const cookie = part.trim()
    const separator = cookie.indexOf('=')
    if (!cookie.startsWith(COOKIE_PREFIX) || separator < 0) continue
    const id = cookie.slice(COOKIE_PREFIX.length, separator)
    if (isSupportSessionId(id)) cookies.set(id, cookies.has(id) ? null : cookie.slice(separator + 1))
  }
  return cookies
}

function cookieHeader(config: SupportConfig, id: string, value: string, expiresAt?: string): string {
  const maxAge = expiresAt ? Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)) : 0
  const secure = config.adminOrigin.protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE_PREFIX}${id}=${value}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`
}

function jsonError(status: number, error: string, code?: string): Response {
  return Response.json({ error, code }, { status, headers: NO_STORE_HEADERS })
}

function unavailable(): Response {
  return jsonError(503, 'O acesso de suporte está indisponível.')
}

function upstreamFailure(): Response {
  return jsonError(502, 'O serviço de suporte está indisponível. Tente novamente.')
}

function invalidSession(): Response {
  return jsonError(401, 'A sessão de suporte expirou ou foi encerrada.', 'SUPPORT_SESSION_INVALID')
}

function blockedOperation(): Response {
  return jsonError(403, 'Esta operação não está disponível no modo de suporte.')
}

function verifyRequest(request: Request, config: SupportConfig, origin: string, mutation: boolean, csrf = false): boolean {
  // Next may normalize request.url to the loopback address of the application server.
  if (request.headers.get('host') !== config.adminOrigin.host) return false
  const actualOrigin = request.headers.get('origin')
  if ((mutation || actualOrigin !== null) && actualOrigin !== origin) return false
  return !csrf || request.headers.get(SUPPORT_CSRF_HEADER) === '1'
}

function expectedCredential(request: Request, config: SupportConfig, expected: unknown): SupportCredential | Response {
  if (!isSupportSessionId(expected)) return jsonError(400, 'Sessão de suporte não identificada.')
  const cookies = sessionCookies(request)
  const value = cookies.get(expected)
  if (value === undefined && cookies.size > 0) {
    return jsonError(409, 'Esta aba pertence a outra sessão de suporte.', 'SUPPORT_SESSION_MISMATCH')
  }
  const credential = value && unsealSupportCookie(value, config)
  if (!credential) return invalidSession()
  if (credential.id !== expected) {
    return jsonError(409, 'Esta aba pertence a outra sessão de suporte.', 'SUPPORT_SESSION_MISMATCH')
  }
  return credential
}

async function boundedBody(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | Response | undefined> {
  if (!request.body) return undefined
  const length = request.headers.get('content-length')
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    return jsonError(413, 'O tamanho da solicitação excede o limite do suporte.')
  }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {})
        return jsonError(413, 'O tamanho da solicitação excede o limite do suporte.')
      }
      chunks.push(value)
    }
  } catch {
    return jsonError(400, 'Não foi possível ler a solicitação.')
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

async function upstreamRequest(
  config: SupportConfig,
  path: string,
  method: string,
  options: { token?: string; contentType?: string; body?: BodyInit } = {},
): Promise<Response | null> {
  const headers = new Headers({ Accept: 'application/json' })
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (options.contentType) headers.set('Content-Type', options.contentType)
  try {
    const response = await fetch(`${config.apiBase}${path}`, {
      method, headers, body: options.body, redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    return response.status >= 300 && response.status < 400 ? null : response
  } catch {
    return null
  }
}

async function revoke(config: SupportConfig, credential: SupportCredential): Promise<boolean> {
  const upstream = await upstreamRequest(config, '/support-sessions/end', 'POST', { token: credential.accessToken })
  const result = await upstream?.json().catch(() => null)
  return (upstream?.ok === true && result?.ended === true) ||
    (upstream?.status === 401 && result?.code === 'SUPPORT_SESSION_INVALID')
}

export async function supportEnter(request: Request): Promise<Response> {
  const config = readSupportConfig()
  if (!config) return unavailable()
  if (!verifyRequest(request, config, config.gestaoOrigin, true)) return blockedOperation()
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded') {
    return jsonError(415, 'Formato de entrada de suporte inválido.')
  }
  const body = await boundedBody(request, MAX_ENTRY_BYTES)
  if (body instanceof Response) return body
  const form = new URLSearchParams(new TextDecoder().decode(body))
  const codes = form.getAll('code')
  const ids = form.getAll('sessionId')
  const [code] = codes
  if (codes.length !== 1 || !/^[A-Za-z0-9_-]{32,256}$/.test(code) ||
      ids.length > 1 || (ids.length === 1 && !isSupportSessionId(ids[0]))) {
    return jsonError(400, 'Código de entrada inválido.')
  }

  const upstream = await upstreamRequest(config, '/support-sessions/exchange', 'POST', {
    contentType: 'application/json', body: JSON.stringify({ code }),
  })
  if (!upstream || upstream.status >= 500) return upstreamFailure()
  if (!upstream.ok) return jsonError(upstream.status, 'O acesso de suporte não está mais disponível. Solicite uma nova entrada na Gestão.')
  const data = asRecord(await upstream.json().catch(() => null))
  const context = readSupportContext(data)
  if (!context || !isAccessToken(data?.accessToken)) return upstreamFailure()

  const { id, salonId, expiresAt } = context.session
  const credential = { id, salonId, expiresAt, accessToken: data.accessToken }
  if (ids.length === 1 && ids[0] !== id) {
    await revoke(config, credential)
    return jsonError(409, 'O código pertence a outra sessão de suporte.')
  }

  const encrypted = sealSupportCookie(credential, config)
  if (encrypted.length > MAX_COOKIE_VALUE_LENGTH) {
    await revoke(config, credential)
    return upstreamFailure()
  }
  const redirect = new URL('/support', config.adminOrigin)
  redirect.searchParams.set('session', id)
  const headers = new Headers({ ...NO_STORE_HEADERS, Location: redirect.href })
  headers.append('Set-Cookie', cookieHeader(config, id, encrypted, expiresAt))
  for (const [previousId, value] of sessionCookies(request)) {
    if (previousId === id) continue
    const previous = value && unsealSupportCookie(value, config)
    if (previous && previous.id === previousId && !await revoke(config, previous)) {
      await revoke(config, credential)
      return jsonError(502, 'Não foi possível encerrar a sessão de suporte anterior. Solicite uma nova entrada na Gestão.')
    }
    headers.append('Set-Cookie', cookieHeader(config, previousId, ''))
  }
  return new Response(null, { status: 303, headers })
}

export async function supportSession(request: Request): Promise<Response> {
  const config = readSupportConfig()
  if (!config) return unavailable()
  if (!verifyRequest(request, config, config.adminOrigin.origin, false)) return blockedOperation()
  const ids = new URL(request.url).searchParams.getAll('session')
  const credential = expectedCredential(request, config, ids.length === 1 ? ids[0] : null)
  if (credential instanceof Response) return credential

  const upstream = await upstreamRequest(config, '/support-sessions/session', 'GET', { token: credential.accessToken })
  if (!upstream || upstream.status >= 500) return upstreamFailure()
  if (upstream.status === 401) return invalidSession()
  if (!upstream.ok) return jsonError(upstream.status, 'Não foi possível validar a sessão de suporte.')
  const context = readSupportContext(await upstream.json().catch(() => null))
  if (!context || context.session.id !== credential.id || context.session.salonId !== credential.salonId ||
      context.session.expiresAt !== credential.expiresAt) return upstreamFailure()
  return Response.json(context, { headers: NO_STORE_HEADERS })
}

export async function supportEnd(request: Request): Promise<Response> {
  const config = readSupportConfig()
  if (!config) return unavailable()
  if (!verifyRequest(request, config, config.adminOrigin.origin, true, true)) return blockedOperation()
  const credential = expectedCredential(request, config, request.headers.get(SUPPORT_SESSION_HEADER))
  if (credential instanceof Response) return credential
  if (!await revoke(config, credential)) return jsonError(502, 'Não foi possível encerrar o suporte. Tente novamente.')
  return Response.json({ ended: true }, { headers: {
    ...NO_STORE_HEADERS, 'Set-Cookie': cookieHeader(config, credential.id, ''),
  } })
}

export async function supportProxy(request: Request, segments: string[]): Promise<Response> {
  const config = readSupportConfig()
  if (!config) return unavailable()
  const mutation = request.method !== 'GET'
  if (!verifyRequest(request, config, config.adminOrigin.origin, mutation, mutation)) return blockedOperation()
  const credential = expectedCredential(request, config, request.headers.get(SUPPORT_SESSION_HEADER))
  if (credential instanceof Response) return credential
  const path = supportApiPath(request.method, segments, new URL(request.url).searchParams, credential.salonId)
  if (!path) return blockedOperation()

  const expectsBody = mutation && request.method !== 'DELETE'
  const contentType = request.headers.get('content-type') ?? undefined
  if ((expectsBody && !contentType?.match(/^application\/json(?:\s*;|$)/i)) || (!expectsBody && request.body)) {
    return jsonError(415, 'Formato da solicitação não permitido no suporte.')
  }
  const body = await boundedBody(request, MAX_BODY_BYTES)
  if (body instanceof Response) return body
  if (expectsBody) {
    let payload: unknown
    try {
      payload = JSON.parse(new TextDecoder().decode(body))
    } catch {
      return jsonError(400, 'Conteúdo JSON inválido.')
    }
    if (!supportMutationAllowed(request.method, segments, payload, credential.salonId)) return blockedOperation()
  }
  const upstream = await upstreamRequest(config, path, request.method, {
    token: credential.accessToken, contentType: expectsBody ? 'application/json' : undefined, body,
  })
  if (!upstream || upstream.status >= 500) return upstreamFailure()
  if (upstream.status === 401) return invalidSession()
  if (upstream.status === 204) return new Response(null, { status: 204, headers: NO_STORE_HEADERS })
  if (!upstream.headers.get('content-type')?.match(/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i)) {
    return upstreamFailure()
  }
  try {
    const payload = await upstream.text()
    if (payload.includes(credential.accessToken)) return upstreamFailure()
    return new Response(payload, { status: upstream.status, headers: { ...NO_STORE_HEADERS, 'Content-Type': 'application/json' } })
  } catch {
    return upstreamFailure()
  }
}
