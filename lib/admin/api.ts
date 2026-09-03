import { authFetch } from '@/lib/api'
import type {
  Appointment,
  CustomersListResponse,
  FinancialDashboard,
  LoyaltyReward,
  LoyaltyRewardType,
  Product,
  Professional,
  QueueSession,
  SalonSettings,
  Service,
} from './types'

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    const payload = data as { error?: string; details?: unknown }
    if (payload.details && Array.isArray(payload.details)) {
      const first = payload.details[0] as { message?: string; path?: (string | number)[] }
      const field = first?.path?.join('.') || 'campo'
      throw new Error(first?.message ? `${field}: ${first.message}` : payload.error || 'Erro na requisição.')
    }
    throw new Error(payload.error || 'Erro na requisição.')
  }
  return data as T
}

export function mapService(item: Record<string, unknown>): Service {
  return {
    id: String(item.id),
    name: String(item.name ?? ''),
    category: String(item.description || 'Geral'),
    duration: Number(item.duration ?? 30),
    price: Number(item.price ?? 0),
    active: item.isActive !== false,
    description: item.description ? String(item.description) : null,
  }
}

export async function fetchServices(salonId: string): Promise<Service[]> {
  const response = await authFetch(`/services/manage/${salonId}`)
  const data = await parseJson<Record<string, unknown>[]>(response)
  return Array.isArray(data) ? data.map(mapService) : []
}

export async function createService(payload: {
  salonId: string
  name: string
  price: number
  duration: number
  description?: string
}): Promise<Service> {
  const response = await authFetch('/services', {
    method: 'POST',
    body: JSON.stringify({ ...payload, isActive: true }),
  })
  return mapService(await parseJson(response))
}

export async function updateService(
  id: string,
  payload: { name?: string; price?: number; duration?: number; description?: string; isActive?: boolean },
): Promise<Service> {
  const response = await authFetch(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return mapService(await parseJson(response))
}

export async function deleteService(id: string): Promise<void> {
  const response = await authFetch(`/services/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Não foi possível excluir o serviço.')
  }
}

export async function fetchAppointments(salonId: string): Promise<Appointment[]> {
  const response = await authFetch(`/appointments/salon/${salonId}`)
  return parseJson(response)
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  const response = await authFetch(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  await parseJson(response)
}

export async function blockAppointment(payload: {
  salonId: string
  professionalId: string
  startTime: string
  endTime: string
}): Promise<void> {
  const response = await authFetch('/appointments/block', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  await parseJson(response)
}

export async function completeAppointment(
  id: string,
  finalPrice: number,
  paymentMethod = 'PIX',
  products?: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  const response = await authFetch(`/appointments/${id}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ finalPrice, paymentMethod, products: products ?? [] }),
  })
  await parseJson(response)
}

export async function fetchFinancials(
  salonId: string,
  range?: { from?: string; to?: string },
): Promise<FinancialDashboard> {
  const params = new URLSearchParams()
  if (range?.from) params.set('from', range.from)
  if (range?.to) params.set('to', range.to)
  const qs = params.toString()
  const response = await authFetch(`/financials/salon/${salonId}${qs ? `?${qs}` : ''}`)
  return parseJson(response)
}

export async function closeFinancialRegister(salonId: string): Promise<void> {
  const response = await authFetch(`/financials/salon/${salonId}/close`, { method: 'POST' })
  await parseJson(response)
}

export async function fetchProfessionals(salonId: string): Promise<Professional[]> {
  const response = await authFetch(`/professionals/${salonId}`)
  return parseJson(response)
}

export async function createProfessional(payload: {
  salonId: string
  name: string
  email: string
  phone?: string
  commissionRate: number
  workStart?: string
  workEnd?: string
  password?: string
}): Promise<void> {
  const response = await authFetch('/professionals', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      workStart: payload.workStart || '09:00',
      workEnd: payload.workEnd || '18:00',
    }),
  })
  await parseJson(response)
}

export async function updateProfessional(
  id: string,
  payload: {
    name?: string
    phone?: string
    commissionRate?: number
    workStart?: string
    workEnd?: string
    password?: string
  },
): Promise<void> {
  const response = await authFetch(`/professionals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  await parseJson(response)
}

export async function deleteProfessional(id: string): Promise<void> {
  const response = await authFetch(`/professionals/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Não foi possível remover o profissional.')
  }
}

export async function openQueueSession(professionalId: string, date: string): Promise<QueueSession> {
  const response = await authFetch('/queue/session', {
    method: 'POST',
    body: JSON.stringify({ professionalId, date }),
  })
  return parseJson(response)
}

export async function fetchQueueSession(sessionId: string): Promise<QueueSession> {
  const response = await authFetch(`/queue/${sessionId}`)
  return parseJson(response)
}

export async function startNextInQueue(sessionId: string): Promise<void> {
  const response = await authFetch(`/queue/${sessionId}/start`, { method: 'POST' })
  await parseJson(response)
}

export async function reorderQueueEntry(
  sessionId: string,
  entryId: string,
  newPosition: number,
  reason?: string,
): Promise<void> {
  const response = await authFetch(`/queue/${sessionId}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ entryId, newPosition, reason }),
  })
  await parseJson(response)
}

export async function skipQueueEntry(entryId: string, reason?: string): Promise<void> {
  const response = await authFetch(`/queue/entries/${entryId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  await parseJson(response)
}

export async function addWalkInToQueue(
  sessionId: string,
  payload: { name: string; phone?: string; serviceId: string },
): Promise<void> {
  const response = await authFetch(`/queue/${sessionId}/walkin`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  await parseJson(response)
}

export async function fetchSalon(salonId: string): Promise<SalonSettings> {
  const response = await authFetch(`/establishments/${salonId}`)
  return parseJson(response)
}

export async function updateSalon(salonId: string, data: Record<string, unknown>): Promise<SalonSettings> {
  const response = await authFetch(`/establishments/${salonId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  const payload = await parseJson<SalonSettings & { establishment?: SalonSettings }>(response)
  return payload.establishment ?? payload
}

export async function testSalonWhatsApp(
  salonId: string,
  phone: string
): Promise<{ message: string; phone: string; gatewayStatus: number }> {
  const response = await authFetch(`/establishments/${salonId}/whatsapp/test`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
  return parseJson(response)
}

export async function fetchProducts(salonId: string): Promise<Product[]> {
  const response = await authFetch(`/products/salon/${salonId}`)
  return parseJson(response)
}

export async function createProduct(payload: {
  salonId: string
  name: string
  price: number
  costPrice?: number
  stockQuantity: number
  minStockAlert?: number
  isReward?: boolean
}): Promise<Product> {
  const response = await authFetch('/products', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      minStockAlert: payload.minStockAlert ?? 5,
      isReward: payload.isReward === true,
    }),
  })
  return parseJson(response)
}

export async function updateProduct(
  id: string,
  payload: {
    name?: string
    price?: number
    costPrice?: number | null
    stockQuantity?: number
    minStockAlert?: number
    isActive?: boolean
    isReward?: boolean
  },
): Promise<Product> {
  const response = await authFetch(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return parseJson(response)
}

export async function softDeleteProduct(id: string): Promise<void> {
  const response = await authFetch(`/products/${id}`, { method: 'DELETE' })
  await parseJson(response)
}

export async function restockProduct(id: string, quantity: number): Promise<Product> {
  const response = await authFetch(`/products/${id}/restock`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  })
  return parseJson(response)
}

export async function fetchCustomers(salonId: string, q?: string): Promise<CustomersListResponse> {
  const params = new URLSearchParams()
  if (q?.trim()) params.set('q', q.trim())
  const qs = params.toString()
  const response = await authFetch(`/customers/salon/${salonId}${qs ? `?${qs}` : ''}`)
  return parseJson(response)
}

export async function updateCustomer(
  customerId: string,
  payload: { name: string; phone?: string | null; salonId: string },
): Promise<{ id: string; name: string; phone?: string | null }> {
  const response = await authFetch(`/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return parseJson(response)
}

export async function fetchLoyaltyRewards(salonId: string): Promise<LoyaltyReward[]> {
  const response = await authFetch(`/loyalty/rewards/salon/${salonId}`)
  return parseJson(response)
}

export async function createLoyaltyReward(payload: {
  salonId: string
  title: string
  description?: string
  cutsRequired: number
  rewardType?: LoyaltyRewardType
  productId?: string | null
  groupId?: string | null
}): Promise<LoyaltyReward> {
  const response = await authFetch('/loyalty/rewards', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return parseJson(response)
}

export type ClientGroup = {
  id: string
  name: string
  color: string
  description?: string | null
  isActive: boolean
  sortOrder: number
  autoAssign: boolean
  criteriaType?: 'CUTS' | 'REWARDS' | null
  criteriaValue?: number | null
  resetMode: 'LIFETIME' | 'MONTHLY'
  _count?: { members: number; rewards: number }
  rewards?: LoyaltyReward[]
}

export type SalonCoupon = {
  id: string
  code: string
  name: string
  percentOff: number
  maxUsesTotal?: number | null
  maxUsesPerUser?: number | null
  isActive: boolean
  _count?: { redemptions: number }
}

export async function fetchClientGroups(salonId: string): Promise<ClientGroup[]> {
  const response = await authFetch(`/client-groups/salon/${salonId}`)
  return parseJson(response)
}

export async function createClientGroup(payload: Record<string, unknown>): Promise<ClientGroup> {
  const response = await authFetch('/client-groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return parseJson(response)
}

export async function updateClientGroup(id: string, payload: Record<string, unknown>): Promise<ClientGroup> {
  const response = await authFetch(`/client-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return parseJson(response)
}

export async function deleteClientGroup(id: string): Promise<void> {
  const response = await authFetch(`/client-groups/${id}`, { method: 'DELETE' })
  await parseJson(response)
}

export async function fetchCoupons(salonId: string): Promise<SalonCoupon[]> {
  const response = await authFetch(`/coupons/salon/${salonId}`)
  return parseJson(response)
}

export async function createCoupon(payload: Record<string, unknown>): Promise<SalonCoupon> {
  const response = await authFetch('/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return parseJson(response)
}

export async function updateCoupon(id: string, payload: Record<string, unknown>): Promise<SalonCoupon> {
  const response = await authFetch(`/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return parseJson(response)
}

export async function deleteCoupon(id: string): Promise<void> {
  const response = await authFetch(`/coupons/${id}`, { method: 'DELETE' })
  await parseJson(response)
}

export async function updateLoyaltyReward(
  id: string,
  payload: {
    title?: string
    description?: string | null
    cutsRequired?: number
    rewardType?: LoyaltyRewardType
    productId?: string | null
    isActive?: boolean
  },
): Promise<LoyaltyReward> {
  const response = await authFetch(`/loyalty/rewards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return parseJson(response)
}

export async function deleteLoyaltyReward(id: string): Promise<void> {
  const response = await authFetch(`/loyalty/rewards/${id}`, { method: 'DELETE' })
  await parseJson(response)
}

export async function redeemLoyaltyEarn(earnId: string): Promise<void> {
  const response = await authFetch(`/loyalty/earns/${earnId}/redeem`, { method: 'POST' })
  await parseJson(response)
}

export async function sellProduct(payload: {
  salonId: string
  productId: string
  quantity: number
  paymentMethod?: string
  professionalId?: string | null
}): Promise<void> {
  const response = await authFetch('/products/sell', {
    method: 'POST',
    body: JSON.stringify({
      salonId: payload.salonId,
      productId: payload.productId,
      quantity: payload.quantity,
      paymentMethod: payload.paymentMethod || 'PIX',
      professionalId: payload.professionalId || undefined,
    }),
  })
  await parseJson(response)
}

export function normalizeInstagram(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed)
      const host = parsed.hostname.replace(/^www\./, '')
      if (host === 'instagram.com') {
        const path = parsed.pathname.replace(/^\/+/, '').replace(/\/+$/, '')
        return path ? `https://www.instagram.com/${path}` : ''
      }
    } catch {
      return trimmed
    }
    return trimmed
  }

  const handle = trimmed.replace(/^@/, '').replace(/^\/+/, '')
  return handle ? `https://www.instagram.com/${handle}` : ''
}
