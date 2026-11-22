import type { SessionUser } from '../auth'

export const SUPPORT_SESSION_HEADER = 'X-Support-Session-Id'
export const SUPPORT_CSRF_HEADER = 'X-Support-CSRF'
export const SUPPORT_SESSION_MAX_MS = 15 * 60 * 1000

export type SupportSession = {
  id: string
  tenantId: string
  tenantName: string
  salonId: string
  salonSlug: string
  actorName: string
  expiresAt: string
}

export type SupportContext = { session: SupportSession; user: SessionUser }

export function isSupportSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function isSupportId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

export function isSupportExpiry(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const expiry = Date.parse(value)
  const now = Date.now()
  return expiry > now && expiry <= now + SUPPORT_SESSION_MAX_MS
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function isName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 500
}

export function readSupportContext(value: unknown): SupportContext | null {
  const payload = asRecord(value)
  const session = asRecord(payload?.session)
  const user = asRecord(payload?.user)
  const tenant = asRecord(user?.tenant)
  if (!session || !user || !tenant || user.role !== 'OWNER') return null

  const { id, tenantId, tenantName, salonId, salonSlug, actorName, expiresAt } = session
  if (!isSupportSessionId(id) || !isSupportId(tenantId) || !isSupportId(salonId) ||
      !isSupportId(salonSlug) || !isName(tenantName) || !isName(actorName) || !isSupportExpiry(expiresAt)) {
    return null
  }
  if (!isSupportId(user.id) || !isName(user.name) || tenant.id !== tenantId ||
      (user.tenantId !== undefined && user.tenantId !== tenantId) || tenant.adminLocked === true) return null

  const availableSalons = Array.isArray(user.salons) ? user.salons : []
  const salon = availableSalons.map(asRecord).find(item => item?.id === salonId && item.slug === salonSlug)
  if (!salon || !isName(salon.name) || (salon.tenantId !== undefined && salon.tenantId !== tenantId)) return null

  return {
    session: { id, tenantId, tenantName, salonId, salonSlug, actorName, expiresAt },
    user: {
      id: user.id,
      name: user.name,
      email: typeof user.email === 'string' ? user.email : '',
      role: 'OWNER',
      salons: [{ id: salonId, slug: salonSlug, name: salon.name }],
      tenant: {
        id: tenantId,
        slug: isSupportId(tenant.slug) ? tenant.slug : undefined,
        primaryColor: typeof tenant.primaryColor === 'string' ? tenant.primaryColor : undefined,
        level: typeof tenant.level === 'string' ? tenant.level : undefined,
        inventoryEnabled: tenant.inventoryEnabled === true,
      },
    },
  }
}
