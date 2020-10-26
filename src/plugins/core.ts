import { BasePlugin } from "../base_plugin";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../constants";
import { compile, normalize } from "../formulas/index";
import { formatDateTime, InternalDate, parseDateTime } from "../functions/dates";
import {
  formatNumber,
  formatStandardNumber,
  isNumber,
  parseNumber,
  toCartesian,
  toXC,
  toZone,
  mapCellsInZone,
} from "../helpers/index";
import { _lt } from "../translation";
import {
  Cell,
  CellData,
  Command,
  CommandResult,
  WorkbookData,
  Zone,
  UID,
  NormalizedFormula,
} from "../types/index";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

interface CoreState {
  cells: { [sheetId: string]: { [id: string]: Cell | undefined } };
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CorePlugin extends BasePlugin<CoreState> implements CoreState {
  static getters = [
    "getColsZone",
    "getRowsZone",
    "getCellText",
    "zoneToXC",
    "getCells",
    "getColCells",
    "getGridSize",
    "shouldShowFormulas",
    "getRangeValues",
    "getRangeFormattedValues",
  ];

  private showFormulas: boolean = false;
  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      default:
        return { status: "SUCCESS" };
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      // case "SET_VALUE":
      //   const [col, row] = toCartesian(cmd.xc);
      //   this.dispatch("UPDATE_CELL", {
      //     sheetId: cmd.sheetId ? cmd.sheetId : this.getters.getActiveSheetId(),
      //     col,
      //     row,
      //     content: cmd.text,
      //   });
      //   break;
      case "UPDATE_CELL":
        this.updateCell(cmd.sheetId, cmd.col, cmd.row, cmd);
        break;
      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheetId: cmd.sheetId,
          col: cmd.col,
          row: cmd.row,
          content: "",
          border: 0,
          style: 0,
          format: "",
        });
        break;

      case "SET_FORMULA_VISIBILITY":
        this.showFormulas = cmd.show;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      // cells
      for (let xc in sheet.cells) {
        const cell = sheet.cells[xc];
        const [col, row] = toCartesian(xc);
        this.updateCell(sheet.id, col, row, cell);
      }
    }
  }

  export(data: WorkbookData) {
    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      for (let [xc, cell] of Object.entries(this.cells[_sheet.id])) {
        cells[xc] = {
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };
        if (cell.type === "formula" && cell.formula) {
          cells[xc].formula = {
            text: cell.formula.text || "",
            dependencies: cell.formula.dependencies.slice() || [],
          };
        }
      }
      _sheet.cells = cells;
    }
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  getCellText(cell: Cell): string {
    const value = this.showFormulas ? cell.content : cell.value;
    const shouldFormat = (value || value === 0) && cell.format && !cell.error && !cell.pending;
    const dateTimeFormat = shouldFormat && cell.format!.match(/[ymd:]/);
    const numberFormat = shouldFormat && !dateTimeFormat;
    switch (typeof value) {
      case "string":
        return value;
      case "boolean":
        return value ? "TRUE" : "FALSE";
      case "number":
        if (dateTimeFormat) {
          return formatDateTime({ value } as InternalDate, cell.format);
        }
        if (numberFormat) {
          return formatNumber(value, cell.format!);
        }
        return formatStandardNumber(value);
      case "object":
        if (dateTimeFormat) {
          return formatDateTime(value as InternalDate, cell.format);
        }
        if (numberFormat) {
          return formatNumber(value.value, cell.format!);
        }
        if (value && value.format!.match(/[ymd:]/)) {
          return formatDateTime(value);
        }
        return "0";
    }
    return value.toString();
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
  zoneToXC(zone: Zone): string {
    zone = this.getters.expandZone(zone);
    const topLeft = toXC(zone.left, zone.top);
    const botRight = toXC(zone.right, zone.bottom);
    if (
      topLeft != botRight &&
      this.getters.getMainCell(topLeft) !== this.getters.getMainCell(botRight)
    ) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  getCells(sheetId?: string): { [key: string]: Cell } {
    return this.cells[sheetId || this.getters.getActiveSheet().id];
  }

  /**
   * Returns all the cells of a col
   */
  getColCells(col: number): Cell[] {
    return this.getters
      .getActiveSheet()
      .rows.reduce((acc: Cell[], cur) => (cur.cells[col] ? acc.concat(cur.cells[col]) : acc), []);
  }

  getColsZone(start: number, end: number): Zone {
    return {
      top: 0,
      bottom: this.getters.getActiveSheet().rows.length - 1,
      left: start,
      right: end,
    };
  }

  getRowsZone(start: number, end: number): Zone {
    return {
      top: start,
      bottom: end,
      left: 0,
      right: this.getters.getActiveSheet().cols.length - 1,
    };
  }

  getGridSize(): [number, number] {
    const activeSheet = this.getters.getActiveSheet();
    const height = activeSheet.rows[activeSheet.rows.length - 1].end + DEFAULT_CELL_HEIGHT + 5;
    const width = activeSheet.cols[activeSheet.cols.length - 1].end + DEFAULT_CELL_WIDTH;

    return [width, height];
  }

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }

  getRangeValues(reference: string, defaultSheetId: UID): any[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : defaultSheetId;

    return mapCellsInZone(toZone(range), this.getters.getSheet(sheetId!), (cell) => cell.value);
  }

  getRangeFormattedValues(reference: string, defaultSheetId: UID): string[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : defaultSheetId;
    return mapCellsInZone(
      toZone(range),
      this.getters.getSheet(sheetId!),
      this.getters.getCellText,
      ""
    );
  }

  // ---------------------------------------------------------------------------
  // Cells
  // ---------------------------------------------------------------------------

  private updateCell(sheetId: UID, col: number, row: number, data: CellData) {
    const sheet = this.getters.getSheet(sheetId);
    const current = sheet.rows[row].cells[col];
    //const xc = (current && current.xc) || toXC(col, row);
    const hasContent = "content" in data;

    // Compute the new cell properties
    const dataContent = data.content ? data.content.replace(nbspRegexp, "") : "";
    let content = hasContent ? dataContent : (current && current.content) || "";
    const style = "style" in data ? data.style : (current && current.style) || 0;
    const border = "border" in data ? data.border : (current && current.border) || 0;
    let format = "format" in data ? data.format : (current && current.format) || "";

    // if all are empty, we need to delete the underlying cell object
    if (!content && !style && !border && !format) {
      if (current) {
        // todo: make this work on other sheets
        this.history.update("cells", sheetId, current.id, undefined);
        //this.history.update("sheets", sheetId, "cells", xc, undefined);
        //this.history.update("sheets", sheetId, "rows", row, "cells", col, undefined);
      }
      return;
    }

    // compute the new cell value
    const didContentChange =
      (!current && dataContent) || (hasContent && current && current.content !== dataContent);
    let cell: Cell;
    if (current && !didContentChange) {
      cell = { id: current.id, content, value: current.value, type: current.type };
      if (cell.type === "formula") {
        cell.error = current.error;
        cell.pending = current.pending;
        cell.formula = current.formula;
      }
    } else {
      // the current content cannot be reused, so we need to recompute the
      // derived values
      let type: Cell["type"] = content[0] === "=" ? "formula" : "text";
      let value: Cell["value"] = content;
      if (isNumber(content)) {
        value = parseNumber(content);
        type = "number";
        if (content.includes("%")) {
          format = content.includes(".") ? "0.00%" : "0%";
        }
      }
      let date = parseDateTime(content);
      if (date) {
        type = "date";
        value = date;
        content = formatDateTime(date);
      }
      const contentUpperCase = content.toUpperCase();
      if (contentUpperCase === "TRUE") {
        value = true;
      }
      if (contentUpperCase === "FALSE") {
        value = false;
      }
      cell = { id: current.id, content, value, type };
      if (cell.type === "formula") {
        cell.error = undefined;
        try {
          let formulaString: NormalizedFormula = normalize(cell.content || "");
          let compiledFormula = compile(formulaString);
          cell.formula = {
            compiledFormula: compiledFormula,
            dependencies: formulaString.dependencies,
            text: formulaString.text,
          };
        } catch (e) {
          cell.value = "#BAD_EXPR";
          cell.error = _lt("Invalid Expression");
        }
      }
    }
    if (style) {
      cell.style = style;
    }
    if (border) {
      cell.border = border;
    }
    if (format) {
      cell.format = format;
    }
    this.history.update("cells", sheetId, current.id, cell);
  }
}
