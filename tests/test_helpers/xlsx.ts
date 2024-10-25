import { toCartesian, toXC, toZone } from "../../src/helpers";
import { Border, Color, ConditionalFormat, Style } from "../../src/types";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "./../../src/constants";
import { SheetData, WorkbookData } from "./../../src/types/workbook_data";

export function getWorkbookSheet(sheetName: string, data: WorkbookData): SheetData | undefined {
  return data.sheets.find((sheet) => sheet.name === sheetName);
}

export function getWorkbookCell(col: number, row: number, sheet: SheetData): string | undefined {
  return sheet.cells[toXC(col, row)];
}

export function getWorkbookCellStyle(
  styleId: number | undefined,
  data: WorkbookData
): Style | undefined {
  return styleId ? data.styles[styleId] : undefined;
}

export function getWorkbookCellFormat(
  formatId: number | undefined,
  data: WorkbookData
): string | undefined {
  return formatId ? data.formats[formatId] : undefined;
}

export function getWorkbookCellBorder(
  borderId: number | undefined,
  data: WorkbookData
): Border | undefined {
  const border = borderId ? data.borders[borderId] : undefined;
  // Add undefined borders for toMatchObject matchers
  if (border) {
    ["top", "left", "right", "bottom"].forEach(
      (dir) => (border[dir] = border[dir] ? border[dir] : undefined)
    );
  }
  return borderId ? data.borders[borderId] : undefined;
}

export function getCFBeginningAt(xc: string, sheetData: SheetData): ConditionalFormat | undefined {
  const position = toCartesian(xc);
  return sheetData.conditionalFormats.find((cf) =>
    cf.ranges.some((range) => {
      const cfZone = toZone(range);
      if (cfZone.left === position.col && cfZone.top === position.row) {
        return true;
      }
      return false;
    })
  );
}

/**
 * Transform a color in a standard #RRGGBBAA representation
 */
export function standardizeColor(color: Color) {
  if (color.startsWith("#")) {
    color = color.slice(1).toUpperCase();
  }
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  if (color.length === 6) {
    color += "FF";
  }
  return "#" + color;
}

export function getColPosition(col: number, sheetData: SheetData) {
  let position = 0;
  for (let i = 0; i < col; i++) {
    position += sheetData.cols[i]?.size || DEFAULT_CELL_WIDTH;
  }
  return position;
}

export function getRowPosition(row: number, sheetData: SheetData) {
  let position = 0;
  for (let i = 0; i < row; i++) {
    position += sheetData.rows[i]?.size || DEFAULT_CELL_HEIGHT;
  }
  return position;
}
