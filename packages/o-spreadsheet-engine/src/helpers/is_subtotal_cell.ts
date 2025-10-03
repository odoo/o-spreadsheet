import { Cell } from "../types/cells";

export function isSubtotalCell(cell: Cell): boolean {
  return (
    cell.isFormula &&
    cell.compiledFormula.tokens.some(
      (t) => t.type === "SYMBOL" && t.value.toUpperCase() === "SUBTOTAL"
    )
  );
}
