import { EvaluationError } from "./errors";
import { Format, FormattedValue } from "./format";
import { CompiledFormula, Link, Style, UID } from "./misc";
import { Range } from "./range";

interface CellData {
  readonly id: UID;
  /**
   * Raw cell content
   */
  readonly content: string;
  readonly style?: Style;
  readonly format?: Format;
}

interface ConstantCellData extends CellData {
  readonly contentType: "constantValue";
  readonly isFormula: false;
  readonly isValidFormula: false;
}

export interface FormulaCellData extends CellData {
  readonly contentType: "validFormula";
  readonly isFormula: true;
  readonly isValidFormula: true;
  readonly compiledFormula: CompiledFormula;
  readonly dependencies: Range[];
}

export interface InvalidFormulaCellData extends CellData {
  readonly contentType: "invalidFormula";
  readonly isFormula: true;
  readonly isValidFormula: false;
  readonly error: Error;
}

export type StaticCellData = ConstantCellData | FormulaCellData | InvalidFormulaCellData;

interface CellProperties {
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
  readonly evaluated: EvaluationResult;
  /**
   * Cell value formatted based on the format
   */
  readonly formattedValue: FormattedValue;
  readonly style?: Style;
  readonly format?: Format;
  readonly defaultAlign: "right" | "center" | "left";
  readonly link?: Link;
  /**
   * Can the cell appear in an automatic sum zone.
   */
  readonly isAutoSummable: boolean;
  isEmpty(): boolean;
  isFormula: boolean;
  readonly isValidFormula: boolean;
}

interface ConstantCell extends CellProperties {
  readonly isValidFormula: false;
}

export interface ValidFormulaCell extends CellProperties {
  readonly isValidFormula: true;
  readonly dependencies: Range[];
  readonly compiledFormula: CompiledFormula;
}

export type Cell = ConstantCell | ValidFormulaCell;

interface EvaluationResultProperties {
  /**
   * Cell content displayed in the composer. It defaults to the cell content
   * for most cell types.
   */
  readonly composerContent: string;
  /**
   * Cell value formatted based on the format
   */
  readonly formattedValue: FormattedValue;
  readonly defaultAlign: "right" | "center" | "left";
  /**
   * Can the cell appear in an automatic sum zone.
   */
  readonly isAutoSummable: boolean;
}

export type CellValue = string | number | boolean;

export type EvaluationResult =
  | NumberEvaluation
  | TextEvaluation
  | BooleanEvaluation
  | EmptyEvaluation
  | InvalidEvaluation;

export interface NumberEvaluation extends EvaluationResultProperties {
  readonly type: CellValueType.number;
  readonly value: number;
  readonly format?: Format;
}

export interface TextEvaluation extends EvaluationResultProperties {
  readonly type: CellValueType.text;
  readonly value: string;
  readonly format?: Format;
}

export interface BooleanEvaluation extends EvaluationResultProperties {
  readonly type: CellValueType.boolean;
  readonly value: boolean;
  readonly format?: Format;
}

export interface EmptyEvaluation extends EvaluationResultProperties {
  readonly type: CellValueType.empty;
  readonly value: "";
  readonly format?: Format;
}

export interface InvalidEvaluation extends EvaluationResultProperties {
  readonly type: CellValueType.error;
  readonly value: string;
  readonly error: EvaluationError;
  readonly format?: Format;
}

export enum CellValueType {
  boolean = "boolean",
  number = "number",
  text = "text",
  empty = "empty",
  error = "error",
}
