import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

// New portfolio Vite configuration
export default defineConfig({
  plugins: [
    react(),

    // Bundle size visualization (optional, can be disabled in CI)
    visualizer({
      open: false,
      filename: 'dist/bundle-stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // sunburst, treemap, network
    }),
  ],

  build: {
    target: 'es2020',
    sourcemap: true,
    minify: 'terser',

    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: {
          // Vendor chunks - rarely change
          'vendor-react': ['react', 'react-dom'],
          'vendor-state': ['zustand', 'immer'],
          'vendor-storage': ['idb', 'uuid'],

          // These will be lazy-loaded per app
          // 'app-pdf': ['pdfjs-dist'],  // Future
          // 'app-markdown': ['marked', 'dompurify'],  // Future
        },

        // Chunk file naming with content hash
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // Performance budgets (warnings only)
    chunkSizeWarningLimit: 500, // KB
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@os': resolve(__dirname, './src/os'),
      '@ui': resolve(__dirname, './src/ui'),
      '@apps': resolve(__dirname, './src/apps'),
    },
  },

  server: {
    port: 5173,
    host: true, // Listen on all addresses
    open: true, // Auto-open browser
  },

  preview: {
    port: 4173,
    host: true,
  },
});
