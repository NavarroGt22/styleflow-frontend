/** Variáveis de ambiente do Vite (prefixo VITE_). */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3333';

export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL?.replace(/\/$/, '') ??
  API_BASE_URL.replace(/^http/, 'ws');

/** Domínio da plataforma (ex.: styleflow.com.br). Subdomínios são tenants. */
export const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN ?? 'styleflow.com';

export const isDev = import.meta.env.DEV;
