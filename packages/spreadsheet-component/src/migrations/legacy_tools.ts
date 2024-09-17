import { FORMULA_REF_IDENTIFIER } from "../constants";
import { rangeTokenize } from "../formulas/range_tokenizer";
import { cellReference } from "../helpers";

type LegacyNormalizedFormula = {
  // if the content is a formula (ex. =sum(  a1:b3, 3) + a1, should be stored as
  // {formula: "=sum(  |ref1|, |ref2|) + |ref3|"), ["a1:b3","a1"]
  // This normalization applies to range references, numbers and string values
  text: string;
  dependencies: string[];
  value?: any;
};
/**
 * parses a formula (as a string) into the same formula,
 * but with the references to other cells extracted
 *
 * =sum(a3:b1) + c3 --> =sum(|0|) + |1|
 *
 * @param formula
 */
export function normalizeV9(formula: string): LegacyNormalizedFormula {
  const tokens = rangeTokenize(formula);

  let dependencies: string[] = [];

  let noRefFormula = "".concat(
    ...tokens.map<string>((token) => {
      if (token.type === "REFERENCE" && cellReference.test(token.value)) {
        const value = token.value.trim();
        if (!dependencies.includes(value)) {
          dependencies.push(value);
        }
        return `${FORMULA_REF_IDENTIFIER}${dependencies.indexOf(value)}${FORMULA_REF_IDENTIFIER}`;
      } else {
        return token.value;
      }
    })
  );
  return { text: noRefFormula, dependencies };
}
