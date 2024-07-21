// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    "@typescript-eslint/no-explicit-any": "off", // soyons pas plus catholiques que le pâpe
    "no-case-declarations": "off", // avoid having to wrap variable declaration in scrop in switch case statements
    "@typescript-eslint/ban-ts-comment": "error", // to discuss -> https://www.totaltypescript.com/concepts/how-to-use-ts-expect-error
    "@typescript-eslint/no-unused-vars": "error",
    // to discuss -> https://github.com/typescript-eslint/typescript-eslint/issues/4098
    // declaring method with the abstract class that throws might not be a good idea in itself?
    // That being said, really unused vars will be caught by typescrfipt itself so I think we can remove that rule
    "@typescript-eslint/no-non-null-asserted-optional-chain": "error", // to investigate, it probably is a mistake though
    "@typescript-eslint/ban-types": "error", // interesting read -> some types we choose are not bad but could be better chosen
    "@typescript-eslint/no-this-alias": "error", // we reuse a reserved word without reason (could use self)
    "@typescript-eslint/no-unnecessary-type-constraint": "error", // TODO
    "@typescript-eslint/no-unsafe-declaration-merging": "error", // TODO
  },
});
