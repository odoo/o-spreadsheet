import { Getters, UID } from "../..";
import { rangeTokenize } from "../../formulas/range_tokenizer";

/*
 * Adapt string `formula` representation on `fromSheetId`
 * to ensure they are correctly represented on `toSheetId`.
 */
export function adaptFormulaToSheet(
  getters: Getters,
  formula: string,
  toSheetId: UID,
  fromSheetId: UID
) {
  return rangeTokenize(formula)
    .map((token) => {
      if (token.type === "REFERENCE") {
        const range = getters.getRangeFromSheetXC(fromSheetId, token.value);
        return getters.getRangeString(range, toSheetId);
      }
      return token.value;
    })
    .join("");
}
