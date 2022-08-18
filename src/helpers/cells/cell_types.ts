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
  public evaluated: T;
  readonly url?: string;
  private _content: string;

  constructor(
    readonly id: UID,
    content: string,
    evaluated: T,
    properties: CellDisplayProperties,
    url?: string
  ) {
    this._content = content;
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

  get content() {
    return this._content;
  }

  abstract get composerContent();

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
  constructor(id: UID, content: string, properties: CellDisplayProperties = {}, url?: string) {
    super(id, content, { value: "", type: CellValueType.empty }, properties, url);
  }

  get composerContent() {
    return "";
  }

  isEmpty() {
    return true;
  }
}

export class NumberCell extends AbstractCell<NumberEvaluation> {
  constructor(
    id: UID,
    content: string,
    value: number,
    properties: CellDisplayProperties = {},
    url?: string
  ) {
    super(id, content, { value: value, type: CellValueType.number }, properties, url);
  }

  get composerContent() {
    if (this.format?.includes("%")) {
      return `${this.evaluated.value * 100}%`;
    }
    return formatValue(this.evaluated.value);
  }
}

export class BooleanCell extends AbstractCell<BooleanEvaluation> {
  constructor(
    id: UID,
    content,
    value: boolean,
    properties: CellDisplayProperties = {},
    url?: string
  ) {
    super(id, content, { value: value, type: CellValueType.boolean }, properties, url);
  }

  get composerContent() {
    return this.evaluated.value ? "TRUE" : "FALSE";
  }
}
export class TextCell extends AbstractCell<TextEvaluation> {
  constructor(
    id: UID,
    content: string,
    value: string,
    properties: CellDisplayProperties = {},
    url?: string
  ) {
    super(id, content, { value: value, type: CellValueType.text }, properties, url);
  }

  get composerContent() {
    return this.evaluated.value;
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
    content,
    value: number,
    properties: CellDisplayProperties & { format: Format },
    url?: string
  ) {
    super(id, content, value, properties, url);
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
    content: string,
    readonly compiledFormula: CompiledFormula,
    readonly dependencies: Range[],
    properties: CellDisplayProperties
  ) {
    super(id, content, { value: LOADING, type: CellValueType.text }, properties);
  }

  get content() {
    return this.buildFormulaString(this);
  }

  get composerContent() {
    return this.content;
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
  constructor(id: UID, content: string, error: EvaluationError, properties: CellDisplayProperties) {
    super(
      id,
      content,
      {
        value: CellErrorType.BadExpression,
        type: CellValueType.error,
        error,
      },
      properties
    );
  }

  get composerContent() {
    return this.content;
  }
}
