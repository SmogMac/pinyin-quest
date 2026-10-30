import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fxEditor from './tools/fx-editor-plugin.mjs';

// Relative base so the build works from any static host or sub-folder.
// The FX Studio (editor.html) and its endpoints only exist on the dev server; the build ships the
// game alone (index.html).
export default defineConfig({
  base: './',
  plugins: [react(), fxEditor()],
  // Shown in Settings so you can confirm which version is installed
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
  build: { target: 'es2019', chunkSizeWarningLimit: 1200 },
});
