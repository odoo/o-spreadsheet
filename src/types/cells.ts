import { CompiledFormula, Range, Style, UID } from "./misc";

export enum CellValueType {
  boolean = "boolean",
  number = "number",
  text = "text",
  empty = "empty",
  error = "error",
}

export type CellValue = string | number | boolean;

export interface ICell {
  readonly id: UID;
  /**
   * Raw cell content
   */
  readonly content: string;
  /**
   * Evaluated cell content
   */
  readonly evaluated: CellEvaluation;
  /**
   * Cell value formatted based on the format
   */
  readonly formattedValue: string;
  readonly style?: Style;
  readonly format?: string;
  readonly defaultAlign: "right" | "center" | "left";
  /**
   * Return a copy of the cell with new display properties.
   */
  withDisplayProperties: (properties: CellDisplayProperties) => this;
}

export interface FormulaCell extends ICell {
  assignValue: (value: CellValue) => void;
  assignError: (value: string, errorMessage: string) => void;
  readonly normalizedText: string;
  readonly compiledFormula: CompiledFormula;
  readonly dependencies: Range[];
}

export type InvalidCell = ICell & {
  readonly evaluated: InvalidEvaluation;
};
export type NumberEvaluation = {
  readonly type: CellValueType.number;
  readonly value: number;
};

export type TextEvaluation = {
  readonly type: CellValueType.text;
  readonly value: string;
};

export type BooleanEvaluation = {
  readonly type: CellValueType.boolean;
  readonly value: boolean;
};

export type EmptyEvaluation = {
  readonly type: CellValueType.empty;
  readonly value: "";
};

export type InvalidEvaluation = {
  readonly type: CellValueType.error;
  readonly value: string;
  readonly error: string;
};

export type CellEvaluation =
  | NumberEvaluation
  | TextEvaluation
  | BooleanEvaluation
  | EmptyEvaluation
  | InvalidEvaluation;
export type Cell = ICell | FormulaCell;

export interface CellDisplayProperties {
  style?: Style;
  format?: string;
}
