import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, test } from 'node:test'

const project = new URL('../', import.meta.url)
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith(project.href) && /^\.\.?\/.+[^./]+$/.test(specifier)) {
      const url = new URL(specifier, context.parentURL)
      if (!/\.[a-z]+$/i.test(url.pathname)) return next(`${url.href}.ts`, context)
    }
    return next(specifier, context)
  },
})

const {
  readSupportConfig, sealSupportCookie, unsealSupportCookie,
  supportEnter, supportSession, supportProxy, supportEnd,
} = await import('../lib/support/server.ts')
const { bootstrapSupport, clearSupportContext } = await import('../lib/support/client.ts')
const { matchesSupportPageOrigin } = await import('../lib/support/origin.ts')
const { supportApiPath, supportMutationAllowed } = await import('../lib/support/proxy-policy.ts')

test('full owner support allows financial, customers, subscriptions and stock in the selected salon', () => {
  const salon = '47070000-abcd-4000-8000-000000000002'
  for (const path of [
    ['financials', 'salon', salon, 'summary'], ['customers', 'salon', salon],
    ['subscriptions', 'salon', salon, 'manage'], ['products', 'salon', salon],
    ['client-groups', 'salon', salon], ['coupons', 'salon', salon],
  ]) assert.equal(supportApiPath('GET', path, new URLSearchParams(), salon), `/${path.join('/')}`)
  assert.equal(supportApiPath('GET', ['financials', 'salon', 'another-salon'], new URLSearchParams(), salon), null)
  assert.equal(supportApiPath('GET', ['admin', 'dashboard'], new URLSearchParams(), salon), null)
  assert.equal(supportApiPath('GET', ['financials', 'salon', salon], new URLSearchParams('from=2026-11-01&to=2026-11-30'), salon), `/financials/salon/${salon}?from=2026-11-01&to=2026-11-30`)
  assert.equal(supportMutationAllowed('POST', ['subscriptions', 'salon', salon, 'plans'], { name: 'Mensal', price: 100, items: [] }, salon), true)
  assert.equal(supportMutationAllowed('PUT', ['professionals', 'profile-id'], { name: 'Nome', phone: '11999999999', password: 'test-only-password' }, salon), true)
})
const { authFetch } = await import('../lib/api.ts')

const platform = 'https://admin.example.test'
const gestao = 'https://gestao.example.test'
const api = 'https://api.example.test/api/v1'
const env = {
  SUPPORT_ADMIN_ORIGIN: platform,
  SUPPORT_ALLOWED_GESTAO_ORIGIN: gestao,
  SUPPORT_API_BASE_URL: api,
  SUPPORT_SESSION_SECRET: 'synthetic-local-secret-for-only-this-test',
}
const id = '47070000-abcd-4000-8000-000000000001'
const olderId = '47070000-abcd-4000-8000-000000000002'
const code = 'synthetic-entry-code-1234567891234567'
const supportToken = 'synthetic.support.credential'
const session = {
  id, tenantId: 'tenant-123', tenantName: 'Barbearia Teste', salonId: 'salon-123',
  salonSlug: 'barbearia-teste', actorName: 'Operador', expiresAt: new Date(Date.now() + 840_000).toISOString(),
}
const user = {
  id: 'user-111', role: 'OWNER', name: 'Dono',
  tenant: { id: session.tenantId, slug: 'barbearia', inventoryEnabled: true },
  salons: [{ id: session.salonId, name: session.tenantName, slug: session.salonSlug }],
}
const envelope = { session, user }
const credentials = { id, accessToken: supportToken, salonId: session.salonId, expiresAt: session.expiresAt }

let savedEnv
beforeEach(() => {
  savedEnv = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  Object.assign(process.env, env)
})
afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  clearSupportContext()
})

function request(path, init = {}) {
  return new Request(`http://127.0.0.1:3000/api/support/${path}`, {
    ...init,
    headers: { Host: new URL(platform).host, ...init.headers },
  })
}

function cookie(value = credentials) {
  return `support_session_${value.id}=${sealSupportCookie(value, readSupportConfig())}`
}

function entry(headers, data = { code, sessionId: id }) {
  return request('enter', {
    method: 'POST',
    body: new URLSearchParams(data),
    headers: { Origin: gestao, ...headers },
  })
}

test('configuration requires fixed origins, a versioned HTTPS API and a strong secret', () => {
  assert.equal(readSupportConfig().apiBase, api)
  for (const overrides of [
    { SUPPORT_API_BASE_URL: 'http://api.example.test/api/v1' },
    { SUPPORT_API_BASE_URL: `${api}/admin` },
    { SUPPORT_API_BASE_URL: `https://user:pass@api.example.test/api/v1` },
    { SUPPORT_ADMIN_ORIGIN: `${platform}/login` },
    { SUPPORT_ALLOWED_GESTAO_ORIGIN: '*' },
    { SUPPORT_SESSION_SECRET: 'short' },
  ]) assert.equal(readSupportConfig({ ...env, ...overrides }), null)
  assert.equal(readSupportConfig({ ...env, SUPPORT_API_BASE_URL: 'http://127.0.0.1:3001/api/v1' }).apiBase,
    'http://127.0.0.1:3001/api/v1')
})

test('support pages can bypass legacy domain redirects only on the configured admin host', () => {
  assert.equal(matchesSupportPageOrigin('admin.example.test', '/support', new URLSearchParams(), platform), true)
  assert.equal(matchesSupportPageOrigin('admin.example.test', '/admin/barbearia', new URLSearchParams({ session: id }), platform), true)
  assert.equal(matchesSupportPageOrigin('admin.example.test', '/admin/barbearia', new URLSearchParams(), platform), false)
  assert.equal(matchesSupportPageOrigin('admin.other.test', '/support', new URLSearchParams(), platform), false)
  assert.equal(matchesSupportPageOrigin('admin.example.test', '/support', new URLSearchParams(), undefined), false)
})

test('session cookie encryption authenticates metadata, token and deployment', () => {
  const config = readSupportConfig()
  const value = sealSupportCookie(credentials, config)
  assert.notEqual(value, sealSupportCookie(credentials, config))
  assert(!value.includes(supportToken) && !value.includes(id))
  assert.deepEqual(unsealSupportCookie(value, config), credentials)
  const parts = value.split('.')
  parts[2] = `${parts[2][0] === 'A' ? 'B' : 'A'}${parts[2].slice(1)}`
  assert.equal(unsealSupportCookie(parts.join('.'), config), null)
  assert.equal(unsealSupportCookie(value, readSupportConfig({ ...env, SUPPORT_ADMIN_ORIGIN: 'https://other.example.test' })), null)
  assert.equal(unsealSupportCookie(sealSupportCookie({ ...credentials, expiresAt: '2000-01-01' }, config), config), null)
})

test('entry checks external Host and authorized Gestão Origin before exchanging the code', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), `${api}/support-sessions/exchange`)
    assert.equal(options.method, 'POST')
    assert.equal(options.redirect, 'error')
    assert.deepEqual(JSON.parse(options.body), { code })
    assert.equal(new Headers(options.headers).get('authorization'), null)
    return Response.json({ ...envelope, accessToken: supportToken })
  })
  assert.equal((await supportEnter(entry({}, { code, sessionId: 'malformed-session' }))).status, 400)
  assert.equal((await supportEnter(entry({ Origin: 'https://evil.example.test' }))).status, 403)
  assert.equal((await supportEnter(entry({ Host: '127.0.0.1:3000', 'X-Forwarded-Host': 'admin.example.test' }))).status, 403)
  assert.equal(upstream.mock.callCount(), 0)
  const result = await supportEnter(entry({}, { code, sessionId: id, redirect: 'https://evil.example.test' }))
  assert.equal(result.status, 303)
  assert.equal(result.headers.get('location'), `${platform}/support?session=${id}`)
  assert.equal(result.headers.get('cache-control'), 'no-store')
  const setCookie = result.headers.get('set-cookie')
  assert(setCookie.startsWith(`support_session_${id}=`))
  assert.match(setCookie, /Path=\/api\/support; HttpOnly; SameSite=Lax; Secure/i)
  assert.doesNotMatch(setCookie, /Domain=|synthetic/i)
  assert.equal(await result.text(), '')
})

test('valid new handoff revokes an existing cookie session before replacing it', async t => {
  const old = { ...credentials, id: olderId, accessToken: 'previous.support.credential' }
  const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).endsWith('/exchange')) return Response.json({ ...envelope, accessToken: supportToken })
    assert.equal(String(url), `${api}/support-sessions/end`)
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${old.accessToken}`)
    return Response.json({ ended: true })
  })
  const result = await supportEnter(entry({ Cookie: cookie(old) }))
  assert.equal(result.status, 303)
  assert.equal(upstream.mock.callCount(), 2)
  const updates = result.headers.getSetCookie()
  assert.equal(updates.length, 2)
  assert(updates.some(header => header.startsWith(`support_session_${old.id}=;`) && header.includes('Max-Age=0')))
  assert(updates.some(header => header.startsWith(`support_session_${id}=v1.`)))
})

test('metadata response projects only the authorized tenant and never returns credentials', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), `${api}/support-sessions/session`)
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${supportToken}`)
    return Response.json({ ...envelope, accessToken: supportToken,
      session: { ...session, code },
      user: { ...user, refreshToken: supportToken, tenant: { ...user.tenant, integrationToken: supportToken },
        salons: [...user.salons, { id: 'other', name: 'Other tenant', slug: 'other' }] },
    })
  })
  assert.equal((await supportSession(request(`session?session=${olderId}`, { headers: { Cookie: cookie() } }))).status, 409)
  assert.equal(upstream.mock.callCount(), 0)
  const result = await supportSession(request(`session?session=${id}`, { headers: { Cookie: cookie() } }))
  assert.equal(result.status, 200)
  const body = await result.text()
  assert.doesNotMatch(body, /credential|synthetic|Other tenant|integrationToken|refreshToken|accessToken/)
  assert.deepEqual(JSON.parse(body).session, session)
  assert.equal(JSON.parse(body).user.salons[0].id, session.salonId)
})

test('proxy scopes paths, methods, mutations and stale tabs before contacting the API', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), `${api}/services/manage/${session.salonId}`)
    assert.deepEqual([...new Headers(options.headers)], [['accept', 'application/json'], ['authorization', `Bearer ${supportToken}`]])
    assert.equal(options.redirect, 'error')
    return Response.json([], { headers: { 'Set-Cookie': 'external=true' } })
  })
  const headers = { Cookie: cookie(), 'X-Support-Session-Id': id }
  for (const path of [
    ['auth', 'refresh'], ['establishments', 'another-salon', 'pix-key'], ['admin', 'tenants'],
    ['appointments', 'apt-111', 'mark-paid'], ['services', 'manage', 'another-salon'],
    ['services', 'manage', '..'], ['services', 'manage', '%2es'], ['https:', '', 'evil.example.test'],
  ]) assert.equal((await supportProxy(request('proxy', { headers }), path)).status, 403)
  assert.equal((await supportProxy(request('proxy', { headers: { ...headers, 'X-Support-Session-Id': olderId } }),
    ['services', 'manage', session.salonId])).status, 409)
  assert.equal((await supportProxy(request('proxy', { method: 'POST', body: '{}', headers: { ...headers, Origin: platform } }),
    ['services'])).status, 403)
  assert.equal((await supportProxy(request('proxy', { method: 'POST', body: '{}', headers: { ...headers, Origin: gestao, 'X-Support-CSRF': '1' } }),
    ['services'])).status, 403)
  assert.equal(upstream.mock.callCount(), 0)
  const result = await supportProxy(request('proxy', {
    headers: { ...headers, Authorization: 'Bearer browser-token' },
  }), ['services', 'manage', session.salonId])
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('set-cookie'), null)
  assert.equal(result.headers.get('cache-control'), 'no-store')
})

test('proxy rejects redirects and enforces a supported bounded request body', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => Response.redirect('https://evil.example.test'))
  const headers = { Cookie: cookie(), 'X-Support-Session-Id': id, Origin: platform, 'X-Support-CSRF': '1' }
  const result = await supportProxy(request('proxy', { method: 'POST', headers, body: 'plain text' }), ['services'])
  assert.equal(result.status, 415)
  const oversized = await supportProxy(request('proxy', { method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': '100000000' }, body: '{}',
  }), ['services'])
  assert.equal(oversized.status, 413)
  assert.equal(upstream.mock.callCount(), 0)
  const redirect = await supportProxy(request('proxy', { method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ salonId: session.salonId }),
  }), ['services'])
  assert.equal(redirect.status, 502)
  assert.equal(redirect.headers.get('location'), null)
})

test('proxy rejects sensitive mutations and payloads for another salon', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => Response.json({}))
  const headers = { Cookie: cookie(), 'X-Support-Session-Id': id, Origin: platform,
    'X-Support-CSRF': '1', 'Content-Type': 'application/json' }
  for (const [method, path, body] of [
    ['PUT', ['establishments', session.salonId], { name: 'A', ownerId: 'another-owner' }],
    ['PUT', ['establishments', session.salonId], { tenantId: 'another-tenant' }],
    ['PUT', ['professionals', 'professional-123'], { workStart: '09:00', userId: 'another-user' }],
    ['PATCH', ['appointments', 'appointment-123', 'status'], { status: 'COMPLETED', salonId: 'another-salon' }],
    ['POST', ['services'], { salonId: 'another-salon' }],
  ]) assert.equal((await supportProxy(request('proxy', { method, headers, body: JSON.stringify(body) }), path)).status, 403)
  assert.equal(upstream.mock.callCount(), 0)
  const allowed = await supportProxy(request('proxy', { method: 'PUT', headers,
    body: JSON.stringify({ name: 'Barbearia Teste', dayHours: { 0: { open: '08:00', close: '18:00' } } }),
  }), ['establishments', session.salonId])
  assert.equal(allowed.status, 200)
})

test('end revokes before clearing and keeps the cookie on an upstream failure', async t => {
  let fail = true
  const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), `${api}/support-sessions/end`)
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${supportToken}`)
    return fail ? Response.json({ error: 'internal' }, { status: 500 }) : Response.json({ ended: true })
  })
  const headers = { Cookie: cookie(), 'X-Support-Session-Id': id, Origin: platform, 'X-Support-CSRF': '1' }
  assert.equal((await supportEnd(request('end', { method: 'POST', headers: { ...headers, 'X-Support-Session-Id': olderId } }))).status, 409)
  assert.equal(upstream.mock.callCount(), 0)
  const failed = await supportEnd(request('end', { method: 'POST', headers }))
  assert.equal(failed.status, 502)
  assert.equal(failed.headers.get('set-cookie'), null)
  fail = false
  const ended = await supportEnd(request('end', { method: 'POST', headers }))
  assert.equal(ended.status, 200)
  assert.match(ended.headers.get('set-cookie'), /Max-Age=0/i)
  assert.deepEqual(await ended.json(), { ended: true })
})

test('admin transport uses verified tab context and preserves an independent normal session', async t => {
  const normalStorage = new Map([['token', 'normal-access'], ['refreshToken', 'normal-refresh'],
    ['adminAuthenticatedAt', String(Date.now())], ['user', JSON.stringify({ role: 'OWNER', id: 'normal-owner' })]])
  const location = { pathname: '/admin/barbearia-teste', search: `?session=${id}` }
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const headers = new Headers(init?.headers)
    if (url === `/api/support/session?session=${id}`) return Response.json(envelope)
    if (url === '/api/support/proxy/services/my-service') {
      assert.equal(headers.get('authorization'), null)
      assert.equal(headers.get('x-support-session-id'), id)
      assert.equal(headers.get('x-support-csrf'), '1')
      return Response.json({}, { status: 409 })
    }
    assert.equal(url, '/services/my-service')
    assert.equal(headers.get('authorization'), 'Bearer normal-access')
    return Response.json({})
  })
  const originalStorage = globalThis.sessionStorage
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => normalStorage.get(key) ?? null,
    removeItem: key => normalStorage.delete(key),
  } })
  globalThis.window = { location }
  try {
    assert.equal((await authFetch('/services/my-service')).status, 401)
    await bootstrapSupport(id)
    assert.equal((await authFetch('/services/my-service', {
      method: 'PUT', headers: { Authorization: 'Bearer normal-access' }, body: '{}',
    })).status, 409)
    assert.equal(normalStorage.get('token'), 'normal-access')
    assert.equal(normalStorage.get('refreshToken'), 'normal-refresh')
    location.search = ''
    assert.equal((await authFetch('/services/my-service')).status, 200)
  } finally {
    delete globalThis.window
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: originalStorage })
  }
})


test('out-of-order handoff responses and a delayed end preserve the newer cookie', async t => {
  const old = { ...credentials, id: olderId, accessToken: 'old.support.token' }
  const oldCode = 'old-support-entry-code-xxxxxxxxxxxxxxxxxx'
  let releaseExchange, releaseEnd
  const olderExchange = new Promise(resolve => { releaseExchange = resolve })
  const olderEnd = new Promise(resolve => { releaseEnd = resolve })
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).endsWith('/exchange')) {
      if (JSON.parse(options.body).code === oldCode) {
        await olderExchange
        return Response.json({ session: { ...session, id: old.id }, user, accessToken: old.accessToken })
      }
      return Response.json({ ...envelope, accessToken: supportToken })
    }
    if (String(url).endsWith('/end')) {
      assert.equal(options.headers.get('authorization'), `Bearer ${old.accessToken}`)
      await olderEnd
      return Response.json({ ended: true })
    }
    assert.equal(options.headers.get('authorization'), `Bearer ${supportToken}`)
    return Response.json(envelope)
  })
  const oldEntry = supportEnter(entry({}, { code: oldCode, sessionId: old.id }))
  const end = supportEnd(request('end', { method: 'POST', headers: {
    Origin: platform, Cookie: cookie(old), 'X-Support-CSRF': '1', 'X-Support-Session-Id': old.id,
  } }))
  const newer = await supportEnter(entry({}))
  const jar = new Map()
  function applyCookies(response) {
    for (const header of response.headers.getSetCookie()) {
      const [name, value] = header.split(';')[0].split('=')
      if (header.includes('Max-Age=0')) jar.delete(name)
      else jar.set(name, value)
    }
  }
  applyCookies(newer)
  releaseExchange()
  applyCookies(await oldEntry)
  const getMetadata = () => supportSession(request(`session?session=${id}`, {
    headers: { Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; ') },
  }))
  assert.equal((await getMetadata()).status, 200)
  releaseEnd()
  const ended = await end
  assert.equal(ended.status, 200)
  applyCookies(ended)
  assert.deepEqual([...jar.keys()], [`support_session_${id}`])
  assert.equal((await getMetadata()).status, 200)
})
