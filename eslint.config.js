// @ts-check

import tseslint from "typescript-eslint";

const fastMode = !!process.env.ESLINT_FAST;

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/build/**", "**/*.js"],
  },
  {
    ...tseslint.configs.base,
    files: ["**/*.ts"],
    languageOptions: {
      // @ts-ignore
      ...tseslint.configs.base.languageOptions,
      parserOptions: {
        // @ts-ignore
        ...tseslint.configs.base.languageOptions?.parserOptions,
        // `allowDefaultProject` covers files that are not included in any
        // tsconfig `include` glob and would otherwise be silently skipped:
        //   - global.d.ts: root-level declaration file, not part of any project
        //   - vitest.config.ts: vitest configuration file, not part of any project
        projectService: fastMode ? false : { allowDefaultProject: ["global.d.ts", "vitest.config.ts"] },
      },
    },
    rules: {
      "no-debugger": "error", // ban debugger
      "prefer-const": ["error", { destructuring: "all" }], // prefer const to let if no reassignment
      "no-unsafe-optional-chaining": "error", // ban unsafe optional chaining
      eqeqeq: "error", // ban non-strict equal
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error", // ban non-null assertion in optional chain
      ...(!fastMode && { "@typescript-eslint/consistent-type-exports": "error" }), // enforce consistent type exports
    },
  }
);
