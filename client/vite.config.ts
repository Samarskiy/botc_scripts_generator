import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The server runs on 5174; proxy /api there during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5174',
    },
  },
  // @botc/shared resolves to TypeScript source via a workspace symlink.
  optimizeDeps: {
    exclude: ['@botc/shared'],
  },
});
