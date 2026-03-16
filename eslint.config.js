// @ts-check

import tseslint from "typescript-eslint";

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
        //   - engine tests: packages/o-spreadsheet-engine/tsconfig.json only
        //     includes `src/`, so its tests/ directory has no owning project
        //     (unlike the main tests/ folder which has its own tsconfig.json).
        projectService: {
          allowDefaultProject: ["global.d.ts", "packages/o-spreadsheet-engine/tests/*.ts"],
        },
      },
    },
    rules: {
      "no-debugger": "error", // ban debugger
      "prefer-const": ["error", { destructuring: "all" }], // prefer const to let if no reassignment
      "no-unsafe-optional-chaining": "error", // ban unsafe optional chaining
      eqeqeq: "error", // ban non-strict equal
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error", // ban non-null assertion in optional chain
      curly: ["error", "all"], // enforce curly braces for all control statements
      "@typescript-eslint/no-floating-promises": "error", // ban unawaited promises
    },
  }
);
