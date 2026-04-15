import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.{test,spec}.ts"],
    globalSetup: "tests/setup/vitest_global_setup.ts",
    setupFiles: ["tests/setup/vitest.setup.ts"],
    pool: "forks",
  },
});
