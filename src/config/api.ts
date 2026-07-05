import { API_BASE_URL, WS_BASE_URL } from './env';

const API_PREFIX = `${API_BASE_URL}/api/v1`;

/** Monta URL completa da API REST (path começa com /). */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_PREFIX}${normalized}`;
}

/** Monta URL de WebSocket (path começa com /). */
export function wsUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${WS_BASE_URL}${normalized}`;
}

/** Verifica se a URL aponta para a nossa API (útil para injetar Authorization). */
export function isInternalApiUrl(url: string): boolean {
  return url.startsWith(API_PREFIX) || url.startsWith('/api/v1');
}
