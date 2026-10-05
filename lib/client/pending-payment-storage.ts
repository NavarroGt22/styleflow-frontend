import type { PendingPaymentInfo } from '@/components/client/booking/BookingPaymentPending'

const keyFor = (salonId: string) => `mcj_pending_pay_${salonId}`

export function readPendingPaymentStorage(salonId: string): PendingPaymentInfo | null {
  if (typeof window === 'undefined' || !salonId) return null
  try {
    const raw = sessionStorage.getItem(keyFor(salonId))
    if (!raw) return null
    const data = JSON.parse(raw) as PendingPaymentInfo
    if (!data?.appointmentId || !data?.method || !data?.expiresAt) return null
    if (new Date(data.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(keyFor(salonId))
      return null
    }
    if (data.method !== 'PIX' && data.method !== 'CARD') return null
    return data
  } catch {
    return null
  }
}

export function writePendingPaymentStorage(salonId: string, info: PendingPaymentInfo) {
  if (typeof window === 'undefined' || !salonId) return
  try {
    sessionStorage.setItem(keyFor(salonId), JSON.stringify(info))
  } catch {
    // quota / private mode
  }
}

export function clearPendingPaymentStorage(salonId: string | null | undefined) {
  if (typeof window === 'undefined' || !salonId) return
  try {
    sessionStorage.removeItem(keyFor(salonId))
  } catch {
    // ignore
  }
}
