import { DATETIME_FORMAT, LOADING, NULL_FORMAT } from "../constants";
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
  Sheet,
  SpreadsheetEnv,
  Style,
  TextEvaluation,
  UID,
} from "../types";
import { formatDateTime } from "./dates";
import { parseMarkdownLink, parseSheetLink } from "./misc";
import { formatNumber, formatStandardNumber } from "./numbers";

export function isFormula(cell: ICell): cell is IFormulaCell {
  return cell instanceof FormulaCell;
}

export function isEmpty(cell: Cell | undefined): boolean {
  return !cell || cell instanceof EmptyCell;
}

export function hasLink(cell: Cell | undefined): cell is ILinkCell {
  return cell instanceof LinkCell;
}

/**
 * Format a cell value with its format.
 */
export function formatValue(value: CellValue, format?: string): string {
  switch (typeof value) {
    case "string":
      return value;
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "number":
      if (format?.match(DATETIME_FORMAT)) {
        return formatDateTime({ value, format: format });
      }
      return format ? formatNumber(value, format) : formatStandardNumber(value);
    case "object":
      return "0";
  }
}

export function computeFormulaFormat(
  sheets: Record<UID, Sheet | undefined>,
  compiledFormula: CompiledFormula,
  dependencies: Range[]
): string | undefined {
  const dependenciesFormat = compiledFormula.dependenciesFormat;
  for (let dependencyFormat of dependenciesFormat) {
    switch (typeof dependencyFormat) {
      case "string":
        // dependencyFormat corresponds to a literal format which can be applied
        // directly.
        return dependencyFormat;
      case "number":
        // dependencyFormat corresponds to a dependency cell from which we must
        // find the cell and extract the associated format
        const ref = dependencies[dependencyFormat];
        const s = sheets[ref.sheetId];
        if (s) {
          // if the reference is a range --> the first cell in the range
          // determines the format
          const cellRef = s.rows[ref.zone.top]?.cells[ref.zone.left];
          if (cellRef && cellRef.format) {
            return cellRef.format;
          }
        }
        break;
    }
  }
  return NULL_FORMAT;
}

abstract class AbstractCell<T extends CellEvaluation = CellEvaluation> implements ICell {
  readonly style?: Style;
  readonly format?: string;
  abstract content: string;

  constructor(readonly id: UID, public evaluated: T, options: CellDisplayProperties) {
    this.style = options.style;
    this.format = options.format;
  }

  get formattedValue() {
    return formatValue(this.evaluated.value, this.format);
  }

  get defaultAlign() {
    switch (this.evaluated.type) {
      case CellValueType.number:
        return "right";
      case CellValueType.boolean:
      case CellValueType.error:
        return "center";
      default:
        return "left";
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
  constructor(id: UID, options: CellDisplayProperties = {}) {
    super(id, { value: "", type: CellValueType.empty }, options);
  }
}

export class NumberCell extends AbstractCell<NumberEvaluation> {
  readonly content = formatStandardNumber(this.evaluated.value);
  constructor(id: UID, value: number, options: CellDisplayProperties = {}) {
    super(id, { value: value, type: CellValueType.number }, options);
  }
}

export class BooleanCell extends AbstractCell<BooleanEvaluation> {
  readonly content = this.evaluated.value ? "TRUE" : "FALSE";
  constructor(id: UID, value: boolean, options: CellDisplayProperties = {}) {
    super(id, { value: value, type: CellValueType.boolean }, options);
  }
}
export class TextCell extends AbstractCell<TextEvaluation> {
  readonly content = this.evaluated.value;
  constructor(id: UID, value: string, options: CellDisplayProperties = {}) {
    super(id, { value: value, type: CellValueType.text }, options);
  }
}

/**
 * A date time cell is a simple number cell with a required
 * date time format.
 */
export class DateTimeCell extends NumberCell {
  readonly format: string;

  constructor(id: UID, value: number, options: CellDisplayProperties & { format: string }) {
    super(id, value, options);
    this.format = options.format;
  }
}

export abstract class LinkCell extends AbstractCell<TextEvaluation> implements ILinkCell {
  readonly link: Link;
  readonly content: string;
  abstract urlRepresentation: string;

  constructor(id: UID, content: string, properties: CellDisplayProperties = {}) {
    const link = parseMarkdownLink(content);
    properties = {
      ...properties,
      style: {
        ...properties.style,
        textColor: "#007bff",
      },
    };
    super(id, { value: link.label, type: CellValueType.text }, properties);
    this.link = link;
    this.content = content;
  }
  abstract action(env: SpreadsheetEnv): void;
}

export class WebLinkCell extends LinkCell {
  readonly urlRepresentation: string;

  constructor(id: UID, content: string, properties: CellDisplayProperties = {}) {
    super(id, content, properties);
    this.link.url = this.withHttp(this.link.url);
    this.urlRepresentation = this.link.url;
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

export class SheetLinkCell extends LinkCell {
  private sheetId: UID;
  constructor(
    id: UID,
    content: string,
    properties: CellDisplayProperties = {},
    private sheetName: (sheetId: UID) => string
  ) {
    super(id, content, properties);
    this.sheetId = parseSheetLink(this.link.url);
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
  public error?: string;
  constructor(
    private buildFormulaString: (normalizedText: string, dependencies: Range[]) => string,
    id: UID,
    readonly normalizedText: string,
    readonly compiledFormula: CompiledFormula,
    readonly dependencies: Range[],
    options: CellDisplayProperties
  ) {
    super(id, { value: LOADING, type: CellValueType.text }, options);
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
      // the two following cases seem wrong.
      // `null` and `undefined` values are not allowed according to `CellValue`
      // `CellValue` is incomplete
      case "object": // null ?
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
   * @param options
   */
  constructor(id: UID, readonly content: string, error: string, options: CellDisplayProperties) {
    super(id, { value: "#BAD_EXPR", type: CellValueType.error, error }, options);
  }
}
