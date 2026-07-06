/** Variáveis de ambiente do Vite (prefixo VITE_). */

function normalizeApiUrl(value: string | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;
  const trimmed = value.trim().replace(/\/$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

export const API_BASE_URL = normalizeApiUrl(
  import.meta.env.VITE_API_URL,
  'http://localhost:3333'
);

export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL?.replace(/\/$/, '') ??
  API_BASE_URL.replace(/^https?/, 'ws');

/** Domínio da plataforma (ex.: styleflow.com.br). Subdomínios são tenants. */
export const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN ?? 'styleflow.com';

export const isDev = import.meta.env.DEV;
