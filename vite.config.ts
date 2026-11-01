import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

type LogRow = [hash: string, author: string, date: string, subject: string];

/**
 * The site's own recent history for the terminal's `git log`. Cloudflare may clone with a shallow
 * history, so with fewer than 8 commits available it falls back to a committed snapshot
 * (src/assets/gitlog.fallback.json, refreshed with `npm run gitlog`).
 */
function readGitLog(): LogRow[] {
  try {
    const out = execSync('git log -n 15 --pretty=format:%h%x09%an%x09%ad%x09%s --date=short', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const rows = out.split('\n').filter(Boolean).map((line) => line.split('\t') as LogRow);
    if (rows.length >= 8) return rows;
  } catch {
    /* no git here (a source copy, or git is missing) */
  }
  try {
    return JSON.parse(readFileSync(resolve(__dirname, 'src/assets/gitlog.fallback.json'), 'utf8')) as LogRow[];
  } catch {
    return [];
  }
}

// New portfolio Vite configuration
export default defineConfig({
  plugins: [
    react(),

    // Bundle size visualization. Opt-in (ANALYZE=true npm run build:new) because the report
    // is written to dist/ and would otherwise be deployed with the site.
    process.env.ANALYZE === 'true' &&
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
    // Source maps are not used in production and would be published with the site (~2 MB)
    sourcemap: false,
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

  define: {
    __GIT_LOG__: JSON.stringify(readGitLog()),
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
