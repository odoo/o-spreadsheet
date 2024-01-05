import { isEvaluationError } from "../functions/helpers";
import { isDateTimeFormat } from "../helpers";
import { Format, FormattedValue } from "./format";
import { FPayload, Link, RangeCompiledFormula, Style, UID } from "./misc";

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

export enum CellValueType {
  boolean = "boolean",
  number = "number",
  text = "text",
  empty = "empty",
  error = "error",
}
interface EvaluatedCellProperties {
  readonly type: CellValueType;
  readonly isAutoSummable: boolean;
  readonly defaultAlign: "right" | "center" | "left";
}

export type CellValue = string | number | boolean | null; // We use null to represent an empty cell. This choice is preferred over using undefined because when passing values to a JavaScript function, undefined may be replaced by a default value.

export interface EvaluatedCell extends FPayload, EvaluatedCellProperties {
  /**
   * Cell value formatted based on the format
   */
  readonly formattedValue: FormattedValue;
  /**
   * Can the cell appear in an automatic sum zone.
   */
  readonly link?: Link;
}

export function getEvaluatedCellProperties({ value, format }: FPayload): EvaluatedCellProperties {
  if (value === null) {
    return EMPTY_CELL_PROPERTIES;
  }
  if (isEvaluationError(value)) {
    return ERROR_CELL_PROPERTIES;
  }
  if (typeof value === "number") {
    if (isDateTimeFormat(format || "")) {
      return DATE_TIME_CELL_PROPERTIES;
    }
    return NUMBER_CELL_PROPERTIES;
  }
  if (typeof value === "boolean") {
    return BOOLEAN_CELL_PROPERTIES;
  }
  return TEXT_CELL_PROPERTIES;
}

const TEXT_CELL_PROPERTIES: EvaluatedCellProperties = {
  type: CellValueType.text,
  isAutoSummable: true,
  defaultAlign: "left",
};

const NUMBER_CELL_PROPERTIES: EvaluatedCellProperties = {
  type: CellValueType.number,
  isAutoSummable: true,
  defaultAlign: "right",
};

const EMPTY_CELL_PROPERTIES: EvaluatedCellProperties = {
  type: CellValueType.empty,
  isAutoSummable: true,
  defaultAlign: "left",
};

const DATE_TIME_CELL_PROPERTIES: EvaluatedCellProperties = {
  type: CellValueType.number,
  isAutoSummable: false,
  defaultAlign: "right",
};

const BOOLEAN_CELL_PROPERTIES: EvaluatedCellProperties = {
  type: CellValueType.boolean,
  isAutoSummable: false,
  defaultAlign: "center",
};

const ERROR_CELL_PROPERTIES: EvaluatedCellProperties = {
  type: CellValueType.error,
  isAutoSummable: false,
  defaultAlign: "center",
};
