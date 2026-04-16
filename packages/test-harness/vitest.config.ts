import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    // Replace the real `@oven/module-ai` barrel (which pulls in 30+
    // handler files and Next.js) with a narrow fake used only by e2e
    // tests. The fake exposes queue-based `aiEmbed` / `aiGenerateText`
    // so tests can steer responses deterministically.
    alias: {
      '@oven/module-ai': path.resolve(__dirname, 'src/__fixtures__/fake-module-ai.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['e2e/**/*.e2e.test.ts', 'src/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
