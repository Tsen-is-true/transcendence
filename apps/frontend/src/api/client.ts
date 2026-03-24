export const getAccessToken = () => sessionStorage.getItem('accessToken');
export const getRefreshToken = () => sessionStorage.getItem('refreshToken');

export const setTokens = (access: string, refresh: string) => {
  sessionStorage.setItem('accessToken', access);
  sessionStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
};

const setAuthorizationHeader = (headers: Headers, token: string | null) => {
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }
};

const refreshAuthTokens = async (refreshToken: string) => {
  try {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      return null;
    }

    const result = await refreshRes.json();
    const data = result?.data;

    if (!data?.accessToken || !data?.refreshToken) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

export const apiFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  const headers = new Headers(init?.headers);
  setAuthorizationHeader(headers, getAccessToken());
  const config = { ...init, headers };
  
  let response = await fetch(url, config);
  
  // Handle Token Expiry
  if (response.status === 401) {
    const refresh = getRefreshToken();
    if (refresh) {
      const data = await refreshAuthTokens(refresh);
      if (data) {
        setTokens(data.accessToken, data.refreshToken);
        setAuthorizationHeader(headers, data.accessToken);
        response = await fetch(url, { ...init, headers });
        if (response.status === 401) {
          clearTokens();
        }
      } else {
        clearTokens();
      }
    } else {
      clearTokens();
    }
  }
  return response;
};
