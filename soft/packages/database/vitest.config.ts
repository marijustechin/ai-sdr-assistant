import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://ai_sdr:ai_sdr_dev@localhost:54329/ai_sdr_test?schema=public',
    },
    hookTimeout: 60000,
    testTimeout: 30000,
    fileParallelism: false,
  },
});
