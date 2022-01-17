import { FORMULA_REF_IDENTIFIER } from "../constants";
import { cellReference } from "../helpers";
import { parseNumber } from "../helpers/numbers";
import { Dependencies, NormalizedFormula } from "../types";
import { rangeTokenize } from "./range_tokenizer";
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

  let dependencies: Dependencies = {
    numbers: [],
    strings: [],
    references: [],
  };

  let noRefFormula = "".concat(
    ...tokens.map<string>((token) => {
      if (token.type === "SYMBOL" && cellReference.test(token.value)) {
        const value = token.value.trim();
        if (!dependencies.references.includes(value)) {
          dependencies.references.push(value);
        }
        const index = dependencies.references.indexOf(value).toString();
        return formatIndex(index);
      } else if ("STRING" === token.type) {
        const value = token.value.slice(1).slice(0, token.value.length - 2);
        if (!dependencies.strings.includes(value)) {
          dependencies.strings.push(value);
        }
        const index = dependencies.strings.indexOf(value);
        return formatIndex(`${token.type[0]}${index}`);
      } else if (token.type === "NUMBER") {
        const value = parseNumber(token.value);
        if (!dependencies.numbers.includes(value)) {
          dependencies.numbers.push(value);
        }
        const index = dependencies.numbers.indexOf(value);
        return formatIndex(`${token.type[0]}${index}`);
      } else {
        return token.value;
      }
    })
  );
  return { text: noRefFormula, dependencies };
}

/**
 * Enclose an index between normalization identifiers
 */
function formatIndex(index: string) {
  return `${FORMULA_REF_IDENTIFIER}${index}${FORMULA_REF_IDENTIFIER}`;
}
