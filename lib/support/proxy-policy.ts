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

const editableFields: Record<string, readonly string[]> = {
  establishments: [
    'name', 'phone', 'address', 'cep', 'latitude', 'longitude', 'queueRadiusMeters', 'dayHours',
    'openTime', 'closeTime', 'openWeekdays', 'closedDayMessage', 'bookingCalendarMode', 'instagramUrl',
    'queueMode', 'queueAutoAdvance', 'queueAllowClientView', 'queueAllowSkip', 'productCommissionEnabled',
    'productCommissionRate', 'primaryColor', 'customBrandName', 'historyText', 'lpSinceYear', 'logoUrl',
    'heroImageUrl', 'faviconUrl', 'loyaltyResetMode', 'bookingSlotIntervalMinutes',
  ],
  professionals: ['commissionRate', 'workStart', 'workEnd', 'prepMinutes'],
  services: [
    'salonId', 'name', 'price', 'duration', 'category', 'description', 'professionalId', 'isActive',
    'standaloneAllowed', 'addonAllowed', 'comboItemServiceIds', 'addonHostServiceIds', 'isDefaultCutAddon',
  ],
}

export function supportMutationAllowed(method: string, segments: string[], payload: unknown, salonId: string): boolean {
  const body = asRecord(payload)
  if (!body) return false
  const [resource] = segments
  const fields = Object.keys(body)
  if (resource === 'appointments') {
    if (method === 'POST') {
      return body.salonId === salonId && fields.every(key => ['salonId', 'professionalId', 'startTime', 'endTime'].includes(key))
    }
    return fields.length === 1 && ['CONFIRMED', 'CANCELED_BY_SALON', 'NO_SHOW'].some(status => status === body.status)
  }
  if (resource === 'services' && (method === 'POST' || body.salonId !== undefined) && body.salonId !== salonId) return false
  return fields.every(key => editableFields[resource]?.includes(key))
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
    if (key === 'date' ? !/^\d{4}-\d{2}-\d{2}$/.test(value) : !isSupportId(value)) return null
    safeQuery.set(key, value)
  }
  const search = safeQuery.toString()
  return `/${segments.join('/')}${search ? `?${search}` : ''}`
}
