import { defineConfig } from 'tsup'

export default defineConfig([
  // Node.js bundle (full features)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: ['@sentry/nextjs', '@opentelemetry/api'],
    outDir: 'dist',
  },
  // Edge Runtime bundle (lightweight, no Node.js dependencies)
  {
    entry: {
      edge: 'src/edge-logger.ts',
    },
    format: ['esm'],
    dts: true,
    clean: false,
    outDir: 'dist',
    noExternal: [],
  },
  // Browser/Client bundle (for React client components)
  {
    entry: {
      client: 'src/client-logger.ts',
    },
    format: ['esm'],
    dts: true,
    clean: false,
    outDir: 'dist',
    external: ['@sentry/nextjs'],
  },
])