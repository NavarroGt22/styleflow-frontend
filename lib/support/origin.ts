export function configuredSupportUrl(raw: string | undefined): URL | null {
  if (!raw || !/^https?:\/\//.test(raw) || /[?#\\]/.test(raw)) return null
  try {
    const url = new URL(raw)
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (!loopback && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

export function matchesSupportPageOrigin(
  host: string | null, path: string, search: URLSearchParams, configuredOrigin: string | undefined,
): boolean {
  if (path !== '/support' && !(path.startsWith('/admin/') && search.has('session'))) return false
  const origin = configuredSupportUrl(configuredOrigin)
  return origin?.pathname === '/' && origin.host === host
}
