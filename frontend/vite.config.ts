import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Client-side rendering only: `vite build` outputs static files served by nginx.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // For local development (`npm run dev`) forward API calls to the Go backend.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
