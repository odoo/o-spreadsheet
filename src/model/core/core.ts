import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH
} from "../../constants";
import { AsyncFunction } from "../../formulas/compiler";
import { compile } from "../../formulas/index";
import { isNumber } from "../../functions/arguments";
import { numberToLetters, toCartesian } from "../../helpers";
import { AbstractPlugin } from "../abstract_plugin";
import { GridHistory } from "../history";
import {
  Box,
  CoreGridState,
  CoreState,
  GridCommand,
  GridData,
  Header,
  SheetData,
  ViewPort
} from "../types";
import { evaluateCells } from "./evaluation";
import { formatNumber, formatValue } from "../../formatters";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface Sheet {
  name: string;
  xcCells: { [xc: string]: Cell };
  rcCells: { [r: number]: { [c: number]: Cell } };
  totalWidth: number;
  totalHeight: number;
  cols: Header[];
  rows: Header[];
}

export interface Cell {
  content: string;
  xc: string;
  error?: boolean;
  value: any;
  formula?: any;
  async?: boolean;
  type: "formula" | "text" | "number";
  format?: string;
}

// ----------------------------------------------------------------------------
// Core
// ----------------------------------------------------------------------------
export class Core extends AbstractPlugin {
  sheets: Sheet[] = [];
  sheetsMap: { [name: string]: Sheet } = {};
  activeSheet: Sheet;
  loadingCells: number = 0;
  isStale: boolean = false;

  constructor(history: GridHistory, data: Partial<GridData>) {
    super(history, data);
    const sheets = data.sheets || [{ name: "Sheet1", colNumber: 26, rowNumber: 100 }];
    for (let sheetData of sheets) {
      const sheet = this.createSheet(sheetData);
      this.sheets.push(sheet);
      this.sheetsMap[sheet.name] = sheet;
    }
    this.activeSheet = this.sheets[0];
  }

  dispatch(command: GridCommand) {
    switch (command.type) {
      case "ADD_CELL":
        const sheet = this.sheetsMap[command.sheet];
        this.addCell(command.xc, sheet, command.content);
        break;
    }
  }

  evaluateFormulas() {
    if (this.isStale) {
      evaluateCells(this);
      this.isStale = false;
    }
  }

  private createSheet(data: SheetData): Sheet {
    // create columns
    const cols: Header[] = [];
    let current = 0;
    for (let i = 0; i < 26; i++) {
      cols.push({
        name: numberToLetters(i),
        index: i,
        start: current,
        end: current + DEFAULT_CELL_WIDTH,
        size: DEFAULT_CELL_WIDTH
      });
      current += DEFAULT_CELL_WIDTH;
    }
    const totalWidth = current;
    const rcCells = {};

    // create rows
    const rows: Header[] = [];
    current = 0;
    for (let i = 0; i < 100; i++) {
      rcCells[i] = {};
      rows.push({
        name: String(i + 1),
        index: i,
        start: current,
        end: current + DEFAULT_CELL_HEIGHT,
        size: DEFAULT_CELL_HEIGHT
      });
      current += DEFAULT_CELL_HEIGHT;
    }
    const totalHeight = current;

    const sheet: Sheet = {
      name: data.name,
      cols,
      rows,
      totalWidth,
      totalHeight,
      xcCells: {},
      rcCells
    };
    // add cells
    if (data.cells) {
      for (let xc in data.cells) {
        const content = data.cells[xc].content;
        if (content) {
          this.addCell(xc, sheet, content);
        }
      }
    }
    return sheet;
  }

  private addCell(xc: string, sheet: Sheet, content: string) {
    this.isStale = true;
    const [col, row] = toCartesian(xc);
    content = content.replace(nbspRegexp, " ");
    let type: Cell["type"] = "text";
    let value: Cell["value"] = content;
    if (content[0] === "=") {
      type = "formula";
    }
    if (isNumber(content)) {
      type = "number";
      value = parseFloat(content);
      if (content.includes("%")) {
        value = value / 100;
      }
    }
    const cell: Cell = { xc, content, value, type };

    if (cell.type === "formula") {
      cell.error = false;
      try {
        cell.formula = compile(content, sheet.name);

        if (cell.formula instanceof AsyncFunction) {
          cell.async = true;
        }
      } catch (e) {
        cell.value = "#BAD_EXPR";
        cell.error = true;
      }
    }
    sheet.xcCells[xc] = cell;
    if (!sheet.rcCells[row]) {
      sheet.rcCells[row] = {};
    }
    sheet.rcCells[row][col] = cell;
  }

  getState(): CoreState {
    return {
      totalWidth: this.activeSheet.totalWidth + HEADER_WIDTH,
      totalHeight: this.activeSheet.totalHeight + HEADER_HEIGHT,
      isSelectingRange: false,
      aggregate: null,
      sheets: this.sheets.map(s => s.name),
      activeSheet: this.activeSheet.name
    };
  }

  getGridState(state, viewPort: ViewPort): CoreGridState {
    // compute cols
    const cols: Header[] = [];
    for (let col of this.activeSheet.cols) {
      if (col.end < viewPort.offsetX) {
        continue;
      }
      cols.push(col);
      if (col.end + HEADER_WIDTH >= viewPort.offsetX + viewPort.width) {
        break;
      }
    }

    // compute rows
    const rows: Header[] = [];

    // note: this is O(n). Maybe we should optimise this?
    for (let row of this.activeSheet.rows) {
      if (row.end < viewPort.offsetY) {
        continue;
      }
      rows.push(row);
      if (row.end + HEADER_HEIGHT >= viewPort.offsetY + viewPort.height) {
        break;
      }
    }

    // offsets and dims
    const offsetX = cols[0].start - HEADER_WIDTH;
    const offsetY = rows[0].start - HEADER_HEIGHT;
    const width = cols[cols.length - 1].end - offsetX;
    const height = rows[rows.length - 1].end - offsetY;

    // cell boxes
    const boxes: Partial<Box>[] = [];
    const cells = this.activeSheet.rcCells;
    for (let row of rows) {
      for (let col of cols) {
        const cell = cells[row.index][col.index];
        if (cell) {
          boxes.push({
            x: col.start - offsetX,
            y: row.start - offsetY,
            width: col.size,
            height: row.size,
            text: formatCell(cell),
            isError: cell.error,
            align: cell.type === "text" ? "left" : "right"
          });
        }
      }
    }

    return {
      width,
      height,
      offsetX,
      offsetY,

      cols,
      rows,
      boxes: boxes
    };
  }
}

export function formatCell(cell: Cell): string {
  if (cell.value === "") {
    return "";
  }
  if (cell.value === false) {
    return "FALSE";
  }
  if (cell.value === true) {
    return "TRUE";
  }
  if (cell.error) {
    return cell.value;
  }

  const value = cell.value || 0;

  if (cell.type === "text") {
    return value.toString();
  }
  if (cell.format) {
    return formatValue(cell.value, cell.format);
  }
  return formatNumber(value);
}
