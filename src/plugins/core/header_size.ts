import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../constants";
import { deepCopy, groupConsecutive, rangeIterator, shift } from "../../helpers/misc";
import {
  AddColumnsRowsCommand,
  RemoveColumnsRowsCommand,
  ResizeColumnsRowsCommand,
} from "../../types/commands";
import { Dimension, HeaderIndex, Pixel, UID } from "../../types/misc";
import { ExcelWorkbookData, WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";
import { SheetPlugin } from "./sheet";

interface HeaderSizeState {
  sizes: Record<UID, Record<Dimension, Record<HeaderIndex, Pixel | undefined>>>;
}
export class HeaderSizePlugin
  extends CorePlugin<typeof HeaderSizePlugin, HeaderSizeState>
  implements HeaderSizeState
{
  static readonly dependencies = [SheetPlugin] as const;
  static getters = [
    "getUserRowSize",
    "getColSize",
    "getCustomColSizes",
    "getUserCustomRowSizes",
  ] as const;

  readonly sizes: Record<UID, Record<Dimension, Record<HeaderIndex, Pixel | undefined>>> = {};

  handlers = {
    RESIZE_COLUMNS_ROWS: this.onResizeColumnsRows,
    CREATE_SHEET: this.onCreateSheet,
    DUPLICATE_SHEET: this.onDuplicateSheet,
    DELETE_SHEET: this.onDeleteSheet,
    ADD_COLUMNS_ROWS: this.onAddColumnsRows,
    REMOVE_COLUMNS_ROWS: this.onRemoveColumnsRows,
  };

  private onRemoveColumnsRows(cmd: RemoveColumnsRowsCommand) {
    const elements = cmd.elements.sort((a, b) => b - a);
    const sizes = deepCopy(this.sizes[cmd.sheetId][cmd.dimension]);
    for (const els of groupConsecutive(elements)) {
      for (let i = 0; i < els.length; i++) {
        delete sizes[els[i]];
      }
      shift(sizes, els[0], -els.length);
    }
    this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
  }

  private onAddColumnsRows(cmd: AddColumnsRowsCommand) {
    const sizes = deepCopy(this.sizes[cmd.sheetId][cmd.dimension]);
    const size = sizes[cmd.base];
    const newColRowStart = cmd.position === "before" ? cmd.base : cmd.base + 1;
    shift(sizes, newColRowStart, cmd.quantity);
    const defaultSize = cmd.dimension === "COL" ? DEFAULT_CELL_WIDTH : DEFAULT_CELL_HEIGHT;
    if (size !== undefined && size !== defaultSize) {
      for (let i = 0; i < cmd.quantity; i++) {
        sizes[newColRowStart + i] = size;
      }
    }
    this.history.update("sizes", cmd.sheetId, cmd.dimension, sizes);
  }

  private onDeleteSheet(cmd: { sheetId: UID }) {
    const sizes = { ...this.sizes };
    delete sizes[cmd.sheetId];
    this.history.update("sizes", sizes);
  }

  private onDuplicateSheet(cmd: { sheetId: UID; sheetIdTo: UID }) {
    this.history.update("sizes", cmd.sheetIdTo, deepCopy(this.sizes[cmd.sheetId]));
  }

  private onCreateSheet(cmd: { sheetId: UID }) {
    this.history.update("sizes", cmd.sheetId, {
      COL: {},
      ROW: {},
    });
  }

  private onResizeColumnsRows(cmd: ResizeColumnsRowsCommand) {
    for (const el of cmd.elements) {
      this.history.update("sizes", cmd.sheetId, cmd.dimension, el, cmd.size || undefined);
    }
  }

  getCustomColSizes(sheetId: UID): Record<HeaderIndex, Pixel | undefined> {
    return this.sizes[sheetId]?.COL;
  }

  getUserCustomRowSizes(sheetId: UID): Record<HeaderIndex, Pixel | undefined> {
    return this.sizes[sheetId]?.ROW;
  }

  getColSize(sheetId: UID, index: HeaderIndex): Pixel {
    return Math.round(this.sizes[sheetId]?.["COL"][index] || DEFAULT_CELL_WIDTH);
  }

  getUserRowSize(sheetId: UID, index: HeaderIndex): Pixel | undefined {
    const rowSize = this.sizes[sheetId]?.["ROW"][index];
    return rowSize ? Math.round(rowSize) : undefined;
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const sizes: Record<Dimension, Array<Pixel | undefined>> = {
        COL: Array(sheet.colNumber).fill(undefined),
        ROW: Array(sheet.rowNumber).fill(undefined),
      };
      for (const [rowIndex, row] of Object.entries(sheet.rows)) {
        if (row.size) {
          sizes["ROW"][rowIndex] = row.size;
        }
      }

      for (const [colIndex, col] of Object.entries(sheet.cols)) {
        if (col.size) {
          sizes["COL"][colIndex] = col.size;
        }
      }

      this.sizes[sheet.id] = sizes;
    }
    return;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.exportData(data, true);
  }

  export(data: WorkbookData) {
    this.exportData(data);
  }

  /**
   * Export the header sizes
   *
   * @param exportDefaults : if true, export column/row sizes even if they have the default size
   */
  exportData(data: WorkbookData, exportDefaults = false) {
    for (const sheet of data.sheets) {
      // Export row sizes
      if (sheet.rows === undefined) {
        sheet.rows = {};
      }
      for (const row of rangeIterator(0, this.getters.getNumberRows(sheet.id))) {
        if (exportDefaults || this.sizes[sheet.id]["ROW"][row]) {
          sheet.rows[row] = {
            ...sheet.rows[row],
            size: this.getUserRowSize(sheet.id, row) ?? DEFAULT_CELL_HEIGHT,
          };
        }
      }

      // Export col sizes
      if (sheet.cols === undefined) {
        sheet.cols = {};
      }
      for (const col of rangeIterator(0, this.getters.getNumberCols(sheet.id))) {
        if (exportDefaults || this.sizes[sheet.id]["COL"][col]) {
          sheet.cols[col] = { ...sheet.cols[col], size: this.getColSize(sheet.id, col) };
        }
      }
    }
  }
}
