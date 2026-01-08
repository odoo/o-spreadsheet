// @ts-check

import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/build/**", "**/*.js"],
  },
  {
    ...tseslint.configs.base,
    files: ["**/*.ts"],
    rules: {
      "no-debugger": "error", // ban debugger
      "prefer-const": ["error", { destructuring: "all" }], // prefer const to let if no reassignment
      "no-unsafe-optional-chaining": "error", // ban unsafe optional chaining
      eqeqeq: "error", // ban non-strict equal
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error", // ban non-null assertion in optional chain
      curly: ["error", "all"], // enforce curly braces for all control statements
    },
  }
);
