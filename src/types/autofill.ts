/**
 * An AutofillModifier describe the possible operations to apply to the
 * content of a cell when we autofill this cell.
 *
 * It could be:
 *  - Increment: increment the content by a given step
 *  - Copy: simply copy the content
 *  - Formula: update the formula, with the same behaviour than paste
 */

import { CellData } from "./workbook_data";

export interface IncrementModifier {
  type: "INCREMENT_MODIFIER";
  increment: number;
  current: number;
}

export interface CopyModifier {
  type: "COPY_MODIFIER";
}

export interface FormulaModifier {
  type: "FORMULA_MODIFIER";
  increment: number;
  current: number;
}

export type AutofillModifier = IncrementModifier | CopyModifier | FormulaModifier;

export interface Tooltip {
  props: any;
  component?: any;
}

export interface AutofillResult {
  cellData: AutofillCellData;
  tooltip?: Tooltip;
}

export interface AutofillCellData extends CellData {
  col: number;
  row: number;
}
export interface GeneratorCell {
  data: AutofillCellData;
  rule?: AutofillModifier;
}
