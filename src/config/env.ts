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

function normalizeWsUrl(value: string | undefined, apiBaseUrl: string): string {
  if (value?.trim()) {
    const trimmed = value.trim().replace(/\/$/, '');
    if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) return trimmed;
    if (trimmed.startsWith('https://')) return trimmed.replace(/^https:\/\//, 'wss://');
    if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//, 'ws://');
    return `wss://${trimmed}`;
  }
  // HTTPS na API → WSS obrigatório (página Vercel é HTTPS)
  return apiBaseUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
}

export const WS_BASE_URL = normalizeWsUrl(import.meta.env.VITE_WS_URL, API_BASE_URL);

/** Domínio da plataforma (ex.: styleflow.com.br). Subdomínios são tenants. */
export const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN ?? 'styleflow.com';

export const isDev = import.meta.env.DEV;
