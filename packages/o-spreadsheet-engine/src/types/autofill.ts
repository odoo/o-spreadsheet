/**
 * An AutofillModifier describe the possible operations to apply to the
 * content of a cell when we autofill this cell.
 *
 * It could be:
 *  - Increment: increment the content by a given step
 *  - Copy: simply copy the content
 *  - Formula: update the formula, with the same behavior than paste
 */

import { Cell } from "./cells";
import { Format } from "./format";
import { Getters } from "./getters";
import { Border, DIRECTION, RangeCompiledFormula, Style, UID, UpdateCellData } from "./misc";

export interface IncrementModifier {
  type: "INCREMENT_MODIFIER";
  increment: number;
  current: number;
}

export interface AlphanumericIncrementModifier {
  type: "ALPHANUMERIC_INCREMENT_MODIFIER";
  increment: number;
  current: number;
  prefix: string;
  numberPostfixLength: number; // the length of the number post fix string, e.g. "0001" is four but "1" is one
}

export interface DateIncrementModifier {
  type: "DATE_INCREMENT_MODIFIER";
  current: number;
  increment: {
    years: number;
    months: number;
    days: number;
  };
}

export interface CopyModifier {
  type: "COPY_MODIFIER";
}

export interface FormulaModifier {
  type: "FORMULA_MODIFIER";
  increment: number;
  current: number;
}

export type AutofillModifier =
  | IncrementModifier
  | AlphanumericIncrementModifier
  | CopyModifier
  | FormulaModifier
  | DateIncrementModifier;

export interface Tooltip {
  props: any;
  component?: any;
}

export interface AutofillCellData extends UpdateCellData {
  border?: Border;
}

export interface AutofillData {
  formula?: RangeCompiledFormula;
  content?: string;
  cell?: Cell;
  col: number;
  row: number;
  sheetId: UID;
  border?: Border;
  style?: Style;
  format?: Format;
}

export interface AutofillResult {
  cellData: AutofillCellData;
  tooltip?: Tooltip;
  origin: {
    col: number;
    row: number;
  };
}
export interface GeneratorCell {
  data: AutofillData;
  rule: AutofillModifier;
}

export interface AutofillModifierImplementation {
  apply: (
    rule: AutofillModifier,
    data: AutofillData,
    getters: Getters,
    direction: DIRECTION
  ) => Omit<AutofillResult, "origin">;
}
