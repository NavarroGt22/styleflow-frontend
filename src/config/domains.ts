import { BASE_DOMAIN } from './env';

const EXTRA_PLATFORM_HOSTS = (import.meta.env.VITE_PLATFORM_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function isLocalhostHost(hostname = window.location.hostname): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

/** Domínio principal da plataforma (ex.: app.styleflow.com ou *.vercel.app). */
export function isPlatformHost(hostname = window.location.hostname): boolean {
  const host = hostname.toLowerCase();
  const base = BASE_DOMAIN.toLowerCase();

  if (isLocalhostHost(host)) return true;
  // Deploys Vercel/Netlify etc. são sempre a plataforma principal, não tenant white-label
  if (host.endsWith('.vercel.app') || host.endsWith('.netlify.app')) return true;
  if (EXTRA_PLATFORM_HOSTS.includes(host)) return true;

  return host === base || host.endsWith(`.${base}`);
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
