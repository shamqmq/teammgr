import { get } from 'svelte/store';
import { auth } from './stores/auth';

// 1. Internal helper function to rotate tokens
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    
    const data = await res.json();
    const newToken = data?.data?.accessToken;
    let user = data?.data?.user;

    if (newToken) {
      // If the backend didn't return the user object, fetch it manually
      if (!user) {
        try {
          const meRes = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${newToken}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            user = meData.user;
          }
        } catch (e) {
          console.error("Failed to fetch user profile on refresh", e);
        }
      }

      // Update the global auth store
      auth.set({
        token: newToken,
        user: user || get(auth).user,
        loading: false,
      });
      return newToken;
    }
  } catch (e) {
    console.error('Refresh failed', e);
  }
  return null;
}

// 2. The REAL exported apiFetch utility that all your components rely on
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const currentStore = get(auth);
  const currentToken = currentStore.token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  // 1. Make the initial request
  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // 2. If it fails due to an expired token (401), try to refresh it
  if (res.status === 401 && currentToken) {
    try {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData?.data?.accessToken;
        
        if (newToken) {
          // Update the store with the new token so the user stays logged in
          auth.update(state => ({ ...state, token: newToken }));
          
          // Attach the NEW token and retry the original request
          headers['Authorization'] = `Bearer ${newToken}`;
          res = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });
        } else {
          throw new Error("No token returned");
        }
      } else {
        throw new Error("Refresh rejected");
      }
    } catch (e) {
      console.error("Session expired. Logging out.");
      auth.set({ token: null, user: null, loading: false });
      window.location.hash = '#/login';
    }
  }

  // 3. ALWAYS return the native fetch response so .json() works in your components!
  return res;
}
