import { EvaluationError } from "./errors";
import { Format, FormattedValue } from "./format";
import { CompiledFormula, ReturnValue, Style, UID } from "./misc";
import { Range } from "./range";

export type Cell = ICell | FormulaCell;
export interface ICell {
  readonly id: UID;
  /**
   * Raw cell content
   */
  readonly content: string;
  /**
   * Cell content displayed in the composer. It defaults to the cell content
   * for most cell types.
   */
  readonly composerContent: string;
  /**
   * Evaluated cell content
   */
  readonly evaluated: CellEvaluation;
  readonly url?: string;
  /**
   * Cell value formatted based on the format
   */
  readonly formattedValue: FormattedValue;
  readonly style?: Style;
  readonly format?: Format;
  readonly defaultAlign: "right" | "center" | "left";
  /**
   * Can the cell appear in an automatic sum zone.
   */
  readonly isAutoSummable: boolean;
  isFormula(): this is FormulaCell;
  isEmpty(): boolean;
}

export interface FormulaCell extends ICell {
  assignEvaluation: (value: ReturnValue, format?: Format) => void;
  assignError: (value: string, error: EvaluationError) => void;
  readonly compiledFormula: CompiledFormula;
  readonly dependencies: Range[];
}

export type CellValue = string | number | boolean;

export interface CellDisplayProperties {
  style?: Style;
  format?: Format;
}

export type CellEvaluation =
  | NumberEvaluation
  | TextEvaluation
  | BooleanEvaluation
  | EmptyEvaluation
  | InvalidEvaluation;

export type NumberEvaluation = {
  readonly type: CellValueType.number;
  readonly value: number;
  readonly format?: Format;
};

export type TextEvaluation = {
  readonly type: CellValueType.text;
  readonly value: string;
  readonly format?: Format;
};

export type BooleanEvaluation = {
  readonly type: CellValueType.boolean;
  readonly value: boolean;
  readonly format?: Format;
};

export type EmptyEvaluation = {
  readonly type: CellValueType.empty;
  readonly value: "";
  readonly format?: Format;
};

export type InvalidEvaluation = {
  readonly type: CellValueType.error;
  readonly value: string;
  readonly error: EvaluationError;
  readonly format?: Format;
};

export enum CellValueType {
  boolean = "boolean",
  number = "number",
  text = "text",
  empty = "empty",
  error = "error",
}
