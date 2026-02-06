import { DEFAULT_STYLE } from "../../constants";
import { compile, compileTokens } from "../../formulas/compiler";
import { Token } from "../../formulas/tokenizer";
import { isEvaluationError, toString } from "../../functions/helpers";
import { PositionMap } from "../../helpers/cells/position_map";
import {
  getItemId,
  groupItemIdsByZones,
  iterateItemIdsPositions,
} from "../../helpers/data_normalization";
import { concat, deepEquals, range, replaceNewLines } from "../../helpers/misc";

import { toCartesian, toXC } from "../../helpers/coordinates";
import { CorePlugin } from "../core_plugin";

import { isInside } from "../../helpers/zones";
import { Cell, FormulaCell, LiteralCell } from "../../types/cells";
import {
  AddColumnsRowsCommand,
  ClearCellCommand,
  CommandResult,
  CoreCommand,
  PositionDependentCommand,
  UpdateCellCommand,
} from "../../types/commands";
import { CellPosition, HeaderIndex, RangeAdapterFunctions, UID } from "../../types/misc";

import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import {
  detectDateFormat,
  detectNumberFormat,
  isExcelCompatible,
  isTextFormat,
} from "../../helpers/format/format";
import { recomputeZones } from "../../helpers/recompute_zones";
import { Format } from "../../types/format";
import {
  AdaptSheetName,
  CompiledFormula,
  RangeCompiledFormula,
  Style,
  UpdateCellData,
  Zone,
} from "../../types/misc";
import { Range, RangePart } from "../../types/range";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Record<number, Cell | undefined> | undefined>;
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
    "getTranslatedCellFormula",
    "getCellById",
    "getFormulaString",
    "getFormulaMovedInSheet",
  ] as const;
  readonly nextId = 1;
  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};

  adaptRanges({ applyChange }: RangeAdapterFunctions, sheetId: UID, sheetName: AdaptSheetName) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (cell.isFormula) {
          for (const range of cell.compiledFormula.dependencies) {
            if (range.sheetId === sheetId || range.invalidSheetName === sheetName.old) {
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
        return this.checkValidations(cmd, this.checkCellOutOfSheet, this.checkUselessUpdateCell);
      case "CLEAR_CELL":
        return this.checkValidations(cmd, this.checkCellOutOfSheet, this.checkUselessClearCell);
      case "UPDATE_CELL_POSITION":
        return !cmd.cellId || this.cells[cmd.sheetId]?.[cmd.cellId]
          ? CommandResult.Success
          : CommandResult.InvalidCellId;
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
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
          format: null,
        });
        break;

      case "CLEAR_CELLS":
        this.clearCells(cmd.sheetId, cmd.target);
        break;

      case "DELETE_CONTENT":
        this.clearZones(cmd.sheetId, cmd.target);
        break;
      case "DELETE_SHEET": {
        this.history.update("cells", cmd.sheetId, undefined);
      }
    }
  }

  private clearZones(sheetId: UID, zones: Zone[]) {
    for (const zone of recomputeZones(zones)) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.getters.getCell({ sheetId, col, row });
          if (cell?.isFormula || cell?.content) {
            this.dispatch("UPDATE_CELL", {
              sheetId: sheetId,
              content: "",
              col,
              row,
            });
          }
        }
      }
    }
  }

  /**
   * Clear the styles, the format and the content of zones
   */
  private clearCells(sheetId: UID, zones: Zone[]) {
    for (const zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.dispatch("UPDATE_CELL", {
            sheetId: sheetId,
            col,
            row,
            content: "",
            style: null,
            format: null,
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
    for (const sheet of data.sheets) {
      const sheetId = sheet.id;
      const cellsData = new PositionMap<{ content?: string; style?: number; format?: number }>();
      // cells content
      for (const xc in sheet.cells) {
        if (sheet.cells[xc]) {
          const { col, row } = toCartesian(xc);
          const position = { sheetId: sheet.id, col, row };
          cellsData.set(position, { content: sheet.cells[xc] });
        }
      }
      // cells style and format
      for (const [cellProperty, valuesByZones] of [
        ["style", sheet.styles],
        ["format", sheet.formats],
      ] as const) {
        for (const [position, itemId] of iterateItemIdsPositions(sheet.id, valuesByZones)) {
          const cellData = cellsData.get(position);
          if (cellData) {
            cellData[cellProperty] = itemId;
          } else {
            cellsData.set(position, { [cellProperty]: itemId });
          }
        }
      }
      for (const position of cellsData.keysForSheet(sheetId)) {
        const cellData = cellsData.get(position);
        if (cellData?.content || cellData?.format || cellData?.style) {
          const cell = this.importCell(
            sheet.id,
            cellData?.content,
            cellData?.style ? data.styles[cellData?.style] : undefined,
            cellData?.format ? data.formats[cellData?.format] : undefined
          );
          this.history.update("cells", sheet.id, cell.id, cell);
          this.dispatch("UPDATE_CELL_POSITION", {
            cellId: cell.id,
            ...position,
          });
        }
      }
    }
  }

  export(data: WorkbookData) {
    const styles: { [styleId: number]: Style } = {};
    const formats: { [formatId: number]: string } = {};

    for (const _sheet of data.sheets) {
      const positionsByStyle: Record<number, CellPosition[]> = [];
      const positionsByFormat: Record<number, CellPosition[]> = [];
      const cells: { [key: string]: string } = {};
      const positions = Object.values(this.cells[_sheet.id] || {})
        .map((cell) => this.getters.getCellPosition(cell.id))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const position of positions) {
        const cell = this.getters.getCell(position)!;
        const xc = toXC(position.col, position.row);
        const style = this.extractCustomStyle(position, cell);
        if (Object.keys(style).length) {
          const styleId = getItemId<Style>(style, styles);
          positionsByStyle[styleId] ??= [];
          positionsByStyle[styleId].push(position);
        }
        if (cell.format) {
          const formatId = getItemId<Format>(cell.format, formats);
          positionsByFormat[formatId] ??= [];
          positionsByFormat[formatId].push(position);
        }
        if (cell.content) {
          cells[xc] = cell.content;
        }
      }
      _sheet.styles = groupItemIdsByZones(positionsByStyle);
      _sheet.formats = groupItemIdsByZones(positionsByFormat);
      _sheet.cells = cells;
    }
    data.styles = styles;
    data.formats = formats;
  }

  importCell(sheetId: UID, content?: string, style?: Style, format?: Format): Cell {
    const cellId = this.getNextCellId();
    return this.createCell(cellId, content || "", format, style, sheetId);
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
    const incompatibleIds: number[] = [];
    for (const formatId in data.formats || []) {
      if (!isExcelCompatible(data.formats[formatId])) {
        incompatibleIds.push(Number(formatId));
        delete data.formats[formatId];
      }
    }
    if (incompatibleIds.length) {
      for (const sheet of data.sheets) {
        for (const zoneXc in sheet.formats) {
          const formatId = sheet.formats[zoneXc];
          if (formatId && incompatibleIds.includes(formatId)) {
            delete sheet.formats[zoneXc];
          }
        }
      }
    }
  }

  private extractCustomStyle(position: CellPosition, cell: Cell): Style {
    const cleanedStyle = this.getters.getCellStyle(position, cell);
    if (!cell) {
      return {};
    }
    const defaultStyle = DEFAULT_STYLE;
    for (const property in cleanedStyle) {
      if (
        (property !== "align" || !cell.isFormula) &&
        cleanedStyle[property] === defaultStyle[property]
      ) {
        delete cleanedStyle[property];
      }
    }
    return cleanedStyle;
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------
  getCells(sheetId: UID): Cell[] {
    return Object.values(this.cells[sheetId] || {});
  }

  /**
   * get a cell by ID. Used in evaluation when evaluating an async cell, we need to be able to find it back after
   * starting an async evaluation even if it has been moved or re-allocated
   */
  getCellById(cellId: number): Cell | undefined {
    // this must be as fast as possible
    const position = this.getters.getCellPosition(cellId);
    const sheet = this.cells[position.sheetId];
    return sheet[cellId];
  }

  /*
   * Reconstructs the original formula string based on new dependencies
   */
  getFormulaString(
    sheetId: UID,
    tokens: Token[],
    dependencies: Range[],
    useBoundedReference: boolean = false
  ): string {
    if (!dependencies.length) {
      return concat(tokens.map((token) => token.value));
    }
    let rangeIndex = 0;
    return concat(
      tokens.map((token) => {
        if (token.type === "REFERENCE") {
          const range = dependencies[rangeIndex++];
          return this.getters.getRangeString(range, sheetId, { useBoundedReference });
        }
        return token.value;
      })
    );
  }

  /*
   * Constructs a formula string based on an initial formula and a translation vector
   */
  getTranslatedCellFormula(sheetId: UID, offsetX: number, offsetY: number, tokens: Token[]) {
    const adaptedDependencies = this.getters.createAdaptedRanges(
      compileTokens(tokens).dependencies.map((d) => this.getters.getRangeFromSheetXC(sheetId, d)),
      offsetX,
      offsetY,
      sheetId
    );
    return this.getFormulaString(sheetId, tokens, adaptedDependencies);
  }

  getFormulaMovedInSheet(originSheetId: UID, targetSheetId: UID, tokens: Token[]) {
    const dependencies = compileTokens(tokens).dependencies.map((d) =>
      this.getters.getRangeFromSheetXC(originSheetId, d)
    );
    const adaptedDependencies = this.getters.removeRangesSheetPrefix(targetSheetId, dependencies);
    return this.getFormulaString(targetSheetId, tokens, adaptedDependencies);
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
    if (topLeft !== botRight && !sameCell) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  /**
   * Copy the style of one column to other columns.
   */
  private copyColumnStyle(sheetId: UID, refColumn: HeaderIndex, targetCols: HeaderIndex[]) {
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const format = this.getFormat(sheetId, refColumn, row);
      if (format.style || format.format) {
        for (const col of targetCols) {
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
        for (const row of targetRows) {
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

  private getNextCellId(): number {
    const id = this.nextId;
    this.history.update("nextId", this.nextId + 1);
    return id;
  }

  private updateCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex, after: UpdateCellData) {
    const position = { sheetId, col, row };
    const before = this.getters.getCell(position);
    const hasContent = "content" in after || "formula" in after;

    // Compute the new cell properties
    const afterContent = hasContent ? replaceNewLines(after?.content) : before?.content || "";
    let style: Style | undefined;
    if (after.style !== undefined) {
      for (const key in after.style) {
        if (
          after.style[key] === this.getters.getCellDefaultStyleValue(position, key as keyof Style)
        ) {
          delete after.style[key];
        }
      }
      if (!after.style || Object.keys(after.style).length === 0) {
        style = undefined;
      } else {
        style = after.style;
      }
    } else {
      style = before?.style;
    }
    let format: Format | undefined;
    if (after.format !== undefined) {
      const defaultFormat = this.getters.getCellDefaultFormat(position);
      format = after.format === null ? undefined : after.format;
      if ((format ?? "") === (defaultFormat ?? "")) {
        format = undefined;
      }
    } else {
      format = before?.format;
    }

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
      format === undefined
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

    const cellId = before?.id || this.getNextCellId();
    const cell = this.createCell(cellId, afterContent, format, style, sheetId);
    this.history.update("cells", sheetId, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cellId: cell.id, col, row, sheetId });
  }

  private createCell(
    id: number,
    content: string,
    format: Format | undefined,
    style: Style | undefined,
    sheetId: UID
  ): Cell {
    if (!content.startsWith("=")) {
      return this.createLiteralCell(id, content, format, style);
    }
    return this.createFormulaCell(id, content, format, style, sheetId);
  }

  private createLiteralCell(
    id: number,
    content: string,
    format: Format | undefined,
    style: Style | undefined
  ): LiteralCell {
    const locale = this.getters.getLocale();
    const parsedValue = parseLiteral(content, locale);

    format =
      format !== undefined
        ? format
        : typeof parsedValue === "number"
        ? detectDateFormat(content, locale) || detectNumberFormat(content)
        : undefined;
    if (!isTextFormat(format) && !content.startsWith("'") && !isEvaluationError(content)) {
      content = toString(parsedValue);
    }
    return {
      id,
      content,
      style,
      format,
      isFormula: false,
      parsedValue,
    };
  }

  private createFormulaCell(
    id: number,
    content: string,
    format: Format | undefined,
    style: Style | undefined,
    sheetId: UID
  ): FormulaCell {
    const compiledFormula = compile(content);
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
    id: number,
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

  private checkCellOutOfSheet(cmd: PositionDependentCommand): CommandResult {
    const { sheetId, col, row } = cmd;
    const sheet = this.getters.tryGetSheet(sheetId);
    if (!sheet) {
      return CommandResult.InvalidSheetId;
    }
    const sheetZone = this.getters.getSheetZone(sheetId);
    return isInside(col, row, sheetZone) ? CommandResult.Success : CommandResult.TargetOutOfSheet;
  }

  private checkUselessClearCell(cmd: ClearCellCommand): CommandResult {
    const cell = this.getters.getCell(cmd);
    if (!cell) {
      return CommandResult.NoChanges;
    }
    if (!cell.content && !cell.style && !cell.format) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }

  private checkUselessUpdateCell(cmd: UpdateCellCommand): CommandResult {
    const cell = this.getters.getCell(cmd);
    const hasContent = "content" in cmd || "formula" in cmd;
    const hasStyle = "style" in cmd;
    const hasFormat = "format" in cmd;
    if (
      (!hasContent || cell?.content === cmd.content) &&
      (!hasStyle || deepEquals(cell?.style, cmd.style)) &&
      (!hasFormat || cell?.format === cmd.format)
    ) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }
}

export class FormulaCellWithDependencies implements FormulaCell {
  readonly isFormula = true;
  readonly compiledFormula: RangeCompiledFormula;
  constructor(
    readonly id: number,
    compiledFormula: CompiledFormula,
    readonly format: Format | undefined,
    readonly style: Style | undefined,
    dependencies: Range[],
    private readonly sheetId: UID,
    private readonly getRangeString: (
      range: Range,
      sheetId: UID,
      option?: { useBoundedReference: boolean }
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
            useBoundedReference: true,
          });
        }
        return token.value;
      })
    );
  }
}

class RangeReferenceToken implements Token {
  type = "REFERENCE" as const;

  constructor(
    private ranges: Range[],
    private rangeIndex: number,
    private sheetId,
    private getRangeString: (range: Range, sheetId: UID) => string
  ) {}

  get value() {
    const range = this.ranges[this.rangeIndex];
    return this.getRangeString(range, this.sheetId);
  }
}
