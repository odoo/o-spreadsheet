import { Format, FormattedValue } from "./format";
import { Link, RangeCompiledFormula, Style, UID } from "./misc";

interface CellAttributes {
  readonly id: UID;
  /**
   * Raw cell content
   */
  readonly content: string;
  readonly style?: Style;
  readonly format?: Format;
}

export interface LiteralCell extends CellAttributes {
  readonly isFormula: false;
}

export interface FormulaCell extends CellAttributes {
  readonly isFormula: true;
  readonly compiledFormula: RangeCompiledFormula;
}

export type Cell = LiteralCell | FormulaCell;

interface EvaluatedCellProperties {
  readonly format?: Format;
  /**
   * Cell value formatted based on the format
   */
  readonly formattedValue: FormattedValue;
  readonly defaultAlign: "right" | "center" | "left";
  /**
   * Can the cell appear in an automatic sum zone.
   */
  readonly isAutoSummable: boolean;
  readonly link?: Link;
}

export type CellValue = string | number | boolean | null; // We use null to represent an empty cell. This choice is preferred over using undefined because when passing values to a JavaScript function, undefined may be replaced by a default value.

export type EvaluatedCell = NumberCell | TextCell | BooleanCell | EmptyCell | ErrorCell;

export interface NumberCell extends EvaluatedCellProperties {
  readonly type: CellValueType.number;
  readonly value: number;
}

export interface TextCell extends EvaluatedCellProperties {
  readonly type: CellValueType.text;
  readonly value: string;
}

export interface BooleanCell extends EvaluatedCellProperties {
  readonly type: CellValueType.boolean;
  readonly value: boolean;
}

export interface EmptyCell extends EvaluatedCellProperties {
  readonly type: CellValueType.empty;
  readonly value: "";
}

export interface ErrorCell extends EvaluatedCellProperties {
  readonly type: CellValueType.error;
  readonly value: string;
  readonly message?: string;
}

export enum CellValueType {
  boolean = "boolean",
  number = "number",
  text = "text",
  empty = "empty",
  error = "error",
}
