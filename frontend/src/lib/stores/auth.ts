import { writable } from 'svelte/store';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  name?: string;   
}

export interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;   
}

export const auth = writable<AuthState>({
  token: null,
  user: null,
  loading: true,       // start as loading
});
