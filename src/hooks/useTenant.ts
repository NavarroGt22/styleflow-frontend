import { useMemo } from 'react';
import { apiUrl } from '../config/api';
import {
  extractTenantSubdomain,
  isCustomDomainHost,
} from '../config/domains';

export type TenantBranding = {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string | null;
  customBrandName?: string | null;
};

export { isCustomDomainHost };

export function resolveTenantSlugFromLocation(): string | null {
  return extractTenantSubdomain();
}

export function useTenantBranding(tenant?: TenantBranding | null) {
  return useMemo(() => {
    if (!tenant) {
      return {
        brandName: 'StyleFlow',
        primaryColor: undefined as string | undefined,
        logoUrl: undefined as string | undefined,
      };
    }

    return {
      brandName: tenant.customBrandName || tenant.name,
      primaryColor: tenant.primaryColor,
      logoUrl: tenant.logoUrl || undefined,
    };
  }, [tenant]);
}

export function getTenantBrandCss(primaryColor: string): string {
  return `
    :root { --brand-primary: ${primaryColor}; }
    .bg-indigo-600, .from-indigo-600, .to-indigo-700, .hover\\:from-indigo-700 {
      background-color: var(--brand-primary) !important;
    }
    .from-indigo-600 { --tw-gradient-from: var(--brand-primary) !important; }
    .to-indigo-700 { --tw-gradient-to: var(--brand-primary) !important; }
    .text-indigo-600, .dark\\:text-indigo-400 { color: var(--brand-primary) !important; }
    .border-indigo-600, .focus\\:ring-indigo-500 { border-color: var(--brand-primary) !important; }
    .focus\\:ring-indigo-500:focus { --tw-ring-color: var(--brand-primary) !important; }
  `;
}

export async function fetchTenantBySubdomain(subdomain: string): Promise<TenantBranding | null> {
  const res = await fetch(apiUrl(`/tenants/by-subdomain/${subdomain}`));
  if (!res.ok) return null;
  return res.json();
}

export function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const payload = data as { error?: string; details?: Array<{ message?: string }> };
  if (payload.error) return payload.error;
  if (payload.details?.[0]?.message) return payload.details[0].message;
  return fallback;
}
