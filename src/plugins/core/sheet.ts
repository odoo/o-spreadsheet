import { DATETIME_FORMAT } from "../../constants";
import { compile, normalize } from "../../formulas";
import { FORMULA_REF_IDENTIFIER } from "../../formulas/tokenizer";
import { formatDateTime, parseDateTime } from "../../functions/dates";
import {
  createCols,
  createDefaultCols,
  createDefaultRows,
  createRows,
  exportCols,
  exportRows,
  formatNumber,
  formatStandardNumber,
  groupConsecutive,
  isDefined,
  isNumber,
  maximumDecimalPlaces,
  numberToLetters,
  parseNumber,
  range,
  stringify,
  toCartesian,
  toXC,
  uuidv4,
} from "../../helpers/index";
import { _lt } from "../../translation";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  CancelledReason,
  Cell,
  CellData,
  CellPosition,
  CellType,
  Col,
  CommandResult,
  ConsecutiveIndexes,
  CoreCommand,
  FormulaCell,
  Range,
  RenameSheetCommand,
  Row,
  Sheet,
  Style,
  UID,
  UpdateCellData,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

export interface SheetState {
  readonly sheets: Record<UID, Sheet | undefined>;
  readonly visibleSheets: UID[];
  readonly sheetIds: Record<string, UID | undefined>;
  readonly cellPosition: Record<UID, CellPosition | undefined>;
}

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

export class SheetPlugin extends CorePlugin<SheetState> implements SheetState {
  static getters = [
    "getSheetName",
    "getSheet",
    "tryGetSheet",
    "getSheetIdByName",
    "getSheets",
    "getVisibleSheets",
    "getEvaluationSheets",
    "getCol",
    "getRow",
    "getCell",
    "getCellPosition",
    "getColCells",
    "getColsZone",
    "getRowsZone",
    "getHiddenColsGroups",
    "getHiddenRowsGroups",
    "getCells",
    "getFormulaCellContent",
    "getCellText",
    "getCellValue",
    "getCellStyle",
    "buildFormulaContent",
  ];

  readonly sheetIds: Record<string, UID | undefined> = {};
  readonly visibleSheets: UID[] = []; // ids of visible sheets
  readonly sheets: Record<UID, Sheet | undefined> = {};
  readonly cellPosition: Record<UID, CellPosition | undefined> = {};

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    let cells: Record<UID, Cell | undefined> = {};
    for (const sheet of this.getSheets()) {
      cells = { ...cells, ...this.getters.getCells(sheet.id) };
    }

    for (const cell of Object.values(cells).filter(isDefined)) {
      if (cell.type === CellType.formula) {
        for (const range of cell.dependencies) {
          if (!sheetId || range.sheetId === sheetId) {
            const change = applyChange(range);
            if (change.changeType !== "NONE") {
              const { sheetId: sId, col, row } = this.getCellPosition(cell.id);
              this.history.update(
                "sheets",
                sId,
                "rows",
                row,
                "cells",
                col,
                "dependencies" as any,
                // @ts-ignore Should add update method type with 8 keys
                cell.dependencies.indexOf(range),
                change.range
              );
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult {
    if (cmd.type !== "CREATE_SHEET" && "sheetId" in cmd && this.sheets[cmd.sheetId] === undefined) {
      return {
        status: "CANCELLED",
        reason: CancelledReason.InvalidSheetId,
      };
    }
    switch (cmd.type) {
      case "CREATE_SHEET": {
        const { visibleSheets, sheets } = this;
        if (cmd.position > visibleSheets.length || cmd.position < 0) {
          return { status: "CANCELLED", reason: CancelledReason.WrongSheetPosition };
        }
        return !cmd.name || !visibleSheets.find((id) => sheets[id]!.name === cmd.name)
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
      }
      case "DUPLICATE_SHEET": {
        const { visibleSheets, sheets } = this;
        return !cmd.name || !visibleSheets.find((id) => sheets[id]!.name === cmd.name)
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
      }
      case "MOVE_SHEET":
        const currentIndex = this.visibleSheets.findIndex((id) => id === cmd.sheetId);
        if (currentIndex === -1) {
          return { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
        }
        return (cmd.direction === "left" && currentIndex === 0) ||
          (cmd.direction === "right" && currentIndex === this.visibleSheets.length - 1)
          ? { status: "CANCELLED", reason: CancelledReason.WrongSheetMove }
          : { status: "SUCCESS" };
      case "RENAME_SHEET":
        return this.isRenameAllowed(cmd);
      case "DELETE_SHEET":
        return this.visibleSheets.length > 1
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughSheets };
      case "REMOVE_COLUMNS_ROWS":
        const sheet = this.getSheet(cmd.sheetId);
        const length = cmd.dimension === "COL" ? sheet.cols.length : sheet.rows.length;
        return length > cmd.elements.length
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.NotEnoughElements };
      case "HIDE_COLUMNS_ROWS": {
        const sheet = this.sheets[cmd.sheetId]!;
        const hiddenGroup =
          cmd.dimension === "COL" ? sheet.hiddenColsGroups : sheet.hiddenRowsGroups;
        const elements = cmd.dimension === "COL" ? sheet.cols : sheet.rows;
        return (hiddenGroup || []).flat().concat(cmd.elements).length < elements.length
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.TooManyHiddenElements };
      }
      default:
        return { status: "SUCCESS" };
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "DELETE_CONTENT":
        this.clearZones(cmd.sheetId, cmd.target);
        break;
      case "CREATE_SHEET":
        const sheet = this.createSheet(
          cmd.sheetId,
          cmd.name || this.generateSheetName(),
          cmd.cols || 26,
          cmd.rows || 100,
          cmd.position
        );
        this.history.update("sheetIds", sheet.name, sheet.id);
        break;
      case "RESIZE_COLUMNS_ROWS":
        const dimension = cmd.dimension === "COL" ? "cols" : "rows";
        for (let elt of cmd.elements) {
          this.setHeaderSize(this.getSheet(cmd.sheetId), dimension, elt, cmd.size);
        }
        break;
      case "MOVE_SHEET":
        this.moveSheet(cmd.sheetId, cmd.direction);
        break;
      case "RENAME_SHEET":
        if (!cmd.interactive) {
          this.renameSheet(this.sheets[cmd.sheetId]!, cmd.name!);
        }
        break;
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetId, cmd.sheetIdTo, cmd.name);
        //   const cells = this.oldsCells[cmd.sheetId];
        //   if (cells) {
        //     this.history.update("oldsCells", cmd.sheetIdTo, JSON.parse(JSON.stringify(cells)));
        //   }
        break;
      case "DELETE_SHEET":
        this.deleteSheet(this.sheets[cmd.sheetId]!);
        break;

      case "REMOVE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.removeColumns(this.sheets[cmd.sheetId]!, cmd.elements);
        } else {
          this.removeRows(this.sheets[cmd.sheetId]!, cmd.elements);
        }
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.addColumns(this.sheets[cmd.sheetId]!, cmd.base, cmd.position, cmd.quantity);
          this.handleAddColumnsRows(cmd, this.copyColumnStyle.bind(this));
        } else {
          this.addRows(this.sheets[cmd.sheetId]!, cmd.base, cmd.position, cmd.quantity);
          this.handleAddColumnsRows(cmd, this.copyRowStyle.bind(this));
        }
        break;
      case "HIDE_COLUMNS_ROWS": {
        if (cmd.dimension === "COL") {
          this.setElementsVisibility(this.sheets[cmd.sheetId]!, cmd.elements, "cols", "hide");
        } else {
          this.setElementsVisibility(this.sheets[cmd.sheetId]!, cmd.elements, "rows", "hide");
        }
        break;
      }
      case "UNHIDE_COLUMNS_ROWS": {
        if (cmd.dimension === "COL") {
          this.setElementsVisibility(this.sheets[cmd.sheetId]!, cmd.elements, "cols", "show");
        } else {
          this.setElementsVisibility(this.sheets[cmd.sheetId]!, cmd.elements, "rows", "show");
        }
        break;
      }
      case "SET_FORMATTING":
        if ("style" in cmd) {
          this.setStyle(cmd.sheetId, cmd.target, cmd.style);
        }
        if ("format" in cmd && cmd.format !== undefined) {
          this.setFormatter(cmd.sheetId, cmd.target, cmd.format);
        }
        break;
      case "SET_DECIMAL":
        this.setDecimal(cmd.sheetId, cmd.target, cmd.step);
        break;
      case "CLEAR_FORMATTING":
        this.clearStyles(cmd.sheetId, cmd.target);
        break;
      case "UPDATE_CELL":
        this.updateCell(this.getters.getSheet(cmd.sheetId), cmd.col, cmd.row, cmd);
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

  import(data: WorkbookData) {
    // we need to fill the sheetIds mapping first, because otherwise formulas
    // that depends on a sheet not already imported will not be able to be
    // compiled
    for (let sheet of data.sheets) {
      this.sheetIds[sheet.name] = sheet.id;
    }

    for (let sheetData of data.sheets) {
      const name = sheetData.name || `Sheet${Object.keys(this.sheets).length + 1}`;
      const sheet: Sheet = {
        id: sheetData.id,
        name: name,
        cols: createCols(sheetData.cols || {}, sheetData.colNumber),
        rows: createRows(sheetData.rows || {}, sheetData.rowNumber),
        hiddenColsGroups: [],
        hiddenRowsGroups: [],
      };
      this.visibleSheets.push(sheet.id);
      this.sheets[sheet.id] = sheet;
      this.updateHiddenElementsGroups(sheet.id, "cols");
      this.updateHiddenElementsGroups(sheet.id, "rows");
    }
    for (let sheetData of data.sheets) {
      for (let xc in sheetData.cells) {
        const cell = sheetData.cells[xc];
        const [col, row] = toCartesian(xc);
        const style = (cell && cell.style && data.styles[cell.style]) || undefined;
        const sheet = this.getSheet(sheetData.id);
        this.updateCell(sheet, col, row, {
          content: cell?.content,
          formula: cell?.formula,
          format: cell?.format,
          style,
        });
      }
    }
  }

  export(data: WorkbookData) {
    data.sheets = this.visibleSheets.filter(isDefined).map((id) => {
      const sheet = this.sheets[id]!;
      return {
        id: sheet.id,
        name: sheet.name,
        colNumber: sheet.cols.length,
        rowNumber: sheet.rows.length,
        rows: exportRows(sheet.rows),
        cols: exportCols(sheet.cols),
        merges: [],
        cells: {},
        conditionalFormats: [],
        figures: [],
      };
    });
    let styleId = 0;
    const styles: { [styleId: number]: Style } = {};
    /**
     * Get the id of the given style. If the style does not exist, it creates
     * one.
     */
    function getStyleId(style: Style) {
      for (let [key, value] of Object.entries(styles)) {
        if (stringify(value) === stringify(style)) {
          return parseInt(key, 10);
        }
      }
      styles[++styleId] = style;
      return styleId;
    }
    for (let _sheet of data.sheets) {
      const sheet = this.getSheet(_sheet.id);
      const cells: { [key: string]: CellData } = {};
      for (let col = 0; col < sheet.cols.length; col++) {
        for (let row = 0; row < sheet.rows.length; row++) {
          const cell = sheet.rows[row].cells[col];
          if (cell) {
            const xc = toXC(col, row);
            cells[xc] = {
              style: cell.style && getStyleId(cell.style),
              format: cell.format,
            };
            switch (cell.type) {
              case CellType.formula:
                cells[xc].formula = {
                  text: cell.formula.text || "",
                  dependencies:
                    cell.dependencies?.map((d) => this.getters.getRangeString(d, _sheet.id)) || [],
                };
                break;
              case CellType.number:
              case CellType.text:
              case CellType.invalidFormula:
                cells[xc].content = cell.content;
                break;
            }
          }
        }
      }
      _sheet.cells = cells;
    }
    data.styles = styles;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  tryGetSheet(sheetId: UID): Sheet | undefined {
    return this.sheets[sheetId];
  }

  getSheet(sheetId: UID): Sheet {
    const sheet = this.sheets[sheetId];
    if (!sheet) {
      throw new Error(`Sheet ${sheetId} not found.`);
    }
    return sheet;
  }

  getSheetName(sheetId: UID): string | undefined {
    return this.sheets[sheetId]?.name;
  }

  getSheetIdByName(name: string | undefined): UID | undefined {
    return name && this.sheetIds[name];
  }

  getSheets(): Sheet[] {
    const { visibleSheets, sheets } = this;
    return visibleSheets.map((id) => sheets[id]).filter(isDefined);
  }

  getVisibleSheets(): UID[] {
    return this.visibleSheets;
  }

  getEvaluationSheets(): Record<UID, Sheet | undefined> {
    return this.sheets;
  }

  getCol(sheetId: UID, index: number): Col | undefined {
    return this.sheets[sheetId]?.cols[index];
  }

  getRow(sheetId: UID, index: number): Row | undefined {
    return this.sheets[sheetId]?.rows[index];
  }

  getCell(sheetId: UID, col: number, row: number): Cell | undefined {
    const sheet = this.tryGetSheet(sheetId);
    return (sheet && sheet.rows[row] && sheet.rows[row].cells[col]) || undefined;
  }

  /**
   * Returns all the cells of a col
   */
  getColCells(sheetId: UID, col: number): Cell[] {
    return this.getSheet(sheetId).rows.reduce((acc: Cell[], cur) => {
      const cell = cur.cells[col];
      return cell !== undefined ? acc.concat(cell) : acc;
    }, []);
  }

  getColsZone(sheetId: UID, start: number, end: number): Zone {
    return {
      top: 0,
      bottom: this.getSheet(sheetId).rows.length - 1,
      left: start,
      right: end,
    };
  }

  getRowsZone(sheetId: UID, start: number, end: number): Zone {
    return {
      top: start,
      bottom: end,
      left: 0,
      right: this.getSheet(sheetId).cols.length - 1,
    };
  }

  getCellPosition(cellId: UID): CellPosition {
    const cell = this.cellPosition[cellId];
    if (!cell) {
      throw new Error(`asking for a cell position that doesn't exist, cell id: ${cellId}`);
    }
    return cell;
  }

  getHiddenColsGroups(sheetId: UID): ConsecutiveIndexes[] {
    return this.sheets[sheetId]?.hiddenColsGroups || [];
  }

  getHiddenRowsGroups(sheetId: UID): ConsecutiveIndexes[] {
    return this.sheets[sheetId]?.hiddenRowsGroups || [];
  }

  private setHeaderSize(sheet: Sheet, dimension: "cols" | "rows", index: number, size: number) {
    let start: number, end: number;
    const elements = sheet[dimension];
    const base = elements[index];
    const delta = size - base.size;
    this.history.update("sheets", sheet.id, dimension, index, "size", size);
    if (!base.isHidden)
      this.history.update("sheets", sheet.id, dimension, index, "end", base.end + delta);
    start = base.end;
    for (let i = index + 1; i < elements.length; i++) {
      const element = elements[i];
      end = element.isHidden ? start : start + element.size;
      this.history.update("sheets", sheet.id, dimension, i, "start", start);
      this.history.update("sheets", sheet.id, dimension, i, "end", end);
      start = end;
    }
  }

  private moveCell(cell: Cell, position: CellPosition) {
    const currentPosition = this.cellPosition[cell.id];
    if (currentPosition) {
      this.deleteCell(cell.id, currentPosition);
    }
    const { col, row, sheetId } = position;
    this.history.update("cellPosition", cell.id, position);
    this.history.update("sheets", sheetId, "rows", row, "cells", col, cell);
  }

  private deleteCell(cellId: UID, position: CellPosition) {
    this.history.update("cellPosition", cellId, undefined);
    this.history.update(
      "sheets",
      position.sheetId,
      "rows",
      position.row,
      "cells",
      position.col,
      undefined
    );
  }

  private updateCellPosition(sheetId: UID, col: number, row: number, cellId: UID, cell?: Cell) {
    if (cell) {
      this.moveCell(cell, { sheetId, col, row });
    } else {
      this.deleteCell(cellId, { sheetId, col, row });
    }
  }

  private clearZones(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.sheets[sheetId]!.rows[row].cells[col];
          if (cell) {
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

  private generateSheetName(): string {
    let i = 1;
    const names = this.getSheets().map((s) => s.name);
    const baseName = _lt("Sheet");
    let name = `${baseName}${i}`;
    while (names.includes(name)) {
      name = `${baseName}${i}`;
      i++;
    }
    return name;
  }

  private createSheet(
    id: UID,
    name: string,
    colNumber: number,
    rowNumber: number,
    position: number
  ): Sheet {
    const sheet: Sheet = {
      id,
      name,
      cols: createDefaultCols(colNumber),
      rows: createDefaultRows(rowNumber),
      hiddenColsGroups: [],
      hiddenRowsGroups: [],
    };
    const visibleSheets = this.visibleSheets.slice();
    visibleSheets.splice(position, 0, sheet.id);
    const sheets = this.sheets;
    this.history.update("visibleSheets", visibleSheets);
    this.history.update("sheets", Object.assign({}, sheets, { [sheet.id]: sheet }));
    return sheet;
  }

  private moveSheet(sheetId: UID, direction: "left" | "right") {
    const visibleSheets = this.visibleSheets.slice();
    const currentIndex = visibleSheets.findIndex((id) => id === sheetId);
    const sheet = visibleSheets.splice(currentIndex, 1);
    visibleSheets.splice(currentIndex + (direction === "left" ? -1 : 1), 0, sheet[0]);
    this.history.update("visibleSheets", visibleSheets);
  }

  private isRenameAllowed(cmd: RenameSheetCommand): CommandResult {
    if (cmd.interactive) {
      return { status: "SUCCESS" };
    }
    const name = cmd.name && cmd.name.trim().toLowerCase();
    if (!name) {
      return { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
    }
    return this.visibleSheets.findIndex((id) => this.sheets[id]?.name.toLowerCase() === name) === -1
      ? { status: "SUCCESS" }
      : { status: "CANCELLED", reason: CancelledReason.WrongSheetName };
  }

  private renameSheet(sheet: Sheet, name: string) {
    const oldName = sheet.name;
    this.history.update("sheets", sheet.id, "name", name.trim());
    const sheetIds = Object.assign({}, this.sheetIds);
    sheetIds[name] = sheet.id;
    delete sheetIds[oldName];
    this.history.update("sheetIds", sheetIds);
  }

  private duplicateSheet(fromId: UID, toId: UID, toName: string) {
    const sheet = this.sheets[fromId];
    const newSheet: Sheet = JSON.parse(JSON.stringify(sheet));
    newSheet.id = toId;
    newSheet.name = toName;

    for (let col = 0; col <= newSheet.cols.length; col++) {
      for (let row = 0; row <= newSheet.rows.length; row++) {
        if (newSheet.rows[row]) {
          newSheet.rows[row].cells[col] = undefined;
        }
      }
    }

    const visibleSheets = this.visibleSheets.slice();
    const currentIndex = visibleSheets.findIndex((id) => id === fromId);
    visibleSheets.splice(currentIndex + 1, 0, newSheet.id);
    this.history.update("visibleSheets", visibleSheets);
    this.history.update("sheets", Object.assign({}, this.sheets, { [newSheet.id]: newSheet }));

    for (const cell of Object.values(this.getCells(fromId))) {
      const { col, row } = this.getCellPosition(cell.id);
      this.updateCell(newSheet, col, row, {
        content: this.getCellText(cell, fromId, true),
        format: cell.format,
        style: cell.style,
      });
    }
    const sheetIds = Object.assign({}, this.sheetIds);
    sheetIds[newSheet.name] = newSheet.id;
    this.history.update("sheetIds", sheetIds);
  }

  private deleteSheet(sheet: Sheet) {
    const name = sheet.name;
    const sheets = Object.assign({}, this.sheets);
    delete sheets[sheet.id];
    this.history.update("sheets", sheets);

    const visibleSheets = this.visibleSheets.slice();
    const currentIndex = visibleSheets.findIndex((id) => id === sheet.id);
    visibleSheets.splice(currentIndex, 1);

    this.history.update("visibleSheets", visibleSheets);
    const sheetIds = Object.assign({}, this.sheetIds);
    delete sheetIds[name];
    this.history.update("sheetIds", sheetIds);
  }

  /**
   * Delete column. This requires a lot of handling:
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheet ID of the sheet on which deletion should be applied
   * @param columns Columns to delete
   */
  private removeColumns(sheet: Sheet, columns: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    columns.sort((a, b) => b - a);
    for (let column of columns) {
      // Move the cells.
      this.moveCellOnColumnsDeletion(sheet, column);
    }
    // Effectively delete the element and recompute the left-right.
    this.updateColumnsStructureOnDeletion(sheet, columns);
  }

  /**
   * Delete row. This requires a lot of handling:
   * - Update the merges
   * - Update all the formulas in all sheets
   * - Move the cells
   * - Update the cols/rows (size, number, (cells), ...)
   * - Reevaluate the cells
   *
   * @param sheet ID of the sheet on which deletion should be applied
   * @param rows Rows to delete
   */
  private removeRows(sheet: Sheet, rows: number[]) {
    // This is necessary because we have to delete elements in correct order:
    // begin with the end.
    rows.sort((a, b) => b - a);

    for (let group of groupConsecutive(rows)) {
      // Move the cells.
      this.moveCellOnRowsDeletion(sheet, group[group.length - 1], group[0]);

      // Effectively delete the element and recompute the left-right/top-bottom.
      group.map((row) => this.updateRowsStructureOnDeletion(row, sheet));
    }
  }

  private addColumns(sheet: Sheet, column: number, position: "before" | "after", quantity: number) {
    // Move the cells.
    this.moveCellsOnAddition(
      sheet,
      position === "before" ? column : column + 1,
      quantity,
      "columns"
    );

    // Recompute the left-right/top-bottom.
    this.updateColumnsStructureOnAddition(sheet, column, quantity);
  }

  private addRows(sheet: Sheet, row: number, position: "before" | "after", quantity: number) {
    this.addEmptyRows(sheet, quantity);

    // Move the cells.
    this.moveCellsOnAddition(sheet, position === "before" ? row : row + 1, quantity, "rows");

    // Recompute the left-right/top-bottom.
    this.updateRowsStructureOnAddition(sheet, row, quantity);
  }

  private moveCellOnColumnsDeletion(sheet: Sheet, deletedColumn: number) {
    for (let [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      for (let i in row.cells) {
        const colIndex = parseInt(i, 10);
        const cell = row.cells[i];
        if (cell) {
          if (colIndex === deletedColumn) {
            this.dispatch("CLEAR_CELL", {
              sheetId: sheet.id,
              col: colIndex,
              row: rowIndex,
            });
          }
          if (colIndex > deletedColumn) {
            this.updateCellPosition(sheet.id, colIndex - 1, rowIndex, cell.id, cell);
          }
        }
      }
    }
  }

  /**
   * Move the cells after a column or rows insertion
   */
  private moveCellsOnAddition(
    sheet: Sheet,
    addedElement: number,
    quantity: number,
    dimension: "rows" | "columns"
  ) {
    const commands: { sheetId: UID; col: number; row: number; cellId: UID; cell?: Cell }[] = [];
    for (const [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      if (dimension !== "rows" || rowIndex >= addedElement) {
        for (let i in row.cells) {
          const colIndex = parseInt(i, 10);
          const cell = row.cells[i];
          if (cell) {
            if (dimension === "rows" || colIndex >= addedElement) {
              commands.unshift({
                sheetId: sheet.id,
                cellId: cell.id,
                cell: cell,
                col: colIndex + (dimension === "columns" ? quantity : 0),
                row: rowIndex + (dimension === "rows" ? quantity : 0),
              });
            }
          }
        }
      }
    }
    for (let cmd of commands) {
      this.updateCellPosition(cmd.sheetId, cmd.col, cmd.row, cmd.cellId, cmd.cell);
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
  private moveCellOnRowsDeletion(sheet: Sheet, deleteFromRow: number, deleteToRow: number) {
    const numberRows = deleteToRow - deleteFromRow + 1;
    for (let [index, row] of Object.entries(sheet.rows)) {
      const rowIndex = parseInt(index, 10);
      if (rowIndex >= deleteFromRow && rowIndex <= deleteToRow) {
        for (let i in row.cells) {
          const colIndex = parseInt(i, 10);
          const cell = row.cells[i];
          if (cell) {
            this.dispatch("CLEAR_CELL", {
              sheetId: sheet.id,
              col: colIndex,
              row: rowIndex,
            });
          }
        }
      }
      if (rowIndex > deleteToRow) {
        for (let i in row.cells) {
          const colIndex = parseInt(i, 10);
          const cell = row.cells[i];
          if (cell) {
            this.updateCellPosition(sheet.id, colIndex, rowIndex - numberRows, cell.id, cell);
          }
        }
      }
    }
  }

  /**
   * Update the cols of the sheet after a deletion:
   * - Rename the cols
   * - Update start-end
   *
   * @param sheet Sheet on which the deletion occurs
   * @param deletedColumns Indexes of the deleted columns
   */
  private updateColumnsStructureOnDeletion(sheet: Sheet, deletedColumns: number[]) {
    const cols: Col[] = [];
    let start = 0;
    let colSizeIndex = 0;
    for (let index in sheet.cols) {
      if (deletedColumns.includes(parseInt(index, 10))) {
        continue;
      }
      const { size, isHidden } = sheet.cols[index];
      const end = isHidden ? start : start + size;
      cols.push({
        name: numberToLetters(colSizeIndex),
        size,
        start,
        end,
        isHidden,
      });
      start = end;
      colSizeIndex++;
    }
    this.history.update("sheets", sheet.id, "cols", cols);
    this.updateHiddenElementsGroups(sheet.id, "cols");
  }

  /**
   * Update the cols of the sheet after an addition:
   * - Rename the cols
   * - Update start-end
   *
   * @param sheet Sheet on which the deletion occurs
   * @param addedColumn Index of the added columns
   * @param columnsToAdd Number of the columns to add
   */
  private updateColumnsStructureOnAddition(
    sheet: Sheet,
    addedColumn: number,
    columnsToAdd: number
  ) {
    const cols: Col[] = [];
    let start = 0;
    let colIndex = 0;
    for (let i in sheet.cols) {
      if (parseInt(i, 10) === addedColumn) {
        const { size } = sheet.cols[colIndex];
        for (let a = 0; a < columnsToAdd; a++) {
          cols.push({
            name: numberToLetters(colIndex),
            size,
            start,
            end: start + size,
          });
          start += size;
          colIndex++;
        }
      }
      const { size, isHidden } = sheet.cols[i];
      const end = isHidden ? start : start + size;
      cols.push({
        name: numberToLetters(colIndex),
        size,
        start,
        end,
        isHidden,
      });
      start = end;
      colIndex++;
    }
    this.history.update("sheets", sheet.id, "cols", cols);
    this.updateHiddenElementsGroups(sheet.id, "cols");
  }

  private updateRowsStructureOnDeletion(index: number, sheet: Sheet) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    const cellsQueue = sheet.rows.map((row) => row.cells);
    for (let i in sheet.rows) {
      const row = sheet.rows[i];
      const { size, isHidden } = row;
      const end = isHidden ? start : start + size;
      if (parseInt(i, 10) === index) {
        continue;
      }
      rowIndex++;
      rows.push({
        start,
        end,
        size,
        cells: cellsQueue.shift()!,
        name: String(rowIndex),
        isHidden,
      });
      start = end;
    }
    this.history.update("sheets", sheet.id, "rows", rows);
    this.updateHiddenElementsGroups(sheet.id, "rows");
  }

  /**
   * Update the rows of the sheet after an addition:
   * - Rename the rows
   * - Update start-end
   *
   * @param sheet Sheet on which the deletion occurs
   * @param addedRow Index of the added row
   * @param rowsToAdd Number of the rows to add
   */
  private updateRowsStructureOnAddition(sheet: Sheet, addedRow: number, rowsToAdd: number) {
    const rows: Row[] = [];
    let start = 0;
    let rowIndex = 0;
    let sizeIndex = 0;
    const cellsQueue = sheet.rows.map((row) => row.cells);
    for (let i in sheet.rows) {
      const { size, isHidden } = sheet.rows[sizeIndex];
      const end = isHidden ? start : start + size;
      if (parseInt(i, 10) < addedRow || parseInt(i, 10) >= addedRow + rowsToAdd) {
        sizeIndex++;
      }
      rowIndex++;
      rows.push({
        start,
        end,
        size,
        cells: cellsQueue.shift()!,
        name: String(rowIndex),
        isHidden,
      });
      start = end;
    }
    this.history.update("sheets", sheet.id, "rows", rows);
    this.updateHiddenElementsGroups(sheet.id, "rows");
  }

  /**
   * Add empty rows at the end of the rows
   *
   * @param sheet Sheet
   * @param quantity Number of rows to add
   */
  private addEmptyRows(sheet: Sheet, quantity: number) {
    const lastEnd = sheet.rows[sheet.rows.length - 1].end;
    const rows: Row[] = sheet.rows.slice();
    for (let i = 0; i < quantity; i++) {
      rows.push({
        start: lastEnd,
        end: lastEnd,
        size: 0,
        name: (rows.length + 1).toString(),
        cells: {},
      });
    }
    this.history.update("sheets", sheet.id, "rows", rows);
  }

  // ----------------------------------------------------
  //  HIDE / SHOW
  // ----------------------------------------------------

  private setElementsVisibility(
    sheet: Sheet,
    elements: number[],
    direction: "cols" | "rows",
    visibility: "hide" | "show"
  ) {
    let start = 0;
    const hide = visibility === "hide";
    for (let index = 0; index < sheet[direction].length; index++) {
      const { size, isHidden } = sheet[direction][index];
      const newIsHidden: boolean = elements.includes(index) ? hide : isHidden || false;
      const end = newIsHidden ? start : start + size;
      this.history.update("sheets", sheet.id, direction, index, "start", start);
      this.history.update("sheets", sheet.id, direction, index, "end", end);
      this.history.update("sheets", sheet.id, direction, index, "isHidden", newIsHidden);
      start = end;
    }
    this.updateHiddenElementsGroups(sheet.id, direction);
  }

  private updateHiddenElementsGroups(sheetId: UID, dimension: "cols" | "rows") {
    const elements = this.sheets[sheetId]?.[dimension] || [];
    const elementsRef = dimension === "cols" ? "hiddenColsGroups" : "hiddenRowsGroups";
    const hiddenEltsGroups = elements.reduce((acc, currentElt, index) => {
      if (!currentElt.isHidden) {
        return acc;
      }
      const currentGroup = acc[acc.length - 1];
      if (!currentGroup || currentGroup[currentGroup.length - 1] != index - 1) {
        acc.push([]);
      }
      acc[acc.length - 1].push(index);
      return acc;
    }, [] as ConsecutiveIndexes[]);
    this.history.update("sheets", sheetId, elementsRef, hiddenEltsGroups);
  }

  /**
   * Set a format to all the cells in a zone
   */
  private setFormatter(sheetId: UID, zones: Zone[], format: string) {
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
   * This function allows to adjust the quantity of decimal places after a decimal
   * point on cells containing number value. It does this by changing the cells
   * format. Values aren't modified.
   *
   * The change of the decimal quantity is done one by one, the sign of the step
   * variable indicates whether we are increasing or decreasing.
   *
   * If several cells are in the zone, the format resulting from the change of the
   * first cell (with number type) will be applied to the whole zone.
   */
  private setDecimal(sheetId: UID, zones: Zone[], step: number) {
    // Find the first cell with a number value and get the format
    const numberFormat = this.searchNumberFormat(sheetId, zones);
    if (numberFormat !== undefined) {
      // Depending on the step sign, increase or decrease the decimal representation
      // of the format
      const newFormat = this.changeDecimalFormat(numberFormat, step);
      // Apply the new format on the whole zone
      this.setFormatter(sheetId, zones, newFormat!);
    }
  }

  /**
   * Take a range of cells and return the format of the first cell containing a
   * number value. Returns a default format if the cell hasn't format. Returns
   * undefined if no number value in the range.
   */
  private searchNumberFormat(sheetId: UID, zones: Zone[]): string | undefined {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          const cell = this.getters.getCell(sheetId, col, row);
          if (
            cell &&
            (cell.type === CellType.number ||
              (cell.type === CellType.formula && typeof cell.value === "number")) &&
            !cell.format?.match(DATETIME_FORMAT) // reject dates
          ) {
            return cell.format || this.setDefaultNumberFormat(cell.value as any);
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Function used to give the default format of a cell with a number for value.
   * It is considered that the default format of a number is 0 followed by as many
   * 0 as there are decimal places.
   *
   * Example:
   * - 1 --> '0'
   * - 123 --> '0'
   * - 12345 --> '0'
   * - 42.1 --> '0.0'
   * - 456.0001 --> '0.0000'
   */
  private setDefaultNumberFormat(cellValue: number): string {
    const strValue = cellValue.toString();
    const parts = strValue.split(".");
    if (parts.length === 1) {
      return "0";
    }
    return "0." + Array(parts[1].length + 1).join("0");
  }

  /**
   * This function take a cell format representation and return a new format representation
   * with more or less decimal places.
   *
   * If the format doesn't look like a digital format (means that not contain '0')
   * or if this one cannot be increased or decreased, the returned format will be
   * the same.
   *
   * This function aims to work with all possible formats as well as custom formats.
   *
   * Examples of format changed by this function:
   * - "0" (step = 1) --> "0.0"
   * - "0.000%" (step = 1) --> "0.0000%"
   * - "0.00" (step = -1) --> "0.0"
   * - "0%" (step = -1) --> "0%"
   * - "#,##0.0" (step = -1) --> "#,##0"
   * - "#,##0;0.0%;0.000" (step = 1) --> "#,##0.0;0.00%;0.0000"
   */
  private changeDecimalFormat(format: string, step: number): string {
    const sign = Math.sign(step);
    // According to the representation of the cell format. A format can contain
    // up to 4 sub-formats which can be applied depending on the value of the cell
    // (among positive / negative / zero / text), each of these sub-format is separated
    // by ';' in the format. We need to make the change on each sub-format.
    const subFormats = format.split(";");
    let newSubFormats: string[] = [];

    for (let subFormat of subFormats) {
      const decimalPointPosition = subFormat.indexOf(".");
      const exponentPosition = subFormat.toUpperCase().indexOf("E");
      let newSubFormat: string;

      // the 1st step is to find the part of the zeros located before the
      // exponent (when existed)
      const subPart = exponentPosition > -1 ? subFormat.slice(0, exponentPosition) : subFormat;
      const zerosAfterDecimal =
        decimalPointPosition > -1 ? subPart.slice(decimalPointPosition).match(/0/g)!.length : 0;

      // the 2nd step is to add (or remove) zero after the last zeros obtained in
      // step 1
      const lastZeroPosition = subPart.lastIndexOf("0");
      if (lastZeroPosition > -1) {
        if (sign > 0) {
          // in this case we want to add decimal information
          if (zerosAfterDecimal < maximumDecimalPlaces) {
            newSubFormat =
              subFormat.slice(0, lastZeroPosition + 1) +
              (zerosAfterDecimal === 0 ? ".0" : "0") +
              subFormat.slice(lastZeroPosition + 1);
          } else {
            newSubFormat = subFormat;
          }
        } else {
          // in this case we want to remove decimal information
          if (zerosAfterDecimal > 0) {
            // remove last zero
            newSubFormat =
              subFormat.slice(0, lastZeroPosition) + subFormat.slice(lastZeroPosition + 1);
            // if a zero always exist after decimal point else remove decimal point
            if (zerosAfterDecimal === 1) {
              newSubFormat =
                newSubFormat.slice(0, decimalPointPosition) +
                newSubFormat.slice(decimalPointPosition + 1);
            }
          } else {
            // zero after decimal isn't present, we can't remove zero
            newSubFormat = subFormat;
          }
        }
      } else {
        // no zeros are present in this format, we do nothing
        newSubFormat = subFormat;
      }
      newSubFormats.push(newSubFormat);
    }
    return newSubFormats.join(";");
  }

  /**
   * Clear the styles of zones
   */
  private clearStyles(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          // commandHelpers.updateCell(sheetId, col, row, { style: undefined});
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: null,
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
    fn: (sheet: Sheet, styleRef: number, elements: number[]) => void
  ) {
    const sheet = this.getters.getSheet(cmd.sheetId);
    // The new elements have already been inserted in the sheet at this point.
    let insertedElements: number[];
    let styleReference: number;
    if (cmd.position === "before") {
      insertedElements = range(cmd.base, cmd.base + cmd.quantity);
      styleReference = cmd.base + cmd.quantity;
    } else {
      insertedElements = range(cmd.base + 1, cmd.base + cmd.quantity + 1);
      styleReference = cmd.base;
    }
    fn(sheet, styleReference, insertedElements);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------
  getCells(sheetId: UID): Record<UID, Cell> {
    const sheet = this.tryGetSheet(sheetId);
    if (!sheet) {
      return {};
    }
    const cells = {};
    for (let col = 0; col < sheet.cols.length; col++) {
      for (let row = 0; row < sheet.rows.length; row++) {
        const cell = sheet.rows[row].cells[col];
        if (cell) {
          cells[cell.id] = cell;
        }
      }
    }
    return cells;
  }

  buildFormulaContent(sheetId: UID, formula: string, dependencies: Range[]): string {
    let newDependencies = dependencies.map((x, i) => {
      return {
        stringDependency: this.getters.getRangeString(x, sheetId),
        stringPosition: `${FORMULA_REF_IDENTIFIER}${i}${FORMULA_REF_IDENTIFIER}`,
      };
    });
    let newContent = formula;
    if (newDependencies) {
      for (let d of newDependencies) {
        newContent = newContent.replace(d.stringPosition, d.stringDependency);
      }
    }
    return newContent;
  }

  getFormulaCellContent(sheetId: UID, cell: FormulaCell): string {
    return this.buildFormulaContent(sheetId, cell.formula.text, cell.dependencies);
  }

  getCellValue(cell: Cell, sheetId: UID, showFormula: boolean = false): any {
    let value: unknown;
    if (showFormula) {
      if (cell.type === CellType.formula) {
        value = this.getters.getFormulaCellContent(sheetId, cell);
      } else {
        value = cell.type === CellType.invalidFormula ? cell.content : cell.value;
      }
    } else {
      value = cell.value;
    }
    switch (typeof value) {
      case "string":
        return value;
      case "boolean":
        return value ? "TRUE" : "FALSE";
      case "number":
        return formatStandardNumber(value);
      case "object":
        return "0";
    }
    return (value && (value as any).toString()) || "";
  }

  getCellText(cell: Cell, sheetId: UID, showFormula: boolean = false): string {
    let value: unknown;

    if (showFormula) {
      if (cell.type === CellType.formula) {
        value = this.getters.getFormulaCellContent(sheetId, cell);
      } else {
        value = cell.type === CellType.invalidFormula ? cell.content : cell.value;
      }
    } else {
      value = cell.value;
    }
    switch (typeof value) {
      case "string":
        return value;
      case "boolean":
        return value ? "TRUE" : "FALSE";
      case "number":
        const shouldFormat = (value || value === 0) && cell.format && !cell.error;
        const dateTimeFormat = shouldFormat && cell.format!.match(DATETIME_FORMAT);
        if (dateTimeFormat) {
          return formatDateTime({ value, format: cell.format! });
        }
        const numberFormat = shouldFormat && !dateTimeFormat;
        if (numberFormat) {
          return formatNumber(value, cell.format!);
        }
        return formatStandardNumber(value);
      case "object":
        return "0";
    }
    return (value && (value as any).toString()) || "";
  }

  getCellStyle(cell: Cell): Style {
    return cell.style || {};
  }

  private setStyle(sheetId: UID, target: Zone[], style: Style | undefined) {
    for (let zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.getters.getCell(sheetId, col, row);
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
  private copyColumnStyle(sheet: Sheet, refColumn: number, targetCols: number[]) {
    for (let row = 0; row < sheet.rows.length; row++) {
      const format = this.getFormat(sheet.id, refColumn, row);
      if (format.style || format.format) {
        for (let col of targetCols) {
          this.dispatch("UPDATE_CELL", { sheetId: sheet.id, col, row, ...format });
        }
      }
    }
  }

  /**
   * Copy the style of one row to other rows.
   */
  private copyRowStyle(sheet: Sheet, refRow: number, targetRows: number[]) {
    for (let col = 0; col < sheet.cols.length; col++) {
      const format = this.getFormat(sheet.id, col, refRow);
      if (format.style || format.format) {
        for (let row of targetRows) {
          this.dispatch("UPDATE_CELL", { sheetId: sheet.id, col, row, ...format });
        }
      }
    }
  }

  /**
   * gets the currently used style/border of a cell based on it's coordinates
   */
  private getFormat(sheetId: UID, col: number, row: number): { style?: Style; format?: string } {
    const format: { style?: Style; format?: string } = {};
    const [mainCol, mainRow] = this.getters.getMainCell(sheetId, col, row);
    const cell = this.getters.getCell(sheetId, mainCol, mainRow);
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

  private updateCell(sheet: Sheet, col: number, row: number, after: UpdateCellData) {
    const before = sheet.rows[row].cells[col];
    const hasContent = "content" in after || "formula" in after;

    // Compute the new cell properties
    const afterContent = after.content ? after.content.replace(nbspRegexp, "") : "";
    const style = after.style !== undefined ? after.style : (before && before.style) || 0;
    let format = "format" in after ? after.format : (before && before.format) || "";

    /* Read the following IF as:
     * we need to remove the cell if it is completely empty, but we can know if it completely empty if:
     * - the command says the new content is empty and has no border/format/style
     * - the command has no content property, in this case
     *     - either there wasn't a cell at this place and the command says border/format/style is empty
     *     - or there was a cell at this place, but it's an empty cell and the command says border/format/style is empty
     *  */
    if (
      ((hasContent && !afterContent && !after.formula) ||
        (!hasContent && (before?.type === CellType.empty || !before))) &&
      !style &&
      !format
    ) {
      if (before) {
        // this.history.update("cells", before.id, undefined);
        this.updateCellPosition(sheet.id, col, row, before.id, undefined);
      }
      return;
    }

    // compute the new cell value
    const didContentChange = hasContent;
    let cell: Cell;
    if (before && !didContentChange) {
      cell = Object.assign({}, before);
    } else {
      // the current content cannot be reused, so we need to recompute the
      // derived
      const cellId = before?.id || uuidv4();

      let formulaString = after.formula;
      if (!formulaString && afterContent[0] === "=") {
        formulaString = normalize(afterContent || "");
      }

      if (formulaString) {
        try {
          const compiledFormula = compile(formulaString);
          let ranges: Range[] = [];

          for (let xc of formulaString.dependencies) {
            // todo: remove the actual range from the cell and only keep the range Id
            ranges.push(this.getters.getRangeFromSheetXC(sheet.id, xc));
          }

          cell = {
            id: cellId,
            type: CellType.formula,
            formula: {
              compiledFormula: compiledFormula,
              text: formulaString.text,
            },
            dependencies: ranges,
          } as FormulaCell;

          if (!after.formula) {
            format = this.computeFormulaFormat(cell);
          }
        } catch (e) {
          cell = {
            id: cellId,
            type: CellType.invalidFormula,
            content: afterContent,
            value: "#BAD_EXPR",
            error: _lt("Invalid Expression"),
          };
        }
      } else if (afterContent === "") {
        cell = {
          id: cellId,
          type: CellType.empty,
          value: "",
        };
      } else if (isNumber(afterContent)) {
        cell = {
          id: cellId,
          type: CellType.number,
          content: afterContent,
          value: parseNumber(afterContent),
        };
        if (afterContent.includes("%")) {
          format = afterContent.includes(".") ? "0.00%" : "0%";
        }
      } else {
        const internaldate = parseDateTime(afterContent);
        if (internaldate !== null) {
          cell = {
            id: cellId,
            type: CellType.number,
            content: internaldate.value.toString(),
            value: internaldate.value,
          };
          if (!format) {
            format = internaldate.format;
          }
        } else {
          const contentUpperCase = afterContent.toUpperCase();
          cell = {
            id: cellId,
            type: CellType.text,
            content: afterContent,
            value:
              contentUpperCase === "TRUE"
                ? true
                : contentUpperCase === "FALSE"
                ? false
                : afterContent,
          };
        }
      }
    }

    if (style) {
      cell.style = style;
    } else {
      delete cell.style;
    }
    if (format) {
      cell.format = format;
    } else {
      delete cell.format;
    }

    // this.history.update("cells", cell.id, cell);
    this.updateCellPosition(sheet.id, col, row, cell.id, cell);
  }

  NULL_FORMAT = "";

  private computeFormulaFormat(cell: FormulaCell): string {
    const dependenciesFormat = cell.formula.compiledFormula.dependenciesFormat;
    const dependencies = cell.dependencies;

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
          const sheets = this.getEvaluationSheets();
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
    return this.NULL_FORMAT;
  }
}
