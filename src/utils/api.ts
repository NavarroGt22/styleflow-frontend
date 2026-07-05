import { apiUrl, isInternalApiUrl } from '../config/api';

let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string | null) => void }> = [];

function addToQueue(): Promise<string | null> {
  return new Promise((resolve) => {
    refreshQueue.push({ resolve });
  });
}

function resolveRequestUrl(url: string): string {
  if (url.startsWith('/api/v1')) return apiUrl(url.slice('/api/v1'.length));
  return url;
}

export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const resolvedUrl = resolveRequestUrl(url);
  const isAdmin = window.location.pathname.startsWith('/admin');

  const tokenKey = isAdmin ? 'token' : 'client_token';
  const refreshKey = isAdmin ? 'refreshToken' : 'client_refreshToken';
  const userKey = isAdmin ? 'user' : 'client_user';

  const token = sessionStorage.getItem(tokenKey);

  const headers = new Headers(options.headers || {});
  if (token && isInternalApiUrl(resolvedUrl)) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  options.headers = headers;

  try {
    let response = await fetch(resolvedUrl, options);

    if (response.status === 401) {
      const refreshToken = sessionStorage.getItem(refreshKey);

      if (!refreshToken) {
        sessionStorage.removeItem(tokenKey);
        sessionStorage.removeItem(refreshKey);
        sessionStorage.removeItem(userKey);
        if (isAdmin && window.location.pathname !== '/login' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return response;
      }

      if (isRefreshing) {
        const newToken = await addToQueue();
        if (newToken) {
          const newHeaders = new Headers(options.headers || {});
          newHeaders.set('Authorization', `Bearer ${newToken}`);
          options.headers = newHeaders;
          return await fetch(resolvedUrl, options);
        }
        return response;
      }

      isRefreshing = true;

      try {
        const refreshRes = await fetch(apiUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();

          sessionStorage.setItem(tokenKey, data.accessToken);
          sessionStorage.setItem(refreshKey, data.refreshToken);

          isRefreshing = false;
          processQueue(data.accessToken);

          const newHeaders = new Headers(options.headers || {});
          newHeaders.set('Authorization', `Bearer ${data.accessToken}`);
          options.headers = newHeaders;

          return await fetch(resolvedUrl, options);
        }

        isRefreshing = false;
        processQueue(null);

        sessionStorage.removeItem(tokenKey);
        sessionStorage.removeItem(refreshKey);
        sessionStorage.removeItem(userKey);
        if (isAdmin && window.location.pathname !== '/login' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return response;
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(null);
        console.error('⚠️ [SECURE FETCH] Erro ao realizar rotação de token:', refreshErr);
        return response;
      }
    }

    return response;
  } catch (error) {
    console.error('⚠️ [SECURE FETCH ERROR]:', error);
    throw error;
  }
}

function processQueue(token: string | null) {
  refreshQueue.forEach((item) => item.resolve(token));
  refreshQueue = [];
}
