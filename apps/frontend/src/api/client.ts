export const getAccessToken = () => sessionStorage.getItem('accessToken');

export const setTokens = (access: string, refresh: string) => {
  sessionStorage.setItem('accessToken', access);
  sessionStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
};

export const apiFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const config = { ...init, headers };
  
  let response = await fetch(url, config);
  
  // Handle Token Expiry
  if (response.status === 401) {
    const refresh = sessionStorage.getItem('refreshToken');
    if (refresh) {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh })
      });
      if (refreshRes.ok) {
        const result = await refreshRes.json();
        const data = result.data;
        setTokens(data.accessToken, data.refreshToken);
        headers.set('Authorization', `Bearer ${data.accessToken}`);
        response = await fetch(url, { ...init, headers });
      } else {
        clearTokens();
      }
    } else {
      clearTokens();
    }
  }
  return response;
};
