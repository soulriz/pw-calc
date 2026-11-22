import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// mode "static": relative paths so the site works from any folder (https://<user>.github.io/<repo>/)
export default defineConfig(({ mode }) => ({
  base: mode === 'static' ? './' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5080' },
  },
  build: { outDir: 'dist' },
}));
