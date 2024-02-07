import { DEFAULT_STYLE } from "../../constants";
import { Token, compile, tokenize } from "../../formulas";
import { compileFast } from "../../formulas/compiler";
import { parseLiteral } from "../../helpers/cells";
import {
  concat,
  detectDateFormat,
  detectNumberFormat,
  getItemId,
  isInside,
  range,
  replaceSpecialSpaces,
  toCartesian,
  toXC,
} from "../../helpers/index";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Cell,
  CellData,
  CellPosition,
  ClearCellCommand,
  CommandResult,
  CompiledFormula,
  CoreCommand,
  ExcelWorkbookData,
  Format,
  FormulaCell,
  HeaderIndex,
  LiteralCell,
  PositionDependentCommand,
  Range,
  RangeCompiledFormula,
  RangePart,
  Style,
  UID,
  UpdateCellData,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Record<UID, Cell | undefined>>;
  nextId: number;
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CellPlugin extends CorePlugin<CoreState> implements CoreState {
  static getters = [
    "zoneToXC",
    "getCells",
    "getFormulaCellContent",
    "getTranslatedCellFormula",
    "getCellStyle",
    "getCellById",
  ] as const;
  readonly nextId = 1;
  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (cell.isFormula) {
          for (const range of cell.compiledFormula.dependencies) {
            if (!sheetId || range.sheetId === sheetId) {
              const change = applyChange(range);
              if (change.changeType !== "NONE") {
                this.history.update(
                  "cells",
                  sheet,
                  cell.id,
                  "compiledFormula" as any,
                  "dependencies",
                  cell.compiledFormula.dependencies.indexOf(range),
                  change.range
                );
              }
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "UPDATE_CELL":
        return this.checkCellOutOfSheet(cmd);
      case "CLEAR_CELL":
        return this.checkValidations(
          cmd,
          this.chainValidations(this.checkCellOutOfSheet, this.checkUselessClearCell)
        );
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_FORMATTING":
        if ("style" in cmd) {
          this.setStyle(cmd.sheetId, cmd.target, cmd.style);
        }
        if ("format" in cmd && cmd.format !== undefined) {
          this.setFormatter(cmd.sheetId, cmd.target, cmd.format);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearFormatting(cmd.sheetId, cmd.target);
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.handleAddColumnsRows(cmd, this.copyColumnStyle.bind(this));
        } else {
          this.handleAddColumnsRows(cmd, this.copyRowStyle.bind(this));
        }
        break;
      case "UPDATE_CELL":
        this.updateCell(cmd.sheetId, cmd.col, cmd.row, cmd);
        break;

      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheetId: cmd.sheetId,
          col: cmd.col,
          row: cmd.row,
          content: "",
          style: null,
          format: "",
        });
        break;
    }
  }

  /**
   * Set a format to all the cells in a zone
   */
  private setFormatter(sheetId: UID, zones: Zone[], format: Format) {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            format,
          });
        }
      }
    }
  }

  /**
   * Clear the styles and format of zones
   */
  private clearFormatting(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          // commandHelpers.updateCell(sheetId, col, row, { style: undefined});
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: null,
            format: "",
          });
        }
      }
    }
  }

  /**
   * Copy the style of the reference column/row to the new columns/rows.
   */
  private handleAddColumnsRows(
    cmd: AddColumnsRowsCommand,
    fn: (sheetId: UID, styleRef: HeaderIndex, elements: HeaderIndex[]) => void
  ) {
    // The new elements have already been inserted in the sheet at this point.
    let insertedElements: HeaderIndex[];
    let styleReference: HeaderIndex;
    if (cmd.position === "before") {
      insertedElements = range(cmd.base, cmd.base + cmd.quantity);
      styleReference = cmd.base + cmd.quantity;
    } else {
      insertedElements = range(cmd.base + 1, cmd.base + cmd.quantity + 1);
      styleReference = cmd.base;
    }
    fn(cmd.sheetId, styleReference, insertedElements);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      // cells
      for (let xc in sheet.cells) {
        const cellData = sheet.cells[xc];
        const { col, row } = toCartesian(xc);
        if (cellData?.content || cellData?.format || cellData?.style || cellData?.formulaTokens) {
          const cell = this.importCell(sheet.id, cellData, data.styles, data.formats);
          this.history.update("cells", sheet.id, cell.id, cell);
          this.dispatch("UPDATE_CELL_POSITION", {
            cellId: cell.id,
            col,
            row,
            sheetId: sheet.id,
          });
        }
      }
    }
  }

  export(data: WorkbookData) {
    const styles: { [styleId: number]: Style } = {};
    const formats: { [formatId: number]: string } = {};

    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      const positions = Object.keys(this.cells[_sheet.id] || {})
        .map((cellId) => this.getters.getCellPosition(cellId))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const position of positions) {
        const cell = this.getters.getCell(position)!;
        const xc = toXC(position.col, position.row);
        const style = this.removeDefaultStyleValues(cell.style);
        cells[xc] = {
          style: Object.keys(style).length ? getItemId<Style>(style, styles) : undefined,
          format: cell.format ? getItemId<Format>(cell.format, formats) : undefined,
        };
        if (cell instanceof FormulaCellWithDependencies) {
          let referenceIndex = 0;
          cells[xc].content = cell.compiledFormula.tokens
            .map((token) =>
              token instanceof RangeReferenceToken ? "~" + referenceIndex++ : token.value
            )
            .join("");
          cells[xc].formulaTokens = cell.compiledFormula.tokens
            .filter((token) => token instanceof RangeReferenceToken)
            .map((token) => token.value);
        } else {
          cells[xc].content = cell.content || undefined;
        }
      }
      _sheet.cells = cells;
    }
    data.styles = styles;
    data.formats = formats;
  }

  importCell(
    sheetId: UID,
    cellData: CellData,
    normalizedStyles: { [key: number]: Style },
    normalizedFormats: { [key: number]: Format }
  ): Cell {
    const style = (cellData.style && normalizedStyles[cellData.style]) || undefined;
    const format = (cellData.format && normalizedFormats[cellData.format]) || undefined;
    const cellId = this.getNextUid();
    return this.createCell(
      cellId,
      cellData?.content || "",
      format,
      style,
      sheetId,
      cellData?.formulaTokens
    );
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }

  private removeDefaultStyleValues(style: Style | undefined): Style {
    const cleanedStyle = { ...style };
    for (const [property, defaultValue] of Object.entries(DEFAULT_STYLE)) {
      if (cleanedStyle[property] === defaultValue) {
        delete cleanedStyle[property];
      }
    }
    return cleanedStyle;
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------
  getCells(sheetId: UID): Record<UID, Cell> {
    return this.cells[sheetId] || {};
  }

  /**
   * get a cell by ID. Used in evaluation when evaluating an async cell, we need to be able to find it back after
   * starting an async evaluation even if it has been moved or re-allocated
   */
  getCellById(cellId: UID): Cell | undefined {
    // this must be as fast as possible
    const position = this.getters.getCellPosition(cellId);
    const sheet = this.cells[position.sheetId];
    return sheet[cellId];
  }

  /*
   * Reconstructs the original formula string based on a normalized form and its dependencies
   */
  getFormulaCellContent(
    sheetId: UID,
    compiledFormula: RangeCompiledFormula,
    dependencies?: Range[],
    useFixedReference: boolean = false
  ): string {
    const ranges = dependencies || compiledFormula.dependencies;
    let rangeIndex = 0;
    return concat(
      compiledFormula.tokens.map((token) => {
        if (token.type === "REFERENCE") {
          const range = ranges[rangeIndex++];
          return this.getters.getRangeString(range, sheetId, { useFixedReference });
        }
        return token.value;
      })
    );
  }

  /*
   * Constructs a formula string based on an initial formula and a translation vector
   */
  getTranslatedCellFormula(
    sheetId: UID,
    offsetX: number,
    offsetY: number,
    compiledFormula: RangeCompiledFormula
  ) {
    const adaptedDependencies = this.getters.createAdaptedRanges(
      compiledFormula.dependencies,
      offsetX,
      offsetY,
      sheetId
    );
    return this.getFormulaCellContent(sheetId, compiledFormula, adaptedDependencies);
  }

  getCellStyle(position: CellPosition): Style {
    return this.getters.getCell(position)?.style || {};
  }

  /**
   * Converts a zone to a XC coordinate system
   *
   * The conversion also treats merges as one single cell
   *
   * Examples:
   * {top:0,left:0,right:0,bottom:0} ==> A1
   * {top:0,left:0,right:1,bottom:1} ==> A1:B2
   *
   * if A1:B2 is a merge:
   * {top:0,left:0,right:1,bottom:1} ==> A1
   * {top:1,left:0,right:1,bottom:2} ==> A1:B3
   *
   * if A1:B2 and A4:B5 are merges:
   * {top:1,left:0,right:1,bottom:3} ==> A1:A5
   */
  zoneToXC(
    sheetId: UID,
    zone: Zone,
    fixedParts: RangePart[] = [{ colFixed: false, rowFixed: false }]
  ): string {
    zone = this.getters.expandZone(sheetId, zone);
    const topLeft = toXC(zone.left, zone.top, fixedParts[0]);
    const botRight = toXC(
      zone.right,
      zone.bottom,
      fixedParts.length > 1 ? fixedParts[1] : fixedParts[0]
    );
    const cellTopLeft = this.getters.getMainCellPosition({
      sheetId,
      col: zone.left,
      row: zone.top,
    });
    const cellBotRight = this.getters.getMainCellPosition({
      sheetId,
      col: zone.right,
      row: zone.bottom,
    });
    const sameCell = cellTopLeft.col === cellBotRight.col && cellTopLeft.row === cellBotRight.row;
    if (topLeft != botRight && !sameCell) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  private setStyle(sheetId: UID, target: Zone[], style: Style | undefined) {
    for (let zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.getters.getCell({ sheetId, col, row });
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: style ? { ...cell?.style, ...style } : undefined,
          });
        }
      }
    }
  }

  /**
   * Copy the style of one column to other columns.
   */
  private copyColumnStyle(sheetId: UID, refColumn: HeaderIndex, targetCols: HeaderIndex[]) {
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const format = this.getFormat(sheetId, refColumn, row);
      if (format.style || format.format) {
        for (let col of targetCols) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * Copy the style of one row to other rows.
   */
  private copyRowStyle(sheetId: UID, refRow: HeaderIndex, targetRows: HeaderIndex[]) {
    for (let col = 0; col < this.getters.getNumberCols(sheetId); col++) {
      const format = this.getFormat(sheetId, col, refRow);
      if (format.style || format.format) {
        for (let row of targetRows) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * gets the currently used style/border of a cell based on it's coordinates
   */
  private getFormat(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex
  ): { style?: Style; format?: Format } {
    const format: { style?: Style; format?: string } = {};
    const position = this.getters.getMainCellPosition({ sheetId, col, row });
    const cell = this.getters.getCell(position);
    if (cell) {
      if (cell.style) {
        format["style"] = cell.style;
      }
      if (cell.format) {
        format["format"] = cell.format;
      }
    }
    return format;
  }

  private getNextUid() {
    const id = this.nextId.toString();
    this.history.update("nextId", this.nextId + 1);
    return id;
  }

  private updateCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex, after: UpdateCellData) {
    const before = this.getters.getCell({ sheetId, col, row });
    const hasContent = "content" in after || "formula" in after;

    // Compute the new cell properties
    const afterContent = hasContent ? replaceSpecialSpaces(after?.content) : before?.content || "";
    let style: Style | undefined;
    if (after.style !== undefined) {
      style = after.style || undefined;
    } else {
      style = before ? before.style : undefined;
    }
    const locale = this.getters.getLocale();
    let format =
      ("format" in after ? after.format : before && before.format) ||
      detectDateFormat(afterContent, locale) ||
      detectNumberFormat(afterContent);

    /* Read the following IF as:
     * we need to remove the cell if it is completely empty, but we can know if it completely empty if:
     * - the command says the new content is empty and has no border/format/style
     * - the command has no content property, in this case
     *     - either there wasn't a cell at this place and the command says border/format/style is empty
     *     - or there was a cell at this place, but it's an empty cell and the command says border/format/style is empty
     *  */
    if (
      ((hasContent && !afterContent && !after.formula) ||
        (!hasContent && (!before || before.content === ""))) &&
      !style &&
      !format
    ) {
      if (before) {
        this.history.update("cells", sheetId, before.id, undefined);
        this.dispatch("UPDATE_CELL_POSITION", {
          cellId: undefined,
          col,
          row,
          sheetId,
        });
      }
      return;
    }

    const cellId = before?.id || this.getNextUid();
    const cell = this.createCell(cellId, afterContent, format, style, sheetId);
    this.history.update("cells", sheetId, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cellId: cell.id, col, row, sheetId });
  }

  private createCell(
    id: UID,
    content: string,
    format: Format | undefined,
    style: Style | undefined,
    sheetId: UID,
    formulaTokens?: string[]
  ): Cell {
    if (content.startsWith("=") || formulaTokens?.length) {
      try {
        return this.createFormulaCell(id, content, format, style, sheetId, formulaTokens);
      } catch (error) {
        return this.createErrorFormula(id, content, format, style, error);
      }
    } else {
      return this.createLiteralCell(id, content, format, style);
    }
  }

  private createLiteralCell(
    id: UID,
    content: string,
    format: Format | undefined,
    style: Style | undefined
  ): LiteralCell {
    const locale = this.getters.getLocale();
    content = parseLiteral(content, locale).toString();
    return {
      id,
      content,
      style,
      format,
      isFormula: false,
    };
  }

  private createFormulaCell(
    id: UID,
    content: string,
    format: Format | undefined,
    style: Style | undefined,
    sheetId: UID,
    formulaTokens?: string[]
  ): FormulaCell {
    let compiledFormula;
    if (formulaTokens?.length) {
      compiledFormula = compileFast(content, formulaTokens);
    } else {
      compiledFormula = compile(content);
    }
    if (compiledFormula.dependencies.length) {
      return this.createFormulaCellWithDependencies(id, compiledFormula, format, style, sheetId);
    }
    return {
      id,
      content,
      style,
      format,
      isFormula: true,
      compiledFormula: {
        ...compiledFormula,
        dependencies: [],
      },
    };
  }

  /**
   * Create a new formula cell with the content
   * being a computed property to rebuild the dependencies XC.
   */
  private createFormulaCellWithDependencies(
    id: UID,
    compiledFormula: CompiledFormula,
    format: Format | undefined,
    style: Style | undefined,
    sheetId: UID
  ): FormulaCell {
    const dependencies: Range[] = [];
    for (const xc of compiledFormula.dependencies) {
      dependencies.push(this.getters.getRangeFromSheetXC(sheetId, xc));
    }
    return new FormulaCellWithDependencies(
      id,
      compiledFormula,
      format,
      style,
      dependencies,
      sheetId,
      this.getters.getRangeString
    );
  }

  private createErrorFormula(
    id: UID,
    content: string,
    format: Format | undefined,
    style: Style | undefined,
    error: unknown
  ): FormulaCell {
    return {
      id,
      content,
      style,
      format,
      isFormula: true,
      compiledFormula: {
        tokens: tokenize(content),
        dependencies: [],
        execute: function () {
          throw error;
        },
      },
    };
  }

  private checkCellOutOfSheet(cmd: PositionDependentCommand): CommandResult {
    const { sheetId, col, row } = cmd;
    const sheet = this.getters.tryGetSheet(sheetId);
    if (!sheet) return CommandResult.InvalidSheetId;
    const sheetZone = this.getters.getSheetZone(sheetId);
    return isInside(col, row, sheetZone) ? CommandResult.Success : CommandResult.TargetOutOfSheet;
  }

  private checkUselessClearCell(cmd: ClearCellCommand): CommandResult {
    const cell = this.getters.getCell(cmd);
    if (!cell) return CommandResult.NoChanges;
    if (!cell.content && !cell.style && !cell.format) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }
}

export class FormulaCellWithDependencies implements FormulaCell {
  readonly isFormula = true;
  readonly compiledFormula: RangeCompiledFormula;

  constructor(
    readonly id: UID,
    compiledFormula: CompiledFormula,
    readonly format: Format | undefined,
    readonly style: Style | undefined,
    dependencies: Range[],
    private readonly sheetId: UID,
    private readonly getRangeString: (
      range: Range,
      sheetId: UID,
      option?: { useFixedReference: boolean }
    ) => string
  ) {
    let rangeIndex = 0;
    const tokens = compiledFormula.tokens.map((token) => {
      if (token.type === "REFERENCE") {
        const index = rangeIndex++;
        return new RangeReferenceToken(dependencies, index, this.sheetId, this.getRangeString);
      }
      return token;
    });
    this.compiledFormula = {
      ...compiledFormula,
      dependencies,
      tokens,
    };
  }

  get content() {
    return concat(this.compiledFormula.tokens.map((token) => token.value));
  }

  get contentWithFixedReferences() {
    let rangeIndex = 0;
    return concat(
      this.compiledFormula.tokens.map((token) => {
        if (token.type === "REFERENCE") {
          const index = rangeIndex++;
          return this.getRangeString(this.compiledFormula.dependencies[index], this.sheetId, {
            useFixedReference: true,
          });
        }
        return token.value;
      })
    );
  }
}

class RangeReferenceToken implements Token {
  //, Cloneable<RangeReferenceToken> {
  type = "REFERENCE" as const;

  constructor(
    private ranges: Range[],
    private rangeIndex: number,
    private sheetId,
    private getRangeString: (range: Range, sheetId: UID) => string
  ) {}

  // clone (args?: Partial<RangeReferenceToken> | undefined) {
  //   return new RangeReferenceToken(this.ranges, this.rangeIndex, this.sheetId, this.getRangeString)
  // }

  get value() {
    const range = this.ranges[this.rangeIndex];
    return this.getRangeString(range, this.sheetId);
  }
}
