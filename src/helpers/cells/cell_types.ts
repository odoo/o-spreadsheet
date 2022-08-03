import { DATETIME_FORMAT, LOADING } from "../../constants";
import {
  BooleanEvaluation,
  CellDisplayProperties,
  CellEvaluation,
  CellValue,
  CellValueType,
  CompiledFormula,
  EmptyEvaluation,
  Format,
  FormulaCell as IFormulaCell,
  ICell,
  InvalidEvaluation,
  NumberEvaluation,
  Range,
  Style,
  TextEvaluation,
  UID,
} from "../../types";
import { CellErrorType, EvaluationError } from "../../types/errors";
import { formatValue } from "../format";
/**
 * Abstract base implementation of a cell.
 * Concrete cell classes are responsible to build the raw cell `content` based on
 * whatever data they have (formula, string, ...).
 */
abstract class AbstractCell<T extends CellEvaluation = CellEvaluation> implements ICell {
  readonly style?: Style;
  readonly format?: Format;
  abstract content: string;
  public evaluated: T;
  readonly url?: string;

  constructor(readonly id: UID, evaluated: T, properties: CellDisplayProperties, url?: string) {
    this.style = properties.style;
    this.format = properties.format;
    this.evaluated = { ...evaluated, format: evaluated.format || properties.format };
    this.url = url;
  }
  isFormula(): this is IFormulaCell {
    return false;
  }

  isEmpty(): boolean {
    return false;
  }

  get formattedValue() {
    return formatValue(this.evaluated.value, this.evaluated.format);
  }

  get composerContent() {
    return this.content;
  }

  get defaultAlign() {
    switch (this.evaluated.type) {
      case CellValueType.number:
      case CellValueType.empty:
        return "right";
      case CellValueType.boolean:
      case CellValueType.error:
        return "center";
      case CellValueType.text:
        return "left";
    }
  }

  /**
   * Only empty cells, text cells and numbers are valid
   */
  get isAutoSummable() {
    switch (this.evaluated.type) {
      case CellValueType.empty:
      case CellValueType.text:
        return true;
      case CellValueType.number:
        return !this.format?.match(DATETIME_FORMAT);
      case CellValueType.error:
      case CellValueType.boolean:
        return false;
    }
  }
}

export class EmptyCell extends AbstractCell<EmptyEvaluation> {
  readonly content = "";
  constructor(id: UID, properties: CellDisplayProperties = {}, url?: string) {
    super(id, { value: "", type: CellValueType.empty }, properties);
  }

  isEmpty() {
    return true;
  }
}

export class NumberCell extends AbstractCell<NumberEvaluation> {
  readonly content = formatValue(this.evaluated.value);
  constructor(id: UID, value: number, properties: CellDisplayProperties = {}, url?: string) {
    super(id, { value: value, type: CellValueType.number }, properties);
  }

  get composerContent() {
    if (this.format?.includes("%")) {
      return `${this.evaluated.value * 100}%`;
    }
    return super.composerContent;
  }
}

export class BooleanCell extends AbstractCell<BooleanEvaluation> {
  readonly content = this.evaluated.value ? "TRUE" : "FALSE";
  constructor(id: UID, value: boolean, properties: CellDisplayProperties = {}, url?: string) {
    super(id, { value: value, type: CellValueType.boolean }, properties);
  }
}
export class TextCell extends AbstractCell<TextEvaluation> {
  readonly content = this.evaluated.value;
  constructor(id: UID, value: string, properties: CellDisplayProperties = {}, url?: string) {
    super(id, { value: value, type: CellValueType.text }, properties);
  }
}

/**
 * A date time cell is a number cell with a required
 * date time format.
 */
export class DateTimeCell extends NumberCell {
  readonly format: Format;

  constructor(
    id: UID,
    value: number,
    properties: CellDisplayProperties & { format: Format },
    url?: string
  ) {
    super(id, value, properties);
    this.format = properties.format;
  }

  get composerContent() {
    return formatValue(this.evaluated.value, this.format);
  }
}

export class FormulaCell extends AbstractCell implements IFormulaCell {
  /**
   * Evaluation error
   */
  readonly error?: string;
  constructor(
    private buildFormulaString: (cell: FormulaCell) => string,
    id: UID,
    readonly normalizedText: string,
    readonly compiledFormula: CompiledFormula,
    readonly dependencies: Range[],
    properties: CellDisplayProperties
  ) {
    super(id, { value: LOADING, type: CellValueType.text }, properties);
  }

  get content() {
    return this.buildFormulaString(this);
  }

  isFormula() {
    return true;
  }

  assignEvaluation(value: CellValue, format: Format) {
    switch (typeof value) {
      case "number":
        this.evaluated = {
          value,
          format,
          type: CellValueType.number,
        };
        break;
      case "boolean":
        this.evaluated = {
          value,
          format,
          type: CellValueType.boolean,
        };
        break;
      case "string":
        this.evaluated = {
          value,
          format,
          type: CellValueType.text,
        };
        break;
      // `null` and `undefined` values are not allowed according to `CellValue`
      // but it actually happens with empty evaluated cells.
      // TODO fix `CellValue`
      case "object": // null
        this.evaluated = {
          value,
          format,
          type: CellValueType.empty,
        };
        break;
      case "undefined":
        this.evaluated = {
          value,
          format,
          type: CellValueType.empty,
        };
        break;
    }
  }

  assignError(value: string, error: EvaluationError) {
    this.evaluated = {
      value,
      error,
      type: CellValueType.error,
    };
  }
}

/**
 * Cell containing a formula which could not be compiled
 * or a content which could not be parsed.
 */
export class BadExpressionCell extends AbstractCell<InvalidEvaluation> {
  /**
   * @param id
   * @param content Invalid formula string
   * @param error Compilation or parsing error
   * @param properties
   */
  constructor(
    id: UID,
    readonly content: string,
    error: EvaluationError,
    properties: CellDisplayProperties
  ) {
    super(
      id,
      {
        value: CellErrorType.BadExpression,
        type: CellValueType.error,
        error,
      },
      properties
    );
  }
}
