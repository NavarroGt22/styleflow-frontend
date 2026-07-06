import { BASE_DOMAIN } from './env';

function normalizeOrigin(value: string | undefined): string {
  if (!value?.trim()) {
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }
  const trimmed = value.trim().replace(/\/$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

/** URL pública do front (Vercel). Ex.: https://styleflow-frontend-seven.vercel.app */
export const PLATFORM_URL = normalizeOrigin(import.meta.env.VITE_PLATFORM_URL);

/** Caminhos do painel — sobrescreva na Vercel se mudar a estrutura de rotas */
export const ADMIN_LOGIN_PATH = import.meta.env.VITE_ADMIN_LOGIN_PATH ?? '/login';
export const SUPER_ADMIN_PATH = import.meta.env.VITE_SUPER_ADMIN_PATH ?? '/admin/super';

export function platformUrl(path: string): string {
  const base = PLATFORM_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${normalized}`;
}

export function adminLoginUrl(): string {
  return platformUrl(ADMIN_LOGIN_PATH);
}

export function superAdminUrl(): string {
  return platformUrl(SUPER_ADMIN_PATH);
}

export function ownerAdminUrl(salonSlug: string): string {
  return platformUrl(`/admin/${salonSlug}`);
}

export function clientPublicUrl(salonSlug: string): string {
  return platformUrl(`/app/${salonSlug}`);
}

/** Domínios sugeridos ao criar tenant (subdomínio ou path na plataforma atual) */
export function suggestTenantClientPath(tenantSlug: string): string {
  return `/app/${tenantSlug}`;
}

export function suggestTenantAdminPath(tenantSlug: string): string {
  return `/admin/${tenantSlug}`;
}

export function suggestTenantSubdomain(tenantSlug: string): string {
  return `${tenantSlug}.${BASE_DOMAIN}`;
}
