import { defineConfig } from 'tsup'

export default defineConfig([
  // Node.js bundle (full features)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: ['crypto'],
    outDir: 'dist',
  },
  // Edge Runtime bundle (no audit logger)
  {
    entry: {
      edge: 'src/edge.ts',
    },
    format: ['esm'],
    dts: true,
    clean: false,
    external: ['crypto'],
    outDir: 'dist',
  },
])