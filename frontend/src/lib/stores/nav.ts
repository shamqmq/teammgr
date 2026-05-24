import { writable } from 'svelte/store';
export const currentTaskId = writable<string | null>(null);
