import { BASE_DOMAIN } from './env';

export function isLocalhostHost(hostname = window.location.hostname): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

/** Domínio principal da plataforma (ex.: app.styleflow.com ou styleflow.com). */
export function isPlatformHost(hostname = window.location.hostname): boolean {
  const host = hostname.toLowerCase();
  if (isLocalhostHost(host)) return true;
  return host === BASE_DOMAIN || host.endsWith(`.${BASE_DOMAIN}`);
}

/** Domínio customizado do tenant (white-label), fora da plataforma. */
export function isCustomDomainHost(hostname = window.location.hostname): boolean {
  return !isPlatformHost(hostname);
}

export function extractTenantSubdomain(hostname = window.location.hostname): string | null {
  const host = hostname.toLowerCase();
  if (isLocalhostHost(host) || host === BASE_DOMAIN) return null;
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null;
  const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1));
  return subdomain || null;
}
