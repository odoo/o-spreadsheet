import { compile, CompiledFormula, SerializedBananaCompiledFormula } from "../../formulas/compiler";
import { isEvaluationError, toString } from "../../functions/helpers";
import { PositionMap } from "../../helpers/cells/position_map";
import {
  getItemId,
  groupItemIdsByZones,
  iterateItemIdsPositions,
} from "../../helpers/data_normalization";
import { deepEquals, range, replaceNewLines } from "../../helpers/misc";

import { toXC } from "../../helpers/coordinates";
import { CorePlugin } from "../core_plugin";

import { recomputeZones } from "../../helpers/recompute_zones";
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
import {
  AdaptSheetName,
  ApplyRangeChange,
  CellPosition,
  HeaderIndex,
  Style,
  UID,
  UpdateCellData,
  Zone,
} from "../../types/misc";

import { parseLiteral } from "../../helpers/cells/cell_evaluation";
import {
  detectDateFormat,
  detectNumberFormat,
  isExcelCompatible,
  isTextFormat,
} from "../../helpers/format/format";
import { CoreGetters } from "../../types/core_getters";
import { Format } from "../../types/format";
import { Range, RangePart } from "../../types/range";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { SquishedCell, Squisher } from "./squisher";
import { Unsquisher } from "./unsquisher";

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Record<UID, Cell | undefined> | undefined>;
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

  adaptRanges(applyChange: ApplyRangeChange, sheetId: UID, sheetName: AdaptSheetName) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (cell.isFormula) {
          for (const range of cell.compiledFormula.rangeDependencies) {
            if (range.sheetId === sheetId || range.invalidSheetName === sheetName.old) {
              const change = applyChange(range);
              if (change.changeType !== "NONE") {
                this.history.update(
                  "cells",
                  sheet,
                  cell.id,
                  "compiledFormula" as any,
                  "rangeDependencies",
                  cell.compiledFormula.rangeDependencies.indexOf(range),
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
      case "SET_FORMATTING":
        if ("format" in cmd && cmd.format !== undefined) {
          this.setFormatter(cmd.sheetId, cmd.target, cmd.format);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearFormatting(cmd.sheetId, cmd.target);
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.handleAddColumnsRows(cmd, this.copyColumnFormat.bind(this));
        } else {
          this.handleAddColumnsRows(cmd, this.copyRowFormat.bind(this));
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
          format: "",
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
   * Set a format to all the cells in a zone
   */
  private setFormatter(sheetId: UID, zones: Zone[], format: Format) {
    for (const zone of recomputeZones(zones)) {
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
    for (const zone of recomputeZones(zones)) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            format: "",
          });
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
            format: "",
          });
        }
      }
    }
  }

  /**
   * Copy the format of the reference column/row to the new columns/rows.
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
    console.debug("starting loading sheets");
    const start = performance.now();
    for (const sheet of data.sheets) {
      const sheetId = sheet.id;
      const cellsData = new PositionMap<{
        compiledFormula?: CompiledFormula;
        content?: string;
        style?: number;
        format?: number;
      }>();
      // cells content
      const unsquisher = new Unsquisher();
      for (const unsquishedItem of unsquisher.unsquishSheet(
        sheet.cells,
        sheet.id,
        this.getters.getRangeFromSheetXC
      )) {
        if (unsquishedItem.content || unsquishedItem.compiled) {
          const position = {
            sheetId: sheet.id,
            col: unsquishedItem.position.col,
            row: unsquishedItem.position.row,
          };
          if (unsquishedItem.compiled) {
            cellsData.set(position, { compiledFormula: unsquishedItem.compiled });
          } else {
            cellsData.set(position, { content: unsquishedItem.content });
          }
        }
      }
      // cell format
      for (const [position, itemId] of iterateItemIdsPositions(sheet.id, sheet.formats)) {
        const cellData = cellsData.get(position);
        if (cellData) {
          cellData["format"] = itemId;
        } else {
          cellsData.set(position, { format: itemId });
        }
      }
      for (const position of cellsData.keysForSheet(sheetId)) {
        const cellData = cellsData.get(position);
        if (cellData?.content || cellData?.format || cellData?.compiledFormula) {
          const cell = this.importCell(
            sheet.id,
            cellData?.content,
            cellData?.format ? data.formats[cellData?.format] : undefined,
            cellData?.compiledFormula
          );
          this.history.update("cells", sheet.id, cell.id, cell);
          this.dispatch("UPDATE_CELL_POSITION", {
            cellId: cell.id,
            ...position,
          });
        }
      }
    }
    console.debug("done importing sheets in ", performance.now() - start);
  }

  export(data: WorkbookData, shouldSquish: boolean) {
    const formats: { [formatId: number]: string } = {};
    for (const _sheet of data.sheets) {
      const squisher = new Squisher(this.getters);
      const positionsByFormat: Record<number, CellPosition[]> = [];
      const cells: { [key: string]: string | SquishedCell } = {};
      const positions = Object.keys(this.cells[_sheet.id] || {})
        .map((cellId) => this.getters.getCellPosition(cellId))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const position of positions) {
        const cell = this.getters.getCell(position)!;
        if (cell.format) {
          const formatId = getItemId<Format>(cell.format, formats);
          positionsByFormat[formatId] ??= [];
          positionsByFormat[formatId].push(position);
        }
        const xc = toXC(position.col, position.row);
        if (cell.isFormula) {
          if (shouldSquish) {
            cells[xc] = squisher.squish(cell, _sheet.id);
          } else {
            cells[xc] = cell.compiledFormula.toFormulaString(this.getters);
          }
        } else {
          if (cell.content) {
            cells[xc] = cell.content;
          }
        }
      }
      _sheet.formats = groupItemIdsByZones(positionsByFormat);
      _sheet.cells = squisher.squishSheet(cells);
    }
    data.formats = formats;
  }

  importCell(
    sheetId: UID,
    content?: string,
    format?: Format,
    compiledFormula?: CompiledFormula | undefined
  ): Cell {
    const cellId = this.getNextUid();
    if (compiledFormula) {
      return this.createFormulaCellFromCompiledFormula(cellId, compiledFormula, format, sheetId);
    }
    return this.createCell(cellId, content || "", format, sheetId);
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data, false);
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
   * Reconstructs the original formula string based on new dependencies
   */
  getFormulaString(
    sheetId: UID,
    compiledFormula: CompiledFormula,
    dependencies: Range[],
    useBoundedReference: boolean = false
  ): string {
    const newFormula = CompiledFormula.CopyWithDependencies(compiledFormula, sheetId, dependencies);
    return newFormula.toFormulaString(this.getters, { useBoundedReference });
  }

  /*
   * Constructs a formula string based on an initial formula and a translation vector
   */
  getTranslatedCellFormula(
    sheetId: UID,
    offsetX: number,
    offsetY: number,
    compiledFormula: CompiledFormula | SerializedBananaCompiledFormula
  ) {
    if (!(compiledFormula instanceof CompiledFormula)) {
      compiledFormula = CompiledFormula.CompileForSerializedFormula(sheetId, compiledFormula);
    }
    const adaptedDependencies = this.getters.createAdaptedRanges(
      (compiledFormula as CompiledFormula).rangeDependencies,
      offsetX,
      offsetY,
      sheetId
    );

    return this.getFormulaString(sheetId, compiledFormula as CompiledFormula, adaptedDependencies);
  }

  getFormulaMovedInSheet(targetSheetId: UID, compiledFormula: CompiledFormula) {
    const adaptedDependencies = this.getters.removeRangesSheetPrefix(
      targetSheetId,
      compiledFormula.rangeDependencies
    );
    return CompiledFormula.CopyWithDependencies(
      compiledFormula,
      targetSheetId,
      adaptedDependencies
    ).toFormulaString(this.getters);
    //this.getFormulaString(targetSheetId, compiledFormula, adaptedDependencies);
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
   * Copy the format of one column to other columns.
   */
  private copyColumnFormat(sheetId: UID, refColumn: HeaderIndex, targetCols: HeaderIndex[]) {
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const format = this.getFormat(sheetId, refColumn, row);
      if (format.format) {
        for (const col of targetCols) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * Copy the format of one row to other rows.
   */
  private copyRowFormat(sheetId: UID, refRow: HeaderIndex, targetRows: HeaderIndex[]) {
    for (let col = 0; col < this.getters.getNumberCols(sheetId); col++) {
      const format = this.getFormat(sheetId, col, refRow);
      if (format.format) {
        for (const row of targetRows) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * gets the currently used style and format of a cell based on it's coordinates
   */
  private getFormat(sheetId: UID, col: HeaderIndex, row: HeaderIndex): { format?: Format } {
    const format: { style?: Style; format?: string } = {};
    const position = this.getters.getMainCellPosition({ sheetId, col, row });
    const cell = this.getters.getCell(position);
    if (cell) {
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

    const beforeContent = before?.isFormula
      ? before.compiledFormula.toFormulaString(this.getters)
      : before?.content;

    // Compute the new cell properties
    const afterContent = hasContent ? replaceNewLines(after?.content) : beforeContent || "";
    const format = "format" in after ? after.format : before && before.format;

    /* Read the following IF as:
     * we need to remove the cell if it is completely empty, but we can know if it completely empty if:
     * - the command says the new content is empty and has no format
     * - the command has no content property, in this case
     *     - either there wasn't a cell at this place and the command says format is empty
     *     - or there was a cell at this place, but it's an empty cell and the command says format is empty
     *  */
    if (
      ((hasContent && !afterContent && !after.formula) ||
        (!hasContent && (!before || beforeContent === ""))) &&
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
    const cell = this.createCell(cellId, afterContent, format, sheetId);
    this.history.update("cells", sheetId, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cellId: cell.id, col, row, sheetId });
  }

  private createCell(id: UID, content: string, format: Format | undefined, sheetId: UID): Cell {
    if (!content.startsWith("=")) {
      return this.createLiteralCell(id, content, format);
    }
    return this.createFormulaCell(id, content, format, sheetId);
  }

  private createLiteralCell(id: UID, content: string, format: Format | undefined): LiteralCell {
    const locale = this.getters.getLocale();
    const parsedValue = parseLiteral(content, locale);

    format =
      format ||
      (typeof parsedValue === "number"
        ? detectDateFormat(content, locale) || detectNumberFormat(content)
        : undefined);
    if (!isTextFormat(format) && !content.startsWith("'") && !isEvaluationError(content)) {
      content = toString(parsedValue);
    }
    return {
      id,
      content,
      format,
      isFormula: false,
      parsedValue,
    };
  }

  private createFormulaCell(
    id: UID,
    content: string,
    format: Format | undefined,
    sheetId: UID
  ): FormulaCell {
    const compiledFormula = compile(content, sheetId);
    if (
      compiledFormula.dependencies.length ||
      compiledFormula.literalValues.numbers.length ||
      compiledFormula.literalValues.strings.length
    ) {
      return this.createFormulaCellWithDependencies(id, compiledFormula, format, sheetId);
    }
    return {
      id,
      //content,
      format,
      isFormula: true,
      compiledFormula,
    };
  }

  private createFormulaCellFromCompiledFormula(
    id: UID,
    compiledFormula: CompiledFormula,
    format: Format | undefined,
    sheetId: UID
  ): FormulaCell {
    if (
      compiledFormula.hasDependencies ||
      compiledFormula.literalValues.numbers.length ||
      compiledFormula.literalValues.strings.length
    ) {
      return this.createFormulaCellWithDependencies(id, compiledFormula, format, sheetId);
    }
    return {
      id,
      //content: compiledFormula.toFormulaString(this.getters),
      format,
      isFormula: true,
      compiledFormula,
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
    sheetId: UID
  ): FormulaCell {
    compiledFormula.convertXCDependenciesToRange(this.getters.getRangeFromSheetXC, sheetId);

    return new FormulaCellWithDependencies(id, compiledFormula, format, this.getters);
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
    const style = this.getters.getCellStyle(cmd);
    if (!cell) {
      return CommandResult.NoChanges;
    }
    const cellIsEmpty = !cell.isFormula && !cell.content;
    if (cellIsEmpty && !style && !cell.format) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }

  private checkUselessUpdateCell(cmd: UpdateCellCommand): CommandResult {
    const cell = this.getters.getCell(cmd);
    const hasContent = "content" in cmd || "formula" in cmd;
    const hasStyle = "style" in cmd;
    const oldStyle = hasStyle && this.getters.getCellStyle(cmd);
    const hasFormat = "format" in cmd;
    const cellContent = cell?.isFormula
      ? cell.compiledFormula.toFormulaString(this.getters)
      : cell?.content;
    if (
      (!hasContent || cellContent === cmd.content) &&
      (!hasStyle || deepEquals(oldStyle, cmd.style)) &&
      (!hasFormat || cell?.format === cmd.format)
    ) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }
}

export class FormulaCellWithDependencies implements FormulaCell {
  readonly isFormula = true;
  readonly compiledFormula: CompiledFormula;

  constructor(
    readonly id: UID,
    compiledFormula: CompiledFormula,
    readonly format: Format | undefined,
    private readonly getters: CoreGetters
  ) {
    this.compiledFormula = compiledFormula;
    this.getters = getters;
  }

  get content() {
    throw new Error("no content for you!");
    return this.compiledFormula.toFormulaString(this.getters);
  }
}
