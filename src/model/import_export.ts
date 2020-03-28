import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH, HEADER_HEIGHT, HEADER_WIDTH } from "../constants";
import { toXC } from "../helpers";
import { Border, Col, ConditionalFormat, Merge, Row, Style, Workbook } from "./types";
import { CURRENT_VERSION } from "../data";
/**
 * Data
 *
 * This file defines the basic types involved in import-export. It also defines
 * how to import and export data.
 *
 * The most important exported values are:
 * - interface WorkbookData: the type of that data that is given to the spreadsheet
 * - function importData: convert from WorkbookData -> Workbook
 * - function exportData: convert from Workbook -> WorkbookData
 */

interface CellData {
  content?: string;
  style?: number;
  border?: number;
  format?: string;
}

export interface HeaderData {
  size?: number;
}

export interface SheetData {
  name: string;
  colNumber: number;
  rowNumber: number;
  cells: { [key: string]: CellData };
  merges: string[];
  cols: { [key: number]: HeaderData };
  rows: { [key: number]: HeaderData };
  conditionalFormats: ConditionalFormat[];
}

export interface WorkbookData {
  version: number;
  sheets: SheetData[];
  styles: { [key: number]: Style };
  borders: { [key: number]: Border };
  entities: { [key: string]: { [key: string]: any } };
}

// -----------------------------------------------------------------------------
// Import
// -----------------------------------------------------------------------------

export function importData(data: WorkbookData): Workbook {
  if (!data.version) {
    throw new Error("Missing version number");
  }

  const state: Workbook = {
    rows: [],
    cols: [],
    cells: {},
    merges: {},
    mergeCellMap: {},
    width: 0,
    height: 0,
    clientWidth: DEFAULT_CELL_WIDTH + HEADER_WIDTH,
    clientHeight: DEFAULT_CELL_HEIGHT + HEADER_HEIGHT,
    offsetX: 0,
    offsetY: 0,
    scrollTop: 0,
    scrollLeft: 0,
    viewport: { top: 0, left: 0, bottom: 0, right: 0 },
    selection: {
      zones: [{ top: 0, left: 0, bottom: 0, right: 0 }],
      anchor: { col: 0, row: 0 }
    },
    activeCol: 0,
    activeRow: 0,
    activeXc: "A1",
    isEditing: false,
    currentContent: "",
    trackChanges: false,
    undoStack: [],
    redoStack: [],
    highlights: [],
    isSelectingRange: false,
    isCopyingFormat: false,
    loadingCells: 0,
    isStale: true,
    sheets: [],
    // please remove this next line
    // @ts-ignore
    activeSheet: {}
  };

  return state;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

function exportCols(cols: Col[]): { [key: number]: HeaderData } {
  const exportedCols: { [key: number]: HeaderData } = {};
  for (let i in cols) {
    const col = cols[i];
    if (col.size !== DEFAULT_CELL_WIDTH) {
      exportedCols[i] = { size: col.size };
    }
  }
  return exportedCols;
}

function exportRows(rows: Row[]): { [key: number]: HeaderData } {
  const exportedRows: { [key: number]: HeaderData } = {};
  for (let i in rows) {
    const row = rows[i];
    if (row.size !== DEFAULT_CELL_HEIGHT) {
      exportedRows[i] = { size: row.size };
    }
  }
  return exportedRows;
}

function exportMerges(merges: { [key: number]: Merge }): string[] {
  return Object.values(merges).map(
    merge => toXC(merge.left, merge.top) + ":" + toXC(merge.right, merge.bottom)
  );
}

export function exportData(state: Workbook): Partial<WorkbookData> {
  const sheets: SheetData[] = [];
  for (let sheetName in state.sheets) {
    const sheet = state.sheets[sheetName];
    const cells: { [key: string]: CellData } = {};
    for (let [key, cell] of Object.entries(sheet.cells)) {
      cells[key] = {
        content: cell.content,
        border: cell.border,
        style: cell.style,
        format: cell.format
      };
    }
    sheets.push({
      name: sheet.name,
      colNumber: sheet.colNumber,
      rowNumber: sheet.rowNumber,
      rows: exportRows(sheet.rows),
      cols: exportCols(sheet.cols),
      merges: exportMerges(sheet.merges),
      cells: cells,
      conditionalFormats: sheet.conditionalFormats
    });
  }

  return {
    version: CURRENT_VERSION,
    sheets
  };
}
