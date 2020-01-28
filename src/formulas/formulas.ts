import { tokenize } from "./tokenizer";
import { toCartesian, toXC } from "../helpers";
import { cellReference } from "./parser";

// -----------------------------------------------------------------------------
// Misc
// -----------------------------------------------------------------------------
export function applyOffset(formula: string, offsetX: number, offsetY: number): string {
  let tokens = tokenize(formula);
  tokens = tokens.map(t => {
    if (t.type === "SYMBOL" && cellReference.test(t.value)) {
      const [x, y] = toCartesian(t.value);
      if (x + offsetX < 0 || y + offsetY < 0) {
        return "#REF";
      }
      t.value = toXC(x + offsetX, y + offsetY);
    }
    return t.value;
  });
  return tokens.join("");
}
