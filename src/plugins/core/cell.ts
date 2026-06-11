import { DEFAULT_NUMBER_STYLE, DEFAULT_STYLE } from "../../constants";
import { PositionMap } from "../../helpers/cells/position_map";
import {
  getItemId,
  groupItemIdsByZones,
  iterateItemIdsPositions,
} from "../../helpers/data_normalization";
import {
  deepEquals,
  groupConsecutive,
  isDefined,
  range,
  replaceNewLines,
} from "../../helpers/misc";

import { toXC } from "../../helpers/coordinates";
import { CorePlugin } from "../core_plugin";

import { isInside } from "../../helpers/zones";
import { Cell } from "../../types/cells";
import {
  AddColumnsRowsCommand,
  ClearCellCommand,
  CommandResult,
  CoreCommand,
  PositionDependentCommand,
  SetFormattingCommand,
  UpdateCellCommand,
} from "../../types/commands";
import { CellPosition, HeaderIndex, RangeAdapterFunctions, UID } from "../../types/misc";

import { CompiledFormula, SerializedCompiledFormula } from "../../formulas/compiler";
import {
  createCell,
  createFormulaCellFromCompiledFormula,
  RegionFormulaCell,
} from "../../helpers/cells/cell_evaluation";
import { isExcelCompatible } from "../../helpers/format/format";
import { isNumber } from "../../helpers/numbers";
import { recomputeZones } from "../../helpers/recompute_zones";
import { Format } from "../../types/format";
import { DEFAULT_LOCALE } from "../../types/locale";
import { Style, UpdateCellData, Zone } from "../../types/misc";
import { Range, RangePart } from "../../types/range";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { SquishedContent, Squisher } from "./squisher";
import { UnsquishedRegionCell, Unsquisher } from "./unsquisher";

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Record<number, Cell | undefined> | undefined>;
  // this.grid[sheetId][row][col] --> cellId|undefined (position --> id)
  grid: Record<UID, Record<number, Record<number, number | undefined> | undefined> | undefined>;
  // this.positions[cellId] --> position (id --> position)
  positions: Record<number, CellPosition | undefined>;
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
    "getCell",
    "getCellPosition",
    "tryGetCellPosition",
    "getRowCellIds",
    "getTranslatedCellFormula",
    "getCellStyle",
    "getCellById",
    "getFormulaString",
    "getFormulaMovedInSheet",
  ] as const;
  readonly nextId = 1;
  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};
  public readonly grid: {
    [sheetId: string]:
      | { [row: number]: { [col: number]: number | undefined } | undefined }
      | undefined;
  } = {};
  public readonly positions: Record<number, CellPosition | undefined> = {};

  adaptRanges(adapters: RangeAdapterFunctions) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (!cell.isFormula) {
          continue;
        }
        const newCompiledFormula = adapters.adaptCompiledFormula(cell.compiledFormula);
        if (cell instanceof RegionFormulaCell) {
          // The flyweight has no writable compiledFormula: dissolve it into a
          // concrete cell holding the (possibly adapted) formula.
          if (newCompiledFormula !== cell.compiledFormula) {
            this.history.update(
              "cells",
              sheet,
              cell.id,
              createFormulaCellFromCompiledFormula(
                cell.id,
                newCompiledFormula,
                cell.format,
                cell.style
              )
            );
          }
        } else if (newCompiledFormula !== cell.compiledFormula) {
          this.history.update(
            "cells",
            sheet,
            cell.id,
            "compiledFormula" as any,
            newCompiledFormula
          );
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
      case "SET_FORMATTING":
        return this.checkUselessSetFormatting(cmd);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_FORMATTING":
        this.setStyleFormat(cmd.sheetId, cmd.target, cmd.style, cmd.format);
        break;
      case "CLEAR_FORMATTING":
        this.clearFormatting(cmd.sheetId, cmd.target);
        break;
      case "ADD_COLUMNS_ROWS": {
        const addedIndex = cmd.position === "before" ? cmd.base : cmd.base + 1;
        this.moveCellsOnAddition(
          cmd.sheetId,
          addedIndex,
          cmd.quantity,
          cmd.dimension === "COL" ? "columns" : "rows"
        );
        if (cmd.dimension === "COL") {
          this.handleAddColumnsRows(cmd, this.copyColumnStyle.bind(this));
        } else {
          this.handleAddColumnsRows(cmd, this.copyRowStyle.bind(this));
        }
        break;
      }
      case "REMOVE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.removeColumns(cmd.sheetId, [...cmd.elements]);
        } else {
          this.removeRows(cmd.sheetId, [...cmd.elements]);
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

      case "CLEAR_CELLS":
        this.clearCells(cmd.sheetId, cmd.target);
        break;

      case "DELETE_CONTENT":
        this.clearZones(cmd.sheetId, cmd.target);
        break;
      case "DELETE_SHEET": {
        for (const cell of this.getCells(cmd.sheetId)) {
          this.history.update("positions", cell.id, undefined);
        }
        this.history.update("cells", cmd.sheetId, undefined);
        this.history.update("grid", cmd.sheetId, undefined);
      }
    }
  }

  /**
   * Set the cell at a new position and clear its previous position.
   */
  private setNewPosition(cellId: number, sheetId: UID, col: HeaderIndex, row: HeaderIndex) {
    const currentPosition = this.positions[cellId];
    if (currentPosition) {
      this.clearPosition(sheetId, currentPosition.col, currentPosition.row);
    }
    this.history.update("positions", cellId, { row, col, sheetId });
    this.history.update("grid", sheetId, row, col, cellId);
  }

  /**
   * Remove the cell at the given position (if there's one)
   */
  private clearPosition(sheetId: UID, col: HeaderIndex, row: HeaderIndex) {
    const cellId = this.grid[sheetId]?.[row]?.[col];
    if (cellId) {
      this.history.update("positions", cellId, undefined);
      this.history.update("grid", sheetId, row, col, undefined);
    }
  }

  private removeColumns(sheetId: UID, columns: HeaderIndex[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    columns.sort((a, b) => b - a);
    for (const column of columns) {
      // Move the cells.
      this.moveCellOnColumnsDeletion(sheetId, column);
    }
  }

  private removeRows(sheetId: UID, rows: HeaderIndex[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    rows.sort((a, b) => b - a);

    for (const group of groupConsecutive(rows)) {
      // indexes are sorted in the descending order
      const from = group[group.length - 1];
      const to = group[0];
      // Move the cells.
      this.moveCellOnRowsDeletion(sheetId, from, to);
    }
  }

  private moveCellOnColumnsDeletion(sheetId: UID, deletedColumn: number) {
    this.dispatch("CLEAR_CELLS", {
      sheetId,
      target: [
        {
          left: deletedColumn,
          top: 0,
          right: deletedColumn,
          bottom: this.getters.getNumberRows(sheetId) - 1,
        },
      ],
    });

    const grid = this.grid[sheetId] || {};
    for (const rowKey in grid) {
      const rowIndex = Number(rowKey);
      const cells = grid[rowIndex]!;
      for (const i in cells) {
        const colIndex = Number(i);
        const cellId = cells[i];
        if (cellId) {
          if (colIndex > deletedColumn) {
            this.setNewPosition(cellId, sheetId, colIndex - 1, rowIndex);
          }
        }
      }
    }
  }

  /**
   * Move the cells after a column or rows insertion
   */
  private moveCellsOnAddition(
    sheetId: UID,
    addedElement: HeaderIndex,
    quantity: number,
    dimension: "rows" | "columns"
  ) {
    const updates: { cellId: number; col: HeaderIndex; row: HeaderIndex }[] = [];
    const grid = this.grid[sheetId] || {};
    for (const rowKey in grid) {
      const rowIndex = Number(rowKey);
      const cells = grid[rowIndex]!;
      if (dimension !== "rows" || rowIndex >= addedElement) {
        for (const i in cells) {
          const colIndex = Number(i);
          const cellId = cells[i];
          if (cellId) {
            if (dimension === "rows" || colIndex >= addedElement) {
              updates.push({
                cellId,
                col: colIndex + (dimension === "columns" ? quantity : 0),
                row: rowIndex + (dimension === "rows" ? quantity : 0),
              });
            }
          }
        }
      }
    }
    for (const update of updates.reverse()) {
      this.setNewPosition(update.cellId, sheetId, update.col, update.row);
    }
  }

  /**
   * Move all the cells that are from the row under `deleteToRow` up to `deleteFromRow`
   *
   * b.e.
   * move vertically with delete from 3 and delete to 5 will first clear all the cells from lines 3 to 5,
   * then take all the row starting at index 6 and add them back at index 3
   *
   */
  private moveCellOnRowsDeletion(
    sheetId: UID,
    deleteFromRow: HeaderIndex,
    deleteToRow: HeaderIndex
  ) {
    this.dispatch("CLEAR_CELLS", {
      sheetId,
      target: [
        {
          left: 0,
          top: deleteFromRow,
          right: this.getters.getNumberCols(sheetId),
          bottom: deleteToRow,
        },
      ],
    });

    const numberRows = deleteToRow - deleteFromRow + 1;
    const grid = this.grid[sheetId] || {};
    for (const rowKey in grid) {
      const rowIndex = Number(rowKey);
      const cells = grid[rowIndex]!;
      if (rowIndex > deleteToRow) {
        for (const i in cells) {
          const colIndex = Number(i);
          const cellId = cells[i];
          if (cellId) {
            this.setNewPosition(cellId, sheetId, colIndex, rowIndex - numberRows);
          }
        }
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
            style: null,
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
    const start = performance.now();
    for (const sheet of data.sheets) {
      const sheetId = sheet.id;
      const cellsData = new PositionMap<{
        compiledFormula?: CompiledFormula;
        region?: UnsquishedRegionCell;
        content?: string;
        style?: number;
        format?: number;
      }>();
      // cells content
      const unsquisher = new Unsquisher();
      for (const unsquishedItem of unsquisher.unsquishSheet(sheet.cells, sheet.id, this.getters)) {
        if (unsquishedItem.content || unsquishedItem.compiled || unsquishedItem.region) {
          const position = {
            sheetId: sheet.id,
            col: unsquishedItem.position.col,
            row: unsquishedItem.position.row,
          };
          if (unsquishedItem.compiled) {
            cellsData.set(position, { compiledFormula: unsquishedItem.compiled });
          } else if (unsquishedItem.region) {
            cellsData.set(position, { region: unsquishedItem.region });
          } else {
            cellsData.set(position, { content: unsquishedItem.content });
          }
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
        if (!cellData) {
          continue;
        }
        const style = cellData.style ? data.styles[cellData.style] : undefined;
        const format = cellData.format ? data.formats[cellData.format] : undefined;
        let cell: Cell | undefined;
        if (cellData.region) {
          const { template, dCol, dRow } = cellData.region;
          cell = new RegionFormulaCell(
            this.getNextCellId(),
            format,
            style,
            template,
            sheet.id,
            dCol,
            dRow,
            this.getters
          );
        } else if (
          cellData.content ||
          cellData.format ||
          cellData.style ||
          cellData.compiledFormula
        ) {
          cell = this.importCell(
            sheet.id,
            cellData.content,
            style,
            format,
            cellData.compiledFormula
          );
        }
        if (cell) {
          this.history.update("cells", sheet.id, cell.id, cell);
          this.setNewPosition(cell.id, position.sheetId, position.col, position.row);
        }
      }
    }
    console.debug("cells imported in", performance.now() - start, "ms");
  }

  export(data: WorkbookData, shouldSquish: boolean) {
    const styles: { [styleId: number]: Style } = {};
    const formats: { [formatId: number]: string } = {};
    for (const _sheet of data.sheets) {
      const squisher = new Squisher(this.getters);
      const positionsByStyle: Record<number, CellPosition[]> = [];
      const positionsByFormat: Record<number, CellPosition[]> = [];
      const cells: { [key: string]: SquishedContent } = {};
      const positions = Object.values(this.cells[_sheet.id] || {})
        .map((cell) => this.getters.getCellPosition(cell.id))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const position of positions) {
        const cell = this.getters.getCell(position)!;
        const style = this.extractCustomStyle(cell);
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
        const xc = toXC(position.col, position.row);
        if (cell.isFormula) {
          cells[xc] = shouldSquish
            ? squisher.squish(cell, _sheet.id)
            : cell.compiledFormula.toFormulaString(this.getters);
        } else if (cell.content) {
          cells[xc] = shouldSquish ? squisher.squish(cell, _sheet.id) : cell.content;
        }
      }
      _sheet.styles = groupItemIdsByZones(positionsByStyle);
      _sheet.formats = groupItemIdsByZones(positionsByFormat);
      _sheet.cells = shouldSquish ? squisher.squishSheet(cells, _sheet.id) : cells;
    }
    data.styles = styles;
    data.formats = formats;
  }

  importCell(
    sheetId: UID,
    content?: string,
    style?: Style,
    format?: Format,
    compiledFormula?: CompiledFormula | undefined
  ): Cell {
    const cellId = this.getNextCellId();
    if (compiledFormula) {
      return createFormulaCellFromCompiledFormula(cellId, compiledFormula, format, style);
    }
    return createCell(this.getters, cellId, content || "", format, style, sheetId, {
      avoidAutomaticDateFormat: true,
    });
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

  private extractCustomStyle(cell: Cell): Style {
    const cleanedStyle = { ...cell.style };
    const defaultStyle =
      !cell.isFormula && isNumber(cell.content, DEFAULT_LOCALE)
        ? DEFAULT_NUMBER_STYLE
        : DEFAULT_STYLE;
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

  getCell({ sheetId, col, row }: CellPosition): Cell | undefined {
    const cellId = this.grid[sheetId]?.[row]?.[col];
    if (cellId === undefined) {
      return undefined;
    }
    return this.cells[sheetId]?.[cellId];
  }

  getCellPosition(cellId: number): CellPosition {
    const position = this.positions[cellId];
    if (!position) {
      throw new Error(`asking for a cell position that doesn't exist, cell id: ${cellId}`);
    }
    return position;
  }

  tryGetCellPosition(cellId: number): CellPosition | undefined {
    return this.positions[cellId];
  }

  getRowCellIds(sheetId: UID, row: HeaderIndex): number[] {
    return Object.values(this.grid[sheetId]?.[row] || {}).filter(isDefined);
  }

  /**
   * get a cell by ID. Used in evaluation when evaluating an async cell, we need to be able to find it back after
   * starting an async evaluation even if it has been moved or re-allocated
   */
  getCellById(cellId: number): Cell | undefined {
    // this must be as fast as possible
    const position = this.positions[cellId];
    if (!position) {
      return undefined;
    }
    return this.cells[position.sheetId]?.[cellId];
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

  /**
   * Constructs a formula string based on an initial formula and a translation vector
   */
  getTranslatedCellFormula(
    sheetId: UID,
    offsetX: number,
    offsetY: number,
    compiledFormula: CompiledFormula | SerializedCompiledFormula
  ) {
    if (!(compiledFormula instanceof CompiledFormula)) {
      compiledFormula = CompiledFormula.CompileForSerializedFormula(sheetId, compiledFormula);
    }
    const adaptedDependencies = this.getters.createAdaptedRanges(
      compiledFormula.rangeDependencies,
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
    if (topLeft !== botRight && !sameCell) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  private setStyleFormat(
    sheetId: UID,
    target: Zone[],
    style: Style | undefined,
    format: Format | undefined
  ) {
    if (style === undefined && format === undefined) {
      return;
    }
    for (const zone of recomputeZones(target)) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.getters.getCell({ sheetId, col, row });
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: style ? { ...cell?.style, ...style } : undefined,
            format,
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
    const before = this.getters.getCell({ sheetId, col, row });
    const hasContent = after.content !== undefined || "formula" in after;

    // Compute the new cell properties
    let afterContent: string;
    if (hasContent) {
      afterContent = replaceNewLines(after?.content);
    } else {
      afterContent = before?.isFormula
        ? before.compiledFormula.toFormulaString(this.getters)
        : before?.content || "";
    }
    let style: Style | undefined;
    if (after.style !== undefined) {
      style = after.style || undefined;
    } else {
      style = before ? before.style : undefined;
    }
    const format = after.format !== undefined ? after.format : before && before.format;

    /* Read the following IF as:
     * we need to remove the cell if it is completely empty, but we can know if it is completely empty if:
     * - the command says the new content is empty and has no border/format/style
     * - the command has no content property, in this case
     *     - either there wasn't a cell at this place and the command says border/format/style is empty
     *     - or there was a cell at this place, but it's an empty cell and the command says border/format/style is empty
     *  */
    if (
      ((hasContent && !afterContent && !after.formula) ||
        (!hasContent && (!before || (!before.isFormula && before.content === "")))) &&
      !style &&
      !format
    ) {
      if (before) {
        this.history.update("cells", sheetId, before.id, undefined);
        this.clearPosition(sheetId, col, row);
      }
      return;
    }

    const cellId = before?.id || this.getNextCellId();
    const cell = createCell(this.getters, cellId, afterContent, format, style, sheetId);
    this.history.update("cells", sheetId, cell.id, cell);
    this.setNewPosition(cell.id, sheetId, col, row);
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
    if (!cell.isFormula && !cell.content && !cell.style && !cell.format) {
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
      (!hasContent ||
        (cell?.isFormula && cell.compiledFormula.toFormulaString(this.getters) === cmd.content) ||
        (!cell?.isFormula && cell?.content === cmd.content)) &&
      (!hasStyle || deepEquals(cell?.style, cmd.style)) &&
      (!hasFormat || cell?.format === cmd.format)
    ) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }

  private checkUselessSetFormatting(cmd: SetFormattingCommand) {
    const { sheetId, target } = cmd;
    const hasStyle = "style" in cmd;
    const hasFormat = "format" in cmd;
    if (!hasStyle && !hasFormat) {
      return CommandResult.NoChanges;
    }
    for (const zone of recomputeZones(target)) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const position = { sheetId, col, row };
          const cell = this.getters.getCell(position);
          if (
            (hasStyle && !deepEquals(cell?.style, cmd.style)) ||
            (hasFormat && cell?.format !== cmd.format)
          ) {
            return CommandResult.Success;
          }
        }
      }
    }
    return CommandResult.NoChanges;
  }
}
