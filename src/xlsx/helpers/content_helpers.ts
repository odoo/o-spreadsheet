import { splitReference } from "../../helpers/references";
import { isSheetNameEqual } from "../../helpers/sheet";
import { toUnboundedZone } from "../../helpers/zones";
import { ExcelWorkbookData } from "../../types/workbook_data";
import { XLSXWorksheet } from "../../types/xlsx";
import {
  EXCEL_DEFAULT_COL_WIDTH,
  EXCEL_DEFAULT_ROW_HEIGHT,
  HEIGHT_FACTOR,
  WIDTH_FACTOR,
} from "../constants";

/**
 * Helpers used by the XLSX import pipeline (and shared with export where
 * symmetric, e.g. `getRangeSize`). Export-only helpers have moved into
 * `src/xlsx/export/` next to the features that consume them.
 */

export function convertHeightFromExcel(height: number | undefined): number | undefined {
  if (!height) {
    return height;
  }
  return Math.round((height / HEIGHT_FACTOR) * 100) / 100;
}

export function convertWidthFromExcel(width: number | undefined): number | undefined {
  if (!width) {
    return width;
  }
  return Math.round((width / WIDTH_FACTOR) * 100) / 100;
}

export function rotationFromXLSX(deg: number): number {
  if (deg <= 90) {
    return -(deg / 180) * Math.PI;
  } else {
    return (-(90 - deg) / 180) * Math.PI;
  }
}

/**
 * Convert a value expressed in EMU back to dot units. Inverse of
 * `convertDotValueToEMU` in `src/xlsx/export/xlsx_units.ts`.
 */
export function convertEMUToDotValue(value: number) {
  const DPI = 96;
  return Math.round((value * DPI) / 914400);
}

export function getRangeSize(
  reference: string,
  defaultSheetIndex: string,
  data: ExcelWorkbookData
) {
  let xc = reference;
  let sheetName: string | undefined = undefined;
  ({ xc, sheetName } = splitReference(reference));
  let rangeSheetIndex: number;
  if (sheetName) {
    const index = data.sheets.findIndex((sheet) => isSheetNameEqual(sheet.name, sheetName));
    if (index < 0) {
      throw new Error("Unable to find a sheet with the name " + sheetName);
    }
    rangeSheetIndex = index;
  } else {
    rangeSheetIndex = Number(defaultSheetIndex);
  }

  const zone = toUnboundedZone(xc);
  if (zone.right === undefined) {
    zone.right = data.sheets[rangeSheetIndex].colNumber;
  }
  if (zone.bottom === undefined) {
    zone.bottom = data.sheets[rangeSheetIndex].rowNumber;
  }

  return (zone.right - zone.left + 1) * (zone.bottom - zone.top + 1);
}

/**
 * Get the position of the start of a column in Excel (in px).
 */
export function getColPosition(colIndex: number, sheetData: XLSXWorksheet): number {
  let position = 0;
  for (let i = 0; i < colIndex; i++) {
    const colAtIndex = sheetData.cols.find((col) => i >= col.min && i <= col.max);
    if (colAtIndex?.width) {
      position += colAtIndex.width;
    } else if (sheetData.sheetFormat?.defaultColWidth) {
      position += sheetData.sheetFormat.defaultColWidth!;
    } else {
      position += EXCEL_DEFAULT_COL_WIDTH;
    }
  }
  return position / WIDTH_FACTOR;
}

/**
 * Get the position of the start of a row in Excel (in px).
 */
export function getRowPosition(rowIndex: number, sheetData: XLSXWorksheet) {
  let position = 0;
  for (let i = 0; i < rowIndex; i++) {
    const rowAtIndex = sheetData.rows.find((row) => row.index - 1 === i);
    if (rowAtIndex?.height) {
      position += rowAtIndex.height;
    } else if (sheetData.sheetFormat?.defaultRowHeight) {
      position += sheetData.sheetFormat.defaultRowHeight!;
    } else {
      position += EXCEL_DEFAULT_ROW_HEIGHT;
    }
  }
  return position / HEIGHT_FACTOR;
}
