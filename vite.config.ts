import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Use relative base ('./') so all assets resolve correctly regardless of domain subpath,
  // whether on GitHub Pages (/EMBERFALL/), Cloud Run (/), or local preview.
  base: process.env.BASE_PATH || './',

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), '.'),
    },
  },

  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true'
      ? null
      : {},
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
