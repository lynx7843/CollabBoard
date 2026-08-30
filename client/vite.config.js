import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Production has no dev server: the equivalent rewrite lives in
      // vercel.json, so /api stays a relative path in both.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    // jsdom for the component tests; the pure ones (reducer, queue replay) do
    // not need it and do not pay for it beyond the environment setup.
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // Explicit imports from 'vitest' instead, so no test globals have to be
    // declared to ESLint and a test file reads like any other module.
    globals: false,
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/demo/**', 'src/test/**'],
    },
  },
})
