import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Force a single React instance across every package.
    // Packages like framer-motion v12 and @tanstack/react-virtual can
    // accidentally pull in their own React copy when pre-bundled, causing
    // "Invalid hook call" / "Cannot read properties of null (reading 'useState')".
    dedupe: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'framer-motion',
      '@tanstack/react-query',
      '@tanstack/react-virtual',
    ],
  },
  optimizeDeps: {
    // Pre-bundle every package that uses React hooks so Vite merges them
    // into one shared chunk instead of letting each keep its own React.
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-virtual',
      '@tanstack/react-query',
      'framer-motion',
      'react-router-dom',
      'zustand',
      'sonner',
    ],
    // Force re-bundling on every dev-server start so a stale cache can
    // never re-introduce the duplicate-React bug.
    force: true,
  },
  build: {
    // Raise the chunk-size warning limit (framer-motion + vendor chunks are
    // intentionally large; they are code-split and cached independently).
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // NOTE: React (react, react-dom, react/jsx-runtime) is intentionally
        // NOT listed here. react-dom accesses React.__SECRET_INTERNALS at
        // module evaluation time; placing them in a manualChunk causes Rollup
        // to emit them in an order where react-dom evaluates before react,
        // crashing the app with "Cannot read properties of undefined
        // (reading '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED')".
        // Rollup's natural chunking + resolve.dedupe above guarantees a
        // single React copy with the correct evaluation order.
        manualChunks: {
          // UI animation library
          'vendor-framer': ['framer-motion'],
          // Data-fetching & routing
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-virtual'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
