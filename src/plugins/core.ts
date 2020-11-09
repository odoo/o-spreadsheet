import { BasePlugin } from "../base_plugin";
import { compile, normalize } from "../formulas/index";
import { formatDateTime, InternalDate, parseDateTime } from "../functions/dates";
import {
  formatNumber,
  formatStandardNumber,
  isNumber,
  parseNumber,
  toXC,
  toZone,
  mapCellsInZone,
  uuidv4,
  toCartesian,
} from "../helpers/index";
import { _lt } from "../translation";
import {
  Cell,
  CellData,
  Command,
  Zone,
  UID,
  NormalizedFormula,
  Sheet,
  WorkbookData,
} from "../types/index";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Cell | undefined>;
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CorePlugin extends BasePlugin<CoreState> implements CoreState {
  static getters = [
    "getCellText",
    "zoneToXC",
    "shouldShowFormulas",
    "getRangeValues",
    "getRangeFormattedValues",
    "getCellById",
  ];

  private showFormulas: boolean = false;
  public readonly cells: Record<UID, Cell | undefined> = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        this.updateCell(this.getters.getSheet(cmd.sheetId)!, cmd.col, cmd.row, cmd);
        break;
      case "CLEAR_CELL":
        const cell = this.getters.getCell(cmd.sheetId, cmd.col, cmd.row);
        if (cell) {
          this.history.update("cells", cell.id, undefined);
          this.dispatch("UPDATE_CELL_POSITION", {
            col: cmd.col,
            row: cmd.row,
            cellId: undefined,
            sheetId: cmd.sheetId,
          });
        }
        break;
      case "SET_FORMULA_VISIBILITY":
        this.showFormulas = cmd.show;
        break;
      case "DUPLICATE_SHEET":
        this.duplicateSheet(cmd.sheetIdFrom, cmd.sheetIdTo);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const imported_sheet = this.getters.getSheet(sheet.id)!;
      // cells
      for (let xc in sheet.cells) {
        const cell = sheet.cells[xc];
        const [col, row] = toCartesian(xc);
        this.updateCell(imported_sheet, col, row, cell);
      }
    }
  }

  export(data: WorkbookData) {
    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      for (let cell of Object.values(this.getters.getCells(_sheet.id))) {
        let position = this.getters.getCellPosition(cell.id);
        let xc = toXC(position.col, position.row);
        cells[xc] = {
          content: cell.content,
          border: cell.border,
          style: cell.style,
          format: cell.format,
          id: cell.id,
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

  getCellById(cellId: UID): Cell | undefined {
    return this.cells[cellId];
  }

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

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }

  getRangeValues(reference: string, defaultSheetId: UID): any[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : defaultSheetId;
    const sheet = sheetId ? this.getters.getSheet(sheetId) : undefined;
    if (sheet === undefined) return [[]];
    return mapCellsInZone(
      toZone(range),
      sheet,
      (cellId) => cellId && this.getCellById(cellId)!.value
    );
  }

  getRangeFormattedValues(reference: string, defaultSheetId: UID): string[][] {
    const [range, sheetName] = reference.split("!").reverse();
    const sheetId = sheetName ? this.getters.getSheetIdByName(sheetName) : defaultSheetId;
    const sheet = sheetId ? this.getters.getSheet(sheetId) : undefined;
    if (sheet === undefined) return [[]];
    return mapCellsInZone(
      toZone(range),
      sheet,
      (cellId) => cellId && this.getCellText(this.getCellById(cellId)!),
      ""
    );
  }

  // ---------------------------------------------------------------------------
  // Cells
  // ---------------------------------------------------------------------------

  private computeDerivedFormat(content: string): Cell["format"] {
    if (isNumber(content) && content.includes("%")) {
      return content.includes(".") ? "0.00%" : "0%";
    }
    return undefined;
  }
  /**
   * Duplicate all the cells in the base sheet (sheetIdFrom)
   *
   * @param sheetIdFrom Id of the base sheet
   * @param sheetIdTo Id of the new sheet
   */
  private duplicateSheet(sheetIdFrom: UID, sheetIdTo: UID) {
    const cells = this.getters.getCells(sheetIdFrom);
    for (let cell of Object.values(cells)) {
      const { col, row } = this.getters.getCellPosition(cell.id);
      const id = uuidv4();
      this.history.update("cells", id, { ...cell, id });
      this.dispatch("UPDATE_CELL_POSITION", {
        col,
        row,
        sheetId: sheetIdTo,
        cellId: id,
      });
    }
  }

  private computeType(content: string): Cell["type"] {
    if (content[0] === "=") {
      return "formula";
    }
    if (isNumber(content)) {
      return "number";
    } else if (parseDateTime(content)) {
      return "date";
    }
    return "text";
  }

  private computeFormulaValues(
    content: string
  ): { error: Cell["error"]; formula: Cell["formula"]; value: Cell["value"] } {
    let error;
    let formula;
    let value;
    try {
      let formulaString: NormalizedFormula = normalize(content);
      let compiledFormula = compile(formulaString);
      formula = {
        compiledFormula: compiledFormula,
        dependencies: formulaString.dependencies,
        text: formulaString.text,
      };
    } catch (e) {
      value = "#BAD_EXPR";
      error = _lt("Invalid Expression");
    }
    return { error, formula, value };
  }

  private computeValue(content: string): any {
    if (isNumber(content)) {
      return parseNumber(content);
    }
    let date = parseDateTime(content);
    if (date) {
      return date;
    }
    const contentUpperCase = content.toUpperCase();
    if (contentUpperCase === "TRUE") {
      return true;
    }
    if (contentUpperCase === "FALSE") {
      return false;
    }
    return content;
  }

  // private createCell(data: CellData): Cell {
  //   const content = data.content || "";
  //   const cell: Cell = {
  //     id: data.id || uuidv4(),
  //     content,
  //     border: data.border,
  //     style: data.style,
  //     format: data.format || this.computeDerivedFormat(content),
  //     type: this.computeType(content),
  //     value: this.computeValue(content),
  //   };
  //   if (cell.type === "formula") {
  //     const { error, formula, value } = this.computeFormulaValues(content);
  //     cell.error = error;
  //     cell.formula = formula;
  //     cell.value = value;
  //   } else if (cell.type === "date") {
  //     cell.content = formatDateTime(cell.value);
  //   }
  //   return cell;
  // }

  private isEmpty(cell: Cell): boolean {
    return !cell.style && !cell.content && !cell.format && !cell.border;
  }

  private updateCell(sheet: Sheet, col: number, row: number, data: CellData) {
    if ("content" in data) {
      data = {
        ...data,
        content: data.content ? data.content.replace(nbspRegexp, "") : "",
      };
    }
    let cell = this.getters.getCell(sheet.id, col, row);
    let newCell = false;
    const cellId = cell ? cell.id : data.id || uuidv4();
    if (!cell) {
      this.history.update("cells", cellId, "id", cellId);
      newCell = true;
    }
    const didContentChange =
      ("content" in data && cell && cell.content !== data.content) || newCell;
    const didStyleChange =
      "style" in data && ((cell && cell.style !== data.style) || (newCell && data.style));
    const didBorderChange =
      "border" in data && ((cell && cell.border !== data.border) || (newCell && data.border));
    const didFormatChange =
      "format" in data && ((cell && cell.format !== data.format) || (newCell && data.format));
    if (didContentChange) {
      const content = data.content || "";
      const type = this.computeType(content);
      const value = this.computeValue(content);
      this.history.update("cells", cellId, "content", content);
      this.history.update("cells", cellId, "value", value);
      if (type === "formula") {
        const { error, formula, value } = this.computeFormulaValues(content);
        this.history.update("cells", cellId, "error", error);
        this.history.update("cells", cellId, "formula", formula);
        this.history.update("cells", cellId, "value", value);
      } else if (type === "date") {
        this.history.update("cells", cellId, "content", formatDateTime(value));
      }
      this.history.update("cells", cellId, "type", type);
      this.history.update(
        "cells",
        cellId,
        "format",
        this.computeDerivedFormat(content) || data.format || (cell && cell.format)
      );
    }
    if (didFormatChange) {
      this.history.update("cells", cellId, "format", data.format || undefined);
    }
    if (didStyleChange) {
      this.history.update("cells", cellId, "style", data.style || undefined);
    }
    if (didBorderChange) {
      this.history.update("cells", cellId, "border", data.border || undefined);
    }
    // console.log(this.cells);
    if (this.isEmpty(this.cells[cellId]!)) {
      this.dispatch("CLEAR_CELL", {
        col,
        row,
        sheetId: sheet.id,
      });
    } else {
      // this.history.update("cells", cellId, cell);
      this.dispatch("UPDATE_CELL_POSITION", {
        cellId,
        col,
        row,
        sheetId: sheet.id,
      });
    }

    // const hasContent = "content" in data;

    // // Compute the new cell properties
    // const dataContent = data.content ? data.content.replace(nbspRegexp, "") : "";
    // let content = hasContent ? dataContent : (cell && cell.content) || "";
    // const style = "style" in data ? data.style : (cell && cell.style) || 0;
    // const border = "border" in data ? data.border : (cell && cell.border) || 0;
    // let format = "format" in data ? data.format : (cell && cell.format) || "";

    // // if all are empty, we need to delete the underlying cell object
    // if (!content && !style && !border && !format) {
    //   this.dispatch("CLEAR_CELL", {
    //     col,
    //     row,
    //     sheetId: sheet.id,
    //   });
    //   return;
    // }

    // // compute the new cell value
    // const didContentChange =
    //   (!cell && dataContent) || (hasContent && cell && cell.content !== dataContent);
    // if (cell && !didContentChange) {
    //   cell = { id: cell.id, content, value: cell.value, type: cell.type };
    //   if (cell.type === "formula") {
    //     cell.error = cell.error;
    //     cell.pending = cell.pending;
    //     cell.formula = cell.formula;
    //   }
    // } else {
    //   // the current content cannot be reused, so we need to recompute the
    //   // derived values
    //   let type: Cell["type"] = content[0] === "=" ? "formula" : "text";
    //   let value: Cell["value"] = content;
    //   if (isNumber(content)) {
    //     value = parseNumber(content);
    //     type = "number";
    //     if (content.includes("%")) {
    //       format = content.includes(".") ? "0.00%" : "0%";
    //     }
    //   }
    //   let date = parseDateTime(content);
    //   if (date) {
    //     type = "date";
    //     value = date;
    //     content = formatDateTime(date);
    //   }
    //   const contentUpperCase = content.toUpperCase();
    //   if (contentUpperCase === "TRUE") {
    //     value = true;
    //   }
    //   if (contentUpperCase === "FALSE") {
    //     value = false;
    //   }
    //   cell = { id: cell?.id || data.id || uuidv4(), content, value, type };
    //   if (cell.type === "formula") {
    //     cell.error = undefined;
    //     try {
    //       let formulaString: NormalizedFormula = normalize(cell.content || "");
    //       let compiledFormula = compile(formulaString);
    //       cell.formula = {
    //         compiledFormula: compiledFormula,
    //         dependencies: formulaString.dependencies,
    //         text: formulaString.text,
    //       };
    //     } catch (e) {
    //       cell.value = "#BAD_EXPR";
    //       cell.error = _lt("Invalid Expression");
    //     }
    //   }
    // }
    // if (style) {
    //   cell.style = style;
    // }
    // if (border) {
    //   cell.border = border;
    // }
    // if (format) {
    //   cell.format = format;
    // }
    // // todo: make this work on other sheets
    // this.history.update("cells", sheet.id, cell.id, cell);
    // this.dispatch("UPDATE_CELL_POSITION", { cell, cellId: cell.id, col, row, sheetId: sheet.id });
  }
}
