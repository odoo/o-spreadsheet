import { CorePlugin } from "../core_plugin";
import { compile, normalize } from "../../formulas/index";
import { formatDateTime, InternalDate, parseDateTime } from "../../functions/dates";
import {
  formatNumber,
  formatStandardNumber,
  isNumber,
  parseNumber,
  toCartesian,
  toXC,
  uuidv4,
} from "../../helpers/index";
import { _lt } from "../../translation";
import {
  Cell,
  CellData,
  CellPosition,
  CellType,
  Command,
  FormulaCell,
  NormalizedFormula,
  Range,
  Sheet,
  UID,
  WorkbookData,
  Zone,
} from "../../types/index";
import { FORMULA_REF_IDENTIFIER } from "../../formulas/tokenizer";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

interface CoreState {
  // this.cells[sheetId][cellId] --> cell|undefined
  cells: Record<UID, Record<UID, Cell | undefined>>;
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CellPlugin extends CorePlugin<CoreState> implements CoreState {
  static getters = ["zoneToXC", "getCells", "getFormulaCellContent", "getCellText", "getCellValue"];

  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        this.updateCell(this.getters.getSheet(cmd.sheetId), cmd.col, cmd.row, cmd);
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
    }
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const imported_sheet = this.getters.getSheet(sheet.id);
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
      for (let [cellId, cell] of Object.entries(this.cells[_sheet.id] || {})) {
        let position: CellPosition = this.getters.getCellPosition(cellId);
        let xc = toXC(position.col, position.row);

        cells[xc] = {
          border: cell.border,
          style: cell.style,
          format: cell.format,
        };

        switch (cell.type) {
          case CellType.formula:
            cells[xc].formula = {
              text: cell.formula.text || "",
              dependencies:
                cell.dependencies?.map((d) => this.getters.getRangeString(d.id, _sheet.id)) || [],
            };
            break;
          case CellType.date:
          case CellType.number:
          case CellType.text:
          case CellType.invalidFormula:
            cells[xc].content = cell.content;
            break;
        }
      }
      _sheet.cells = cells;
    }
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------
  getCells(sheetId: UID): Record<UID, Cell> {
    return this.cells[sheetId] || {};
  }

  getFormulaCellContent(sheetId: UID, cell: FormulaCell): string {
    let newDependencies = cell.dependencies?.map((x, i) => {
      return {
        stringDependency: this.getters.getRangeString(x.id, sheetId),
        stringPosition: `${FORMULA_REF_IDENTIFIER}${i}${FORMULA_REF_IDENTIFIER}`,
      };
    });
    let newContent = cell.formula?.text || "";
    if (newDependencies) {
      for (let d of newDependencies) {
        newContent = newContent.replace(d.stringPosition, d.stringDependency);
      }
    }
    return newContent;
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
        if (value && (value as InternalDate).format!.match(/[ymd:]/)) {
          return formatDateTime(value as InternalDate);
        }
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
    const shouldFormat = (value || value === 0) && cell.format && !cell.error;
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
          return formatNumber((value as any).value, cell.format!);
        }
        if (value && (value as InternalDate).format!.match(/[ymd:]/)) {
          return formatDateTime(value as InternalDate);
        }
        return "0";
    }
    return (value && (value as any).toString()) || "";
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
  zoneToXC(sheetId: UID, zone: Zone): string {
    zone = this.getters.expandZone(sheetId, zone);
    const topLeft = toXC(zone.left, zone.top);
    const botRight = toXC(zone.right, zone.bottom);
    if (
      topLeft != botRight &&
      this.getters.getMainCell(sheetId, topLeft) !== this.getters.getMainCell(sheetId, botRight)
    ) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  // ---------------------------------------------------------------------------
  // Cells
  // ---------------------------------------------------------------------------

  private updateCell(sheet: Sheet, col: number, row: number, after: CellData) {
    const before = sheet.rows[row].cells[col];
    const hasContent = "content" in after || "formula" in after;

    // Compute the new cell properties
    const afterContent = after.content ? after.content.replace(nbspRegexp, "") : "";
    const style = "style" in after ? after.style : (before && before.style) || 0;
    const border = "border" in after ? after.border : (before && before.border) || 0;
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
      !border &&
      !format
    ) {
      if (before) {
        this.history.update("cells", sheet.id, before.id, undefined);
        this.dispatch("UPDATE_CELL_POSITION", {
          cellId: before.id,
          col,
          row,
          sheetId: sheet.id,
          cell: undefined,
        });
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

      if (after.formula) {
        try {
          let compiledFormula = compile(after.formula);
          const ranges: Range[] = [];

          for (let xc of after.formula.dependencies) {
            // todo: remove the actual range from the cell and only keep the range Id
            ranges.push(this.getters.getRangeFromSheetXC(sheet.id, xc));
          }
          cell = {
            id: cellId,
            type: CellType.formula,
            formula: {
              compiledFormula: compiledFormula,
              text: after.formula.text,
            },
            dependencies: ranges,
          } as FormulaCell;
        } catch (_) {
          cell = {
            id: cellId,
            type: CellType.invalidFormula,
            content: afterContent,
            value: "#BAD_EXPR",
            error: _lt("Invalid Expression"),
          };
        }
      } else if (afterContent[0] === "=") {
        try {
          const formulaString: NormalizedFormula = normalize(afterContent || "");
          const compiledFormula = compile(formulaString);

          const ranges: Range[] = [];

          cell = {
            id: cellId,
            type: CellType.formula,
            formula: {
              compiledFormula: compiledFormula,
              text: formulaString.text,
            },
            dependencies: ranges,
          } as FormulaCell;

          for (let xc of formulaString.dependencies) {
            // todo: remove the actual range from the cell and only keep the range Id
            ranges.push(this.getters.getRangeFromSheetXC(sheet.id, xc));
          }
        } catch (_) {
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
        const date = parseDateTime(afterContent);
        if (date) {
          cell = {
            id: cellId,
            type: CellType.date,
            content: formatDateTime(date),
            value: date,
          };
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
    if (border) {
      cell.border = border;
    } else {
      delete cell.border;
    }
    if (format) {
      cell.format = format;
    } else {
      delete cell.format;
    }

    this.history.update("cells", sheet.id, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cell, cellId: cell.id, col, row, sheetId: sheet.id });
  }
}
