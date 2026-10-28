import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any static host or sub-folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  // Shown in Settings so you can confirm which version is installed
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
  build: { target: 'es2019', chunkSizeWarningLimit: 1200 },
});
