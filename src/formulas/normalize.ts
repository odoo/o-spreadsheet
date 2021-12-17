import { parseNumber } from "../helpers/numbers";
import { Dependencies, NormalizedFormula } from "../types";
import { cellReference } from "./parser";
import { rangeTokenize } from "./range_tokenizer";
import { FORMULA_REF_IDENTIFIER } from "./tokenizer";

/**
 * parses a formula (as a string) into the same formula,
 * but with the references to other cells as well as strings and numbers extracted
 *
 * =sum(a3:b1) + c3 --> =sum(|0|) + |1|
 *
 * = sum(a3, 5) --> =sum(|0|, |N1|)
 *
 * =CONCAT(CONCAT(1, "beta"), A1) --> =CONCAT(CONCAT(|N0|, |S1|), |2|)
 *
 * Strings and Numbers are marked with a prefix of their type (S and N) to be detected
 * as their normalized form by the parser as they won't be processed like the references by the compiler.
 *
 * @param formula
 */
export function normalize(formula: string): NormalizedFormula {
  const tokens = rangeTokenize(formula);

  let references: Dependencies = [];

  let noRefFormula = "".concat(
    ...tokens.map<string>((token) => {
      if (token.type === "SYMBOL" && cellReference.test(token.value)) {
        const value = token.value.trim();
        if (!references.includes(value)) {
          references.push(value);
        }
        return `${FORMULA_REF_IDENTIFIER}${references.indexOf(value)}${FORMULA_REF_IDENTIFIER}`;
      } else if (["STRING", "NUMBER"].includes(token.type)) {
        const value =
          token.type === "STRING"
            ? token.value.slice(1).slice(0, token.value.length - 2)
            : parseNumber(token.value);
        if (!references.includes(value)) {
          references.push(value);
        }
        return `${FORMULA_REF_IDENTIFIER}${token.type[0]}${references.indexOf(
          value
        )}${FORMULA_REF_IDENTIFIER}`;
      } else {
        return token.value;
      }
    })
  );
  return { text: noRefFormula, dependencies: references };
}
