import { defineConfig } from 'vite';

// Model sweeps (435 designs) are CPU-heavy; allow slower CI runners.
export default defineConfig({ base: './', test: { testTimeout: 60000 } } as Parameters<typeof defineConfig>[0]);
