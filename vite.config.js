import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets/build',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/@tanstack')) return 'vendor-query';
          if (id.includes('node_modules/zustand')) return 'vendor-state';
          if (id.includes('/src/pages/')) return 'pages';
          if (id.includes('/src/react/tasks/')) return 'feature-tasks';
          if (id.includes('/src/react/timeline/')) return 'feature-timeline';
          if (id.includes('/src/react/materials/')) return 'feature-materials';
          if (id.includes('/src/react/chat/')) return 'feature-chat';
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
});
