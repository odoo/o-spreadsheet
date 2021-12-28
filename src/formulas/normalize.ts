import { rangeReference } from "../helpers";
import { NormalizedFormula } from "../types";
import { rangeTokenize } from "./range_tokenizer";
import { FORMULA_REF_IDENTIFIER } from "./tokenizer";

/**
 * parses a formula (as a string) into the same formula,
 * but with the references to other cells extracted
 *
 * =sum(a3:b1) + c3 --> =sum(|0|) + |1|
 *
 * @param formula
 */
export function normalize(formula: string): NormalizedFormula {
  const tokens = rangeTokenize(formula);

  let references: string[] = [];

  let noRefFormula = "".concat(
    ...tokens.map<string>((token) => {
      if (token.type === "SYMBOL" && rangeReference.test(token.value)) {
        const value = token.value.trim();
        if (!references.includes(value)) {
          references.push(value);
        }
        return `${FORMULA_REF_IDENTIFIER}${references.indexOf(value)}${FORMULA_REF_IDENTIFIER}`;
      } else {
        return token.value;
      }
    })
  );
  return { text: noRefFormula, dependencies: references };
}
