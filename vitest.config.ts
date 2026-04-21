import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    globalSetup: "tests/setup/vitest_global_setup.ts",
    setupFiles: ["tests/setup/canvas.mock.ts", "tests/setup/vitest_extend.ts"],
    deps: {
      moduleDirectories: ["node_modules", path.resolve(__dirname, "tests/__mocks__")],
    },
  },
});
