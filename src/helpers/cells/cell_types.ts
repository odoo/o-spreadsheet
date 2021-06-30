import { DATETIME_FORMAT, LINK_COLOR, LOADING } from "../../constants";
import {
  BooleanEvaluation,
  Cell,
  CellDisplayProperties,
  CellEvaluation,
  CellValue,
  CellValueType,
  CompiledFormula,
  EmptyEvaluation,
  FormulaCell as IFormulaCell,
  ICell,
  InvalidEvaluation,
  Link,
  LinkCell as ILinkCell,
  NumberEvaluation,
  Range,
  SpreadsheetEnv,
  Style,
  TextEvaluation,
  UID,
} from "../../types";
import { formatDateTime } from "../dates";
import { markdownLink, parseMarkdownLink, parseSheetLink } from "../misc";
import { formatStandardNumber } from "../numbers";
import { formatValue } from "./cell_helpers";

/**
 * Abstract base implementation of a cell.
 * Concrete cell classes are responsible to build the raw cell `content` based on
 * whatever data they have (formula, string, ...).
 */
abstract class AbstractCell<T extends CellEvaluation = CellEvaluation> implements ICell {
  readonly style?: Style;
  readonly format?: string;
  abstract content: string;

  constructor(readonly id: UID, public evaluated: T, properties: CellDisplayProperties) {
    this.style = properties.style;
    this.format = properties.format;
  }

  get formattedValue() {
    return formatValue(this.evaluated.value, this.format);
  }

  get composerContent() {
    return this.content;
  }

  get defaultAlign() {
    switch (this.evaluated.type) {
      case CellValueType.number:
        return "right";
      case CellValueType.boolean:
      case CellValueType.error:
        return "center";
      case CellValueType.text:
      case CellValueType.empty:
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

  withDisplayProperties(properties: CellDisplayProperties): this {
    return Object.create(this, {
      style: {
        value: properties.style,
      },
      format: {
        value: properties.format,
      },
    });
  }
}

export class EmptyCell extends AbstractCell<EmptyEvaluation> {
  readonly content = "";
  constructor(id: UID, properties: CellDisplayProperties = {}) {
    super(id, { value: "", type: CellValueType.empty }, properties);
  }
}

export class NumberCell extends AbstractCell<NumberEvaluation> {
  readonly content = formatStandardNumber(this.evaluated.value);
  constructor(id: UID, value: number, properties: CellDisplayProperties = {}) {
    super(id, { value: value, type: CellValueType.number }, properties);
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
  readonly format: string;

  constructor(id: UID, value: number, properties: CellDisplayProperties & { format: string }) {
    super(id, value, properties);
    this.format = properties.format;
  }

  get composerContent() {
    return formatDateTime({ value: this.evaluated.value, format: this.format });
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
      },
    };
    super(id, { value: link.label, type: CellValueType.text }, properties);
    this.link = link;
    this.content = content;
  }
  abstract action(env: SpreadsheetEnv): void;

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
    this.content = markdownLink(this.link.label, this.link.url);
    this.urlRepresentation = this.link.url;
    this.isUrlEditable = true;
  }

  action(env: SpreadsheetEnv) {
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
    private sheetName: (sheetId: UID) => string
  ) {
    super(id, content, properties);
    this.sheetId = parseSheetLink(this.link.url);
    this.isUrlEditable = false;
  }

  action(env: SpreadsheetEnv) {
    env.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: env.getters.getActiveSheetId(),
      sheetIdTo: this.sheetId,
    });
  }

  get urlRepresentation(): string {
    return this.sheetName(this.sheetId);
  }
}

export class FormulaCell extends AbstractCell implements IFormulaCell {
  /**
   * Evaluation error
   */
  readonly error?: string;
  constructor(
    private buildFormulaString: (normalizedText: string, dependencies: Range[]) => string,
    id: UID,
    readonly normalizedText: string,
    readonly compiledFormula: CompiledFormula,
    readonly dependencies: Range[],
    properties: CellDisplayProperties
  ) {
    super(id, { value: LOADING, type: CellValueType.text }, properties);
  }

  get content() {
    return this.buildFormulaString(this.normalizedText, this.dependencies);
  }

  assignValue(value: CellValue) {
    switch (typeof value) {
      case "number":
        this.evaluated = {
          value,
          type: CellValueType.number,
        };
        break;
      case "boolean":
        this.evaluated = {
          value,
          type: CellValueType.boolean,
        };
        break;
      case "string":
        this.evaluated = {
          value,
          type: CellValueType.text,
        };
        break;
      // `null` and `undefined` values are not allowed according to `CellValue`
      // but it actually happens with empty evaluated cells.
      // TODO fix `CellValue`
      case "object": // null
        this.evaluated = {
          value,
          type: CellValueType.empty,
        };
        break;
      case "undefined":
        this.evaluated = {
          value,
          type: CellValueType.empty,
        };
        break;
    }
  }

  assignError(value: string, errorMessage: string) {
    this.evaluated = {
      value,
      error: errorMessage,
      type: CellValueType.error,
    };
  }
}

/**
 * Cell containing a formula which could not be compiled.
 */
export class InvalidFormulaCell extends AbstractCell<InvalidEvaluation> {
  /**
   * @param id
   * @param content Invalid formula string
   * @param error Compilation error
   * @param properties
   */
  constructor(id: UID, readonly content: string, error: string, properties: CellDisplayProperties) {
    super(id, { value: "#BAD_EXPR", type: CellValueType.error, error }, properties);
  }
}

export function isFormula(cell: ICell): cell is IFormulaCell {
  return cell instanceof FormulaCell;
}

export function isEmpty(cell: Cell | undefined): boolean {
  return !cell || cell instanceof EmptyCell;
}

export function hasLink(cell: ICell | undefined): cell is ILinkCell {
  return cell instanceof LinkCell;
}
