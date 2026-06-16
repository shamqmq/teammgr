import { writable } from 'svelte/store';

function createAuthStore() {
  const { subscribe, set, update } = writable({
    token: null as string | null,
    user: null as any,
    loading: true,
  });

  return { subscribe, set, update };
}

export const auth = createAuthStore();
