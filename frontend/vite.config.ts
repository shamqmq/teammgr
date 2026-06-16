import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    host: true,          // allow connections from Docker
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://nginx:80',   
        changeOrigin: true,
      },
    },
  },
});
