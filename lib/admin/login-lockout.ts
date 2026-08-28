const STORAGE_PREFIX = 'styleflow_admin_login_lockout_'
export const ADMIN_MAX_LOGIN_ATTEMPTS = 3
export const ADMIN_LOCKOUT_MS = 10 * 60 * 1000

type LockoutState = {
  attempts: number
  lockedUntil: number | null
}

function storageKey(email: string) {
  return `${STORAGE_PREFIX}${email.toLowerCase().trim()}`
}

function readState(email: string): LockoutState {
  if (typeof window === 'undefined' || !email.trim()) {
    return { attempts: 0, lockedUntil: null }
  }

  try {
    const raw = localStorage.getItem(storageKey(email))
    if (!raw) return { attempts: 0, lockedUntil: null }
    const parsed = JSON.parse(raw) as LockoutState
    if (parsed.lockedUntil && Date.now() >= parsed.lockedUntil) {
      localStorage.removeItem(storageKey(email))
      return { attempts: 0, lockedUntil: null }
    }
    return parsed
  } catch {
    return { attempts: 0, lockedUntil: null }
  }
}

function writeState(email: string, state: LockoutState) {
  if (typeof window === 'undefined' || !email.trim()) return
  localStorage.setItem(storageKey(email), JSON.stringify(state))
}

export function getLoginLockout(email: string) {
  const state = readState(email)
  const locked = Boolean(state.lockedUntil && Date.now() < state.lockedUntil)
  const remainingMs = locked && state.lockedUntil ? Math.max(0, state.lockedUntil - Date.now()) : 0
  const attemptsLeft = locked ? 0 : Math.max(0, ADMIN_MAX_LOGIN_ATTEMPTS - state.attempts)

  return { locked, remainingMs, attemptsLeft, attempts: state.attempts }
}

export function recordFailedLogin(email: string) {
  const state = readState(email)
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    return getLoginLockout(email)
  }

  const attempts = state.attempts + 1
  if (attempts >= ADMIN_MAX_LOGIN_ATTEMPTS) {
    writeState(email, { attempts, lockedUntil: Date.now() + ADMIN_LOCKOUT_MS })
  } else {
    writeState(email, { attempts, lockedUntil: null })
  }

  return getLoginLockout(email)
}

export function clearLoginLockout(email: string) {
  if (typeof window === 'undefined' || !email.trim()) return
  localStorage.removeItem(storageKey(email))
}

export function forceLoginLockout(email: string) {
  writeState(email, { attempts: ADMIN_MAX_LOGIN_ATTEMPTS, lockedUntil: Date.now() + ADMIN_LOCKOUT_MS })
  return getLoginLockout(email)
}

export function formatLockoutRemaining(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
