import { UID } from "../..";
import { rangeTokenize } from "../../formulas";
import { Getters } from "../../types/getters";

export function adaptFormulaToSheet(
  getters: Getters,
  formula: string,
  toSheetId: UID,
  fromSheetId?: UID
) {
  return rangeTokenize(formula)
    .map((token) => {
      if (token.type === "REFERENCE") {
        const range = getters.getRangeFromSheetXC(
          fromSheetId ?? getters.getActiveSheetId(),
          token.value
        );
        return getters.getRangeString(range, toSheetId);
      }
      return token.value;
    })
    .join("");
}
