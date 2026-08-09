import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/server-integration',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'server-local-supabase',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.spec.ts'],
    reporters: ['default'],
  },
});
