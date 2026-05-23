let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string | null) => void }> = [];

function addToQueue(): Promise<string | null> {
  return new Promise((resolve) => {
    refreshQueue.push({ resolve });
  });
}

export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const isAdmin = window.location.pathname.startsWith('/admin');
  
  const tokenKey = isAdmin ? 'token' : 'client_token';
  const refreshKey = isAdmin ? 'refreshToken' : 'client_refreshToken';
  const userKey = isAdmin ? 'user' : 'client_user';

  let token = sessionStorage.getItem(tokenKey);
  
  const isInternal = url.startsWith('/') || url.includes('localhost:3333');
  const headers = new Headers(options.headers || {});
  if (token && isInternal) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  options.headers = headers;

  try {
    let response = await fetch(url, options);

    // Se o token de acesso expirou (401), tentamos o refresh automático de forma atômica e resiliente
    if (response.status === 401) {
      const refreshToken = sessionStorage.getItem(refreshKey);
      
      if (!refreshToken) {
        // Sem refresh token, limpa credenciais e força redirecionamento ao login se for admin
        sessionStorage.removeItem(tokenKey);
        sessionStorage.removeItem(refreshKey);
        sessionStorage.removeItem(userKey);
        if (isAdmin && window.location.pathname !== '/login' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return response;
      }

      if (isRefreshing) {
        // Se já está rodando um refresh, aguarda na fila pelo novo token
        const newToken = await addToQueue();
        if (newToken) {
          const newHeaders = new Headers(options.headers || {});
          newHeaders.set('Authorization', `Bearer ${newToken}`);
          options.headers = newHeaders;
          return await fetch(url, options);
        } else {
          return response;
        }
      }

      isRefreshing = true;

      try {
        const refreshRes = await fetch('http://localhost:3333/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
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

          return await fetch(url, options);
        } else {
          isRefreshing = false;
          processQueue(null);

          // Refresh falhou (ex: refresh token expirado ou inválido)
          sessionStorage.removeItem(tokenKey);
          sessionStorage.removeItem(refreshKey);
          sessionStorage.removeItem(userKey);
          if (isAdmin && window.location.pathname !== '/login' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return response;
        }
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
