import { DATETIME_FORMAT, LOADING } from "../../constants";
import { _lt, _t } from "../../translation";
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
  Lazy,
  Link,
  LinkCell as ILinkCell,
  NumberEvaluation,
  Range,
  SpreadsheetChildEnv,
  Style,
  TextEvaluation,
  UID,
} from "../../types";
import { EvaluationError } from "../../types/errors";
import { formatValue } from "../format";
import { lazy } from "../index";
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
  protected lazyEvaluated: Lazy<T>;

  constructor(readonly id: UID, lazyEvaluated: Lazy<T>, properties: CellDisplayProperties) {
    this.style = properties.style;
    this.format = properties.format;
    this.lazyEvaluated = lazyEvaluated.map((evaluated) => ({
      ...evaluated,
      format: properties.format || evaluated.format,
    }));
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

  get evaluated(): T {
    return this.lazyEvaluated();
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
        return !this.evaluated.format?.match(DATETIME_FORMAT);
      case CellValueType.error:
      case CellValueType.boolean:
        return false;
    }
  }
}

export class EmptyCell extends AbstractCell<EmptyEvaluation> {
  readonly content = "";
  constructor(id: UID, properties: CellDisplayProperties = {}) {
    super(id, lazy({ value: "", type: CellValueType.empty }), properties);
  }

  isEmpty() {
    return true;
  }
}

export class NumberCell extends AbstractCell<NumberEvaluation> {
  readonly content = formatValue(this.evaluated.value);
  constructor(id: UID, value: number, properties: CellDisplayProperties = {}) {
    super(id, lazy({ value, type: CellValueType.number }), properties);
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
    super(id, lazy({ value, type: CellValueType.boolean }), properties);
  }
}
export class TextCell extends AbstractCell<TextEvaluation> {
  readonly content = this.evaluated.value;
  constructor(id: UID, value: string, properties: CellDisplayProperties = {}) {
    super(id, lazy({ value, type: CellValueType.text }), properties);
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
    link.label = _t(link.label);
    super(id, lazy({ value: link.label, type: CellValueType.text }), properties);
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
    readonly compiledFormula: CompiledFormula,
    readonly dependencies: Range[],
    properties: CellDisplayProperties
  ) {
    super(id, lazy({ value: LOADING, type: CellValueType.text }), properties);
  }

  get content() {
    return this.buildFormulaString(this);
  }

  isFormula() {
    return true;
  }

  assignEvaluation(
    lazyEvaluationResult: Lazy<{ value: CellValue | null; format?: Format } | EvaluationError>
  ) {
    this.lazyEvaluated = lazyEvaluationResult.map((evaluationResult) => {
      if (evaluationResult instanceof EvaluationError) {
        return {
          value: evaluationResult.errorType,
          type: CellValueType.error,
          error: evaluationResult,
        };
      }
      const { value, format } = evaluationResult;
      switch (typeof value) {
        case "number":
          return {
            value: value || 0, // necessary to avoid "-0" values
            format,
            type: CellValueType.number,
          };
        case "boolean":
          return {
            value,
            format,
            type: CellValueType.boolean,
          };
        case "string":
          return {
            value,
            format,
            type: CellValueType.text,
          };
        case "object": // null
          return {
            value: 0,
            format,
            type: CellValueType.number,
          };
        default:
          // cannot happen with Typescript compiler watching
          // but possible in a vanilla javascript code base
          return {
            value: "",
            type: CellValueType.empty,
          };
      }
    });
  }
}

/**
 * Cell containing a formula which could not be compiled
 * or a content which could not be parsed.
 */
export class ErrorCell extends AbstractCell<InvalidEvaluation> {
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
      lazy({
        value: error.errorType,
        type: CellValueType.error,
        error,
      }),
      properties
    );
  }
}
