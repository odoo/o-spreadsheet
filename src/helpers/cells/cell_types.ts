import { DATETIME_FORMAT, LINK_COLOR, LOADING } from "../../constants";
import { _lt } from "../../translation";
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
  Link,
  LinkCell as ILinkCell,
  NumberEvaluation,
  Range,
  SpreadsheetChildEnv,
  Style,
  TextEvaluation,
  UID,
} from "../../types";
import { CellErrorType, EvaluationError } from "../../types/errors";
import { formatValue } from "../format";
import { markdownLink, parseMarkdownLink, parseSheetLink } from "../misc";
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

  constructor(readonly id: UID, evaluated: T, properties: CellDisplayProperties) {
    this.style = properties.style;
    this.format = properties.format;
    this.evaluated = { ...evaluated, format: evaluated.format || properties.format };
  }
  isFormula(): this is IFormulaCell {
    return false;
  }

  isLink(): this is ILinkCell {
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
  constructor(id: UID, properties: CellDisplayProperties = {}) {
    super(id, { value: "", type: CellValueType.empty }, properties);
  }

  isEmpty() {
    return true;
  }
}

export class NumberCell extends AbstractCell<NumberEvaluation> {
  readonly content = formatValue(this.evaluated.value);
  constructor(id: UID, value: number, properties: CellDisplayProperties = {}) {
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
  constructor(id: UID, value: boolean, properties: CellDisplayProperties = {}) {
    super(id, { value: value, type: CellValueType.boolean }, properties);
  }
}
export class TextCell extends AbstractCell<TextEvaluation> {
  readonly content = this.evaluated.value;
  constructor(id: UID, value: string, properties: CellDisplayProperties = {}) {
    super(id, { value: value, type: CellValueType.text }, properties);
  }
}

/**
 * A date time cell is a number cell with a required
 * date time format.
 */
export class DateTimeCell extends NumberCell {
  readonly format: Format;

  constructor(id: UID, value: number, properties: CellDisplayProperties & { format: Format }) {
    super(id, value, properties);
    this.format = properties.format;
  }

  get composerContent() {
    return formatValue(this.evaluated.value, this.format);
  }
}

export abstract class LinkCell extends AbstractCell<TextEvaluation> implements ILinkCell {
  readonly link: Link;
  readonly content: string;
  abstract isUrlEditable: boolean;
  abstract urlRepresentation: string;

  constructor(id: UID, content: string, properties: CellDisplayProperties = {}) {
    const link = parseMarkdownLink(content);
    properties = {
      ...properties,
      style: {
        ...properties.style,
        textColor: properties.style?.textColor || LINK_COLOR,
        underline: true,
      },
    };
    super(id, { value: link.label, type: CellValueType.text }, properties);
    this.link = link;
    this.content = content;
  }
  abstract action(env: SpreadsheetChildEnv): void;

  isLink() {
    return true;
  }

  get composerContent() {
    return this.link.label;
  }
}

/**
 * Simple web link cell
 */
export class WebLinkCell extends LinkCell {
  readonly urlRepresentation: string;
  readonly content: string;
  readonly isUrlEditable: boolean;

  constructor(id: UID, content: string, properties: CellDisplayProperties = {}) {
    super(id, content, properties);
    this.link.url = this.withHttp(this.link.url);
    this.link.isExternal = true;
    this.content = markdownLink(this.link.label, this.link.url);
    this.urlRepresentation = this.link.url;
    this.isUrlEditable = true;
  }

  action(env: SpreadsheetChildEnv) {
    window.open(this.link.url, "_blank");
  }

  /**
   * Add the `https` prefix to the url if it's missing
   */
  private withHttp(url: string): string {
    return !/^https?:\/\//i.test(url) ? `https://${url}` : url;
  }
}

/**
 * Link redirecting to a given sheet in the workbook.
 */
export class SheetLinkCell extends LinkCell {
  private sheetId: UID;
  readonly isUrlEditable: boolean;

  constructor(
    id: UID,
    content: string,
    properties: CellDisplayProperties = {},
    private sheetName: (sheetId: UID) => string | undefined
  ) {
    super(id, content, properties);
    this.sheetId = parseSheetLink(this.link.url);
    this.isUrlEditable = false;
  }

  action(env: SpreadsheetChildEnv) {
    env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: env.model.getters.getActiveSheetId(),
      sheetIdTo: this.sheetId,
    });
  }

  get urlRepresentation(): string {
    return this.sheetName(this.sheetId) || _lt("Invalid sheet");
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
