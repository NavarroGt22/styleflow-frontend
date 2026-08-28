export type SalonSession = {
  id: string
  name: string
  slug: string
  primaryColor?: string | null
  tenant?: { primaryColor?: string | null }
}

export type SessionUser = {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'PROFESSIONAL' | 'SUPER_ADMIN' | 'CUSTOMER'
  salons?: SalonSession[]
  professionalProfile?: { salon?: SalonSession }
  tenant?: {
    adminLocked?: boolean
    level?: string
    billingDueDate?: string | null
    primaryColor?: string | null
  }
}

const TOKEN_KEY = 'token'
const REFRESH_KEY = 'refreshToken'
const USER_KEY = 'user'
const ADMIN_AUTH_AT_KEY = 'adminAuthenticatedAt'

/** Sessão admin expira após 10 min — exige nova senha ao voltar do /app para /admin */
export const ADMIN_SESSION_MAX_MS = 10 * 60 * 1000

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function setSession(token: string, refreshToken: string, user: SessionUser) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(REFRESH_KEY, refreshToken)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  sessionStorage.setItem(ADMIN_AUTH_AT_KEY, String(Date.now()))
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(ADMIN_AUTH_AT_KEY)
}

export function getAdminAuthenticatedAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(ADMIN_AUTH_AT_KEY)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function isAdminSessionExpired(): boolean {
  const authenticatedAt = getAdminAuthenticatedAt()
  if (!authenticatedAt) return true
  return Date.now() - authenticatedAt > ADMIN_SESSION_MAX_MS
}

export function getAdminSessionRemainingMs(): number {
  const authenticatedAt = getAdminAuthenticatedAt()
  if (!authenticatedAt) return 0
  return Math.max(0, ADMIN_SESSION_MAX_MS - (Date.now() - authenticatedAt))
}

export function redirectToAdminLogin(nextPath?: string, reason?: 'session_expired') {
  if (typeof window === 'undefined') return
  clearSession()
  const next = encodeURIComponent(nextPath || `${window.location.pathname}${window.location.search}`)
  const reasonQuery = reason ? `&reason=${reason}` : ''
  window.location.href = `/login?next=${next}${reasonQuery}`
}

export function userCanAccessSalon(user: SessionUser | null, salonSlug: string): boolean {
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  if (user.role === 'PROFESSIONAL') {
    return user.professionalProfile?.salon?.slug === salonSlug
  }
  return Boolean(user.salons?.some((salon) => salon.slug === salonSlug))
}

export function resolveSalonForSlug(user: SessionUser, salonSlug: string) {
  if (user.role === 'PROFESSIONAL' && user.professionalProfile?.salon?.slug === salonSlug) {
    return user.professionalProfile.salon
  }
  return user.salons?.find((salon) => salon.slug === salonSlug) ?? null
}
