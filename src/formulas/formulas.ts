import { tokenize } from "./tokenizer";
import { toCartesian, numberToLetters } from "../helpers/index";
import { cellReference } from "./parser";
import { Getters } from "../types";

// -----------------------------------------------------------------------------
// Misc
// -----------------------------------------------------------------------------
export function applyOffset(
  formula: string,
  offsetX: number,
  offsetY: number,
  getters: Getters
): string {
  const tokens = tokenize(formula);
  return tokens
    .map((t) => {
      if (t.type === "SYMBOL" && cellReference.test(t.value)) {
        const [xc, sheetRef] = t.value.replace(/\$/g, "").split("!").reverse();
        let sheetId: string;
        if (sheetRef) {
          const sheet = getters.getSheets().find((sheet) => sheet.name === sheetRef);
          if (!sheet) {
            return "#REF";
          }
          sheetId = sheet.id;
        } else {
          sheetId = getters.getActiveSheet();
        }
        let [x, y] = toCartesian(xc);
        const freezeCol = t.value.startsWith("$");
        const freezeRow = t.value.includes("$", 1);
        x += freezeCol ? 0 : offsetX;
        y += freezeRow ? 0 : offsetY;
        if (
          x < 0 ||
          x >= getters.getNumberCols(sheetId) ||
          y < 0 ||
          y >= getters.getNumberRows(sheetId)
        ) {
          return "#REF";
        }
        return (
          (sheetRef ? `${sheetRef}!` : "") +
          (freezeCol ? "$" : "") +
          numberToLetters(x) +
          (freezeRow ? "$" : "") +
          String(y + 1)
        );
      }
      return t.value;
    })
    .join("");
}
