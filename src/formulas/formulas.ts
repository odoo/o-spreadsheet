import { tokenize } from "./tokenizer";
import { toCartesian, numberToLetters } from "../helpers/index";
import { cellReference } from "./parser";

// -----------------------------------------------------------------------------
// Misc
// -----------------------------------------------------------------------------
export function applyOffset(
  formula: string,
  offsetX: number,
  offsetY: number,
  maxX: number,
  maxY: number
): string {
  const tokens = tokenize(formula);
  return tokens
    .map(t => {
      if (t.type === "SYMBOL" && cellReference.test(t.value)) {
        const xc = t.value.replace(/\$/g, "");
        let [x, y] = toCartesian(xc);
        const freezeCol = t.value.startsWith("$");
        const freezeRow = t.value.includes("$", 1);
        x += freezeCol ? 0 : offsetX;
        y += freezeRow ? 0 : offsetY;
        if (x < 0 || x >= maxX || y < 0 || y >= maxY) {
          return "#REF";
        }
        return (freezeCol ? "$" : "") + numberToLetters(x) + (freezeRow ? "$" : "") + String(y + 1);
      }
      return t.value;
    })
    .join("");
}
