import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { afterEach, beforeEach, test } from 'node:test'
registerHooks({ resolve(specifier, context, next) { if (context.parentURL?.includes('/lib/platform/') && /^\.\/.+[^./]+$/.test(specifier)) return next(`${specifier}.ts`, context); return next(specifier, context) } })
const { platformSession, platformProxy } = await import('../lib/platform/server.ts')
const { platformFetch, enterPlatformSupport } = await import('../lib/platform/client.ts')
const origin = 'https://admin.example.test'
let oldFetch, oldEnv
beforeEach(() => { oldFetch = global.fetch; oldEnv = { ...process.env }; Object.assign(process.env, { PLATFORM_MANAGEMENT_ENABLED: 'true', PLATFORM_ADMIN_ORIGIN: origin, PLATFORM_API_BASE_URL: 'https://api.example.test/api/v1' }) })
afterEach(() => { global.fetch = oldFetch; process.env = oldEnv })
const request = (method, body, headers = {}) => new Request(`${origin}/api/platform/session`, { method, headers: { host: 'admin.example.test', origin, 'content-type': 'application/json', 'x-platform-csrf': '1', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) })
test('login stores only an HttpOnly credential and never returns it to browser JSON', async () => {
  const credential = `pm1_${'a'.repeat(43)}`
  global.fetch = async () => Response.json({ credential, expiresAt: new Date(Date.now() + 3600000).toISOString(), user: { id: 'id', role: 'SUPER_ADMIN', name: 'Master' } }, { status: 201 })
  const response = await platformSession(request('POST', { email: 'master@example.test', password: 'private' }))
  assert.equal(response.status, 201); assert.match(response.headers.get('set-cookie'), /HttpOnly/); assert.match(response.headers.get('set-cookie'), /Secure/); assert.match(response.headers.get('set-cookie'), /Path=\/api\/platform/)
  assert.ok(!(await response.text()).includes(credential))
})
test('forged origin and host are refused before external requests', async () => {
  global.fetch = async () => { throw new Error('must not call') }
  assert.equal((await platformSession(request('POST', {}, { origin: 'https://evil.example' }))).status, 403)
  assert.equal((await platformSession(request('POST', {}, { host: 'evil.example' }))).status, 403)
})
test('proxy rejects paths outside the Master allowlist and requires the session cookie', async () => {
  assert.equal((await platformProxy(request('GET'), ['auth', 'me'])).status, 403)
  assert.equal((await platformProxy(request('GET'), ['dashboard'])).status, 401)
  assert.equal((await platformProxy(request('GET'), ['tenants', '..', 'auth'])).status, 403)
})
test('logout keeps the cookie when upstream revocation fails', async () => {
  global.fetch = async () => new Response('{}', { status: 503 })
  const response = await platformSession(request('DELETE', {}, { cookie: `platform_management=pm1_${'a'.repeat(43)}` }))
  assert.equal(response.status, 503); assert.equal(response.headers.get('set-cookie'), null)
})
test('legacy Master financial retries reuse the idempotency key and never forward browser Authorization', async () => {
  const keys = [], authorizations = []
  global.fetch = async (_url, options) => { keys.push(options.headers.get('idempotency-key')); authorizations.push(options.headers.get('authorization')); return Response.json({}, { status: keys.length === 1 ? 503 : 200 }) }
  const options = { method: 'POST', headers: { Authorization: 'must-be-removed' }, body: JSON.stringify({ amountPaid: 11 }) }
  await platformFetch('/admin/tenants/60000000-0000-4000-8000-000000000001/payments', options)
  await platformFetch('/admin/tenants/60000000-0000-4000-8000-000000000001/payments', options)
  assert.ok(keys[0]); assert.equal(keys[0], keys[1]); assert.deepEqual(authorizations, [null, null])
})

test('support handoff refuses external destinations and verifies the exchanged session before navigating', async () => {
  const previousWindow = global.window, id = '64000000-0000-4000-8000-000000000004'
  let target = '', calls = 0
  global.window = { location: { origin, assign: value => { target = value } } }
  try {
    global.fetch = async (_url, options) => {
      calls++; assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'same-origin')
      assert.equal(options.body.get('sessionId'), id)
      const response = new Response('support page', { status: 200 })
      Object.defineProperty(response, 'url', { value: `${origin}/support?session=${id}` })
      return response
    }
    const entry = { code: 'single-use-test-code', sessionId: id, enterUrl: `${origin}/api/support/enter` }
    await assert.rejects(enterPlatformSupport({ ...entry, enterUrl: 'https://evil.example/api/support/enter' }), /Destino/)
    assert.equal(calls, 0)
    await enterPlatformSupport(entry); assert.equal(target, `/support?session=${id}`)
  } finally { if (previousWindow === undefined) delete global.window; else global.window = previousWindow }
})
