import { asRecord, isSupportId } from './contract'

type Entry = {
  method: string
  segments: string[]
  query?: readonly string[]
}

// Match the SaaS support allowlist. The backend checks ownership of resource IDs and body references.
const routes: Entry[] = [
  { method: 'GET', segments: ['establishments', ':salon'] },
  { method: 'PUT', segments: ['establishments', ':salon'] },
  { method: 'GET', segments: ['services', ':salon'] },
  { method: 'GET', segments: ['services', 'manage', ':salon'] },
  { method: 'POST', segments: ['services'] },
  { method: 'PUT', segments: ['services', ':id'] },
  { method: 'DELETE', segments: ['services', ':id'] },
  { method: 'GET', segments: ['professionals', ':salon'] },
  { method: 'GET', segments: ['professionals', 'salon', ':salon', 'staff'] },
  { method: 'PUT', segments: ['professionals', ':id'] },
  { method: 'GET', segments: ['appointments', 'salon', ':salon'] },
  { method: 'GET', segments: ['appointments', 'salon', ':salon', 'canceled'], query: ['date', 'professionalId'] },
  { method: 'POST', segments: ['appointments', 'block'] },
  { method: 'PATCH', segments: ['appointments', ':id', 'status'] },
]

// Bodies are validated by the ordinary owner schemas upstream; reject identity/scope overrides here too.
function add(methods: string, segments: string[], query?: readonly string[]) {
  for (const method of methods.split(' ')) routes.push({ method, segments, query })
}
add('GET', ['establishments', ':salon', 'pix-key'])
for (const action of ['test', 'send', 'broadcast']) add('POST', ['establishments', ':salon', 'whatsapp', action])
add('GET', ['establishments', ':salon', 'whatsapp', 'evolution', 'status'])
for (const action of ['connect', 'disconnect']) add('POST', ['establishments', ':salon', 'whatsapp', 'evolution', action])
add('POST', ['professionals']); add('DELETE', ['professionals', ':id'])
add('POST', ['appointments', 'walk-in']); add('PUT', ['appointments', ':id', 'complete']); add('POST', ['appointments', ':id', 'mark-paid'])
for (const tail of [[], ['summary'], ['daily'], ['services']]) add('GET', ['financials', 'salon', ':salon', ...tail], ['from', 'to', 'month', 'professionalId'])
for (const action of ['close', 'ai-advisor']) add('POST', ['financials', 'salon', ':salon', action])
add('GET', ['customers', 'salon', ':salon'], ['q', 'groupId', 'professionalId', 'month']); add('PATCH', ['customers', ':id'])
for (const prefix of ['products', 'client-groups', 'coupons']) {
  add('GET', [prefix, 'salon', ':salon']); add('POST', [prefix]); add('PUT DELETE', [prefix, ':id'])
}
add('POST', ['products', ':id', 'restock']); add('POST', ['products', 'sell'])
add('GET', ['loyalty', 'rewards', 'salon', ':salon']); add('POST', ['loyalty', 'rewards']); add('PUT DELETE', ['loyalty', 'rewards', ':id']); add('POST', ['loyalty', 'earns', ':id', 'redeem'])
add('POST', ['queue', 'session']); add('GET', ['queue', ':id']);
for (const action of ['start', 'complete', 'reorder', 'walkin']) add('POST', ['queue', ':id', action])
add('POST', ['queue', 'entries', ':id', 'skip'])
// Public queue is addressed by slug, and checked against the current session by the API.
add('GET', ['queue', 'public', ':id'])
add('GET', ['timecards', 'salon', ':salon'], ['from', 'to', 'professionalId'])
add('GET', ['subscriptions', 'salon', ':salon', 'manage'])
add('POST', ['subscriptions', 'salon', ':salon', 'plans'])
add('PUT', ['subscriptions', 'salon', ':salon', 'plans', ':id'])
add('POST', ['subscriptions', 'salon', ':salon', 'plans', ':id', 'availability'])
add('POST', ['subscriptions', 'salon', ':salon', 'customers', ':id', 'subscribe'])
add('POST', ['subscriptions', 'salon', ':salon', 'charges', ':id', 'sync'])
add('GET', ['subscriptions', 'salon', ':salon', 'subscribers', ':id'])
add('POST', ['subscriptions', 'salon', ':salon', 'subscribers', ':id', 'adjust'])
add('PUT', ['subscriptions', 'salon', ':salon', 'no-show'])

export function supportMutationAllowed(method: string, segments: string[], payload: unknown, salonId: string): boolean {
  const body = asRecord(payload)
  if (!body) return false
  function scoped(value: unknown, depth = 0): boolean {
    if (depth > 12) return false
    if (Array.isArray(value)) return value.length <= 500 && value.every(item => scoped(item, depth + 1))
    const record = asRecord(value)
    if (!record) return true
    return Object.entries(record).every(([key, item]) => {
      if (item == null) return true
      if (key === 'salonId') return item === salonId
      if (['tenantId', 'ownerId', 'userId', 'actorId', 'subjectId'].includes(key)) return false
      return scoped(item, depth + 1)
    })
  }
  return scoped(body)
}

export function supportApiPath(method: string, segments: string[], query: URLSearchParams, salonId: string): string | null {
  if (!segments.every(isSupportId)) return null

  const route = routes.find(entry => entry.method === method && entry.segments.length === segments.length &&
    entry.segments.every((part, index) => {
      if (part === ':salon') return segments[index] === salonId
      return part === ':id' || part === segments[index]
    }))
  if (!route) return null

  const safeQuery = new URLSearchParams()
  for (const [key, value] of query) {
    if (!route.query?.includes(key) || safeQuery.has(key)) return null
    if (['date', 'from', 'to'].includes(key) ? !/^\d{4}-\d{2}-\d{2}$/.test(value) : key === 'month' ? !/^\d{4}-\d{2}$/.test(value) : key === 'q' ? value.length > 200 : !isSupportId(value)) return null
    safeQuery.set(key, value)
  }
  const search = safeQuery.toString()
  return `/${segments.join('/')}${search ? `?${search}` : ''}`
}
