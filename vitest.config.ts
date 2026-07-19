import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // packet-0006의 15초 AbortController 타임아웃 테스트가 실제 wall-clock 지연을 사용 — 기본 5s보다 여유 필요.
    testTimeout: 20000,
    // Playwright 비주얼 스펙은 e2e/에 있다 — vitest 실행에서 제외(기본 제외 + e2e).
    // scripts/__tests__는 node:test 러너 기반 스펙(node --test)이라 vitest 대상에서 제외.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'scripts/**'],
  },
});
