import { apiUrl } from '../config/api';

const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedPublicSalon = {
  savedAt: number;
  data: unknown;
};

function cacheKey(salonSlug?: string) {
  return `styleflow_public_salon_${salonSlug || 'default'}`;
}

export function readPublicSalonCache(salonSlug?: string): unknown | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(salonSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPublicSalon;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(cacheKey(salonSlug));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writePublicSalonCache(salonSlug: string | undefined, data: unknown) {
  try {
    const payload: CachedPublicSalon = { savedAt: Date.now(), data };
    sessionStorage.setItem(cacheKey(salonSlug), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export async function prefetchPublicSalon(salonSlug?: string) {
  const cached = readPublicSalonCache(salonSlug);
  if (cached) return cached;

  try {
    const fetchUrl = salonSlug
      ? apiUrl(`/queue/public/${salonSlug}`)
      : apiUrl('/queue/public');
    const res = await fetch(fetchUrl, {
      headers: { 'X-Custom-Host': window.location.host },
    });
    if (!res.ok) return null;
    const json = await res.json();
    writePublicSalonCache(salonSlug, json);
    return json;
  } catch {
    return null;
  }
}

export function hydratePublicSalonFromCache<T>(salonSlug: string | undefined): T | null {
  return readPublicSalonCache(salonSlug) as T | null;
}
