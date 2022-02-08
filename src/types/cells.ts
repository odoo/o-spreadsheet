import { SpreadsheetChildEnv } from "./env";
import { Format, FormattedValue } from "./format";
import { CompiledFormula, Link, Range, Style, UID } from "./misc";

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
   * Cell content displayed in the composer. It defaults to the cell content
   * for most cell types.
   */
  readonly composerContent: string;
  /**
   * Evaluated cell content
   */
  readonly evaluated: CellEvaluation;
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
  /**
   * Return a copy of the cell with new display properties.
   */
  withDisplayProperties: (properties: CellDisplayProperties) => this;
  isFormula(): this is FormulaCell;
  isLink(): this is LinkCell;
  isEmpty(): boolean;
}

export interface FormulaCell extends ICell {
  assignValue: (value: CellValue) => void;
  assignError: (value: string, errorMessage: string) => void;
  startEvaluation: () => void;
  readonly normalizedText: string;
  readonly compiledFormula: CompiledFormula;
  readonly dependencies: Range[];
}

/**
 * A cell that can redirect to a given location which is
 * specified in a link.
 */
export interface LinkCell extends ICell {
  readonly link: Link;
  /**
   * Go to the link destination
   */
  readonly action: (env: SpreadsheetChildEnv) => void;
  /**
   * String used to display the URL in components.
   * Particularly useful for special links (sheet, etc.)
   * - a simple web link displays the raw url
   * - a link to a sheet displays the sheet name
   */
  readonly urlRepresentation: string;
  /**
   * Specifies if the URL is editable by the end user.
   * Special links might not allow it.
   */
  readonly isUrlEditable: boolean;
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
  format?: Format;
}
