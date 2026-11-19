import { defineConfig } from 'vite';

// Relative base so the build works from any folder (itch.io serves it from a sub-path).
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
