import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@ai-sdr/contracts': fileURLToPath(
        new URL('../../packages/contracts/src/index.ts', import.meta.url),
      ),
      '@ai-sdr/database': fileURLToPath(
        new URL('../../packages/database/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://ai_sdr:ai_sdr_dev@localhost:54329/ai_sdr_test_api?schema=public',
      INTERNAL_API_KEY: 'integration-test-internal-key-0001',
    },
    hookTimeout: 30000,
    testTimeout: 30000,
    fileParallelism: false,
  },
});
