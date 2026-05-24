import { get } from 'svelte/store';
import { auth } from './stores/auth';

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken = data?.data?.accessToken;
    const user = data?.data?.user;
    if (newToken) {
      auth.set({
        token: newToken,
        user: user || get(auth).user,   // keep old user if not returned
        loading: false,
      });
      return newToken;
    }
  } catch (e) {
    console.error('Refresh failed', e);
  }
  return null;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const currentToken = get(auth).token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && currentToken) {
    // Try to refresh
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry with the new token
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      // Refresh failed – force logout
      auth.set({ token: null, user: null, loading: false });
    }
  }

  return res;
}
