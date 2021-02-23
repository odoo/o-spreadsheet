/**
 * An AutofillModifier describe the possible operations to apply to the
 * content of a cell when we autofill this cell.
 *
 * It could be:
 *  - Increment: increment the content by a given step
 *  - Copy: simply copy the content
 *  - Formula: update the formula, with the same behavior than paste
 */

import { Border, Range, Style } from "./misc";

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

export interface AutofillCellData {
  col: number;
  row: number;
  formula?: {
    text: string;
    dependencies: Range[];
  };
  content?: string;
  format?: string;
  border?: Border;
  style?: Style | null;
}
export interface GeneratorCell {
  data: AutofillCellData;
  rule?: AutofillModifier;
}
