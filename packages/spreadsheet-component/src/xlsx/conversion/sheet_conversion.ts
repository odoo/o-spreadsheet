import {
  buildSheetLink,
  largeMax,
  markdownLink,
  splitReference,
  toCartesian,
  toXC,
} from "../../helpers";
import { CellData, Dimension, HeaderData, HeaderGroup, SheetData } from "../../types";
import {
  XLSXCell,
  XLSXColumn,
  XLSXHyperLink,
  XLSXImportData,
  XLSXRow,
  XLSXWorksheet,
} from "../../types/xlsx";
import {
  EXCEL_DEFAULT_COL_WIDTH,
  EXCEL_DEFAULT_ROW_HEIGHT,
  EXCEL_IMPORT_DEFAULT_NUMBER_OF_COLS,
  EXCEL_IMPORT_DEFAULT_NUMBER_OF_ROWS,
} from "../constants";
import { convertHeightFromExcel, convertWidthFromExcel } from "../helpers/content_helpers";
import { WarningTypes, XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { convertConditionalFormats } from "./cf_conversion";
import { convertColor } from "./color_conversion";
import { convertFigures } from "./figure_conversion";
import { convertFormulasContent } from "./formula_conversion";

/** map XC : Hyperlink */
type HyperlinkMap = Record<string, XLSXHyperLink>;

export function convertSheets(
  data: XLSXImportData,
  warningManager: XLSXImportWarningManager
): SheetData[] {
  return data.sheets.map((sheet): SheetData => {
    convertFormulasContent(sheet, data);
    const sheetDims = getSheetDims(sheet);
    const sheetOptions = sheet.sheetViews[0];
    const rowHeaderGroups = convertHeaderGroup(sheet, "ROW", sheetDims[1]);
    const colHeaderGroups = convertHeaderGroup(sheet, "COL", sheetDims[0]);
    return {
      id: sheet.sheetName,
      areGridLinesVisible: sheetOptions ? sheetOptions.showGridLines : true,
      name: sheet.sheetName,
      colNumber: sheetDims[0],
      rowNumber: sheetDims[1],
      ...convertCells(sheet, data, sheetDims, warningManager),
      merges: sheet.merges,
      cols: convertCols(sheet, sheetDims[0], colHeaderGroups),
      rows: convertRows(sheet, sheetDims[1], rowHeaderGroups),
      conditionalFormats: convertConditionalFormats(sheet.cfs, data.dxfs, warningManager),
      figures: convertFigures(sheet),
      isVisible: sheet.isVisible,
      panes: sheetOptions
        ? { xSplit: sheetOptions.pane.xSplit, ySplit: sheetOptions.pane.ySplit }
        : { xSplit: 0, ySplit: 0 },
      tables: [],
      headerGroups: { COL: colHeaderGroups, ROW: rowHeaderGroups },
      color: convertColor(sheet.sheetProperties?.tabColor),
    };
  });
}

function convertCols(
  sheet: XLSXWorksheet,
  numberOfCols: number,
  headerGroups: HeaderGroup[]
): Record<number, HeaderData> {
  const cols: Record<number, HeaderData> = {};
  // Excel begins indexes at 1
  for (let i = 1; i < numberOfCols + 1; i++) {
    const col = sheet.cols.find((col) => col.min <= i && i <= col.max);
    let colSize: number;
    if (col && col.width) colSize = col.width;
    else if (sheet.sheetFormat?.defaultColWidth) colSize = sheet.sheetFormat.defaultColWidth;
    else colSize = EXCEL_DEFAULT_COL_WIDTH;
    // In xlsx there is no difference between hidden columns and columns inside a folded group.
    // But in o-spreadsheet folded columns are not considered hidden.
    const colIndex = i - 1;
    const isColFolded = headerGroups.some(
      (group) => group.isFolded && group.start <= colIndex && colIndex <= group.end
    );
    cols[colIndex] = {
      size: convertWidthFromExcel(colSize),
      isHidden: !isColFolded && col?.hidden,
    };
  }
  return cols;
}

function convertRows(
  sheet: XLSXWorksheet,
  numberOfRows: number,
  headerGroups: HeaderGroup[]
): Record<number, HeaderData> {
  const rows: Record<number, HeaderData> = {};
  // Excel begins indexes at 1
  for (let i = 1; i < numberOfRows + 1; i++) {
    const row = sheet.rows.find((row) => row.index === i);
    let rowSize: number;
    if (row && row.height) rowSize = row.height;
    else if (sheet.sheetFormat?.defaultRowHeight) rowSize = sheet.sheetFormat.defaultRowHeight;
    else rowSize = EXCEL_DEFAULT_ROW_HEIGHT;
    // In xlsx there is no difference between hidden rows and rows inside a folded group.
    // But in o-spreadsheet folded rows are not considered hidden.
    const rowIndex = i - 1;
    const isRowFolded = headerGroups.some(
      (group) => group.isFolded && group.start <= rowIndex && rowIndex <= group.end
    );
    rows[rowIndex] = {
      size: convertHeightFromExcel(rowSize),
      isHidden: !isRowFolded && row?.hidden,
    };
  }
  return rows;
}

/** Remove newlines (\n) in shared strings, We do not support them */
function convertSharedStrings(xlsxSharedStrings: string[]): string[] {
  return xlsxSharedStrings.map((str) => str.replace(/\n/g, ""));
}

function convertCells(
  sheet: XLSXWorksheet,
  data: XLSXImportData,
  sheetDims: number[],
  warningManager: XLSXImportWarningManager
): Pick<SheetData, "cells" | "styles" | "formats" | "borders"> {
  const cells: Record<string, CellData | undefined> = {};
  const styles: Record<string, number> = {};
  const formats: Record<string, number> = {};
  const borders: Record<string, number> = {};
  const sharedStrings = convertSharedStrings(data.sharedStrings);

  const hyperlinkMap = sheet.hyperlinks.reduce((map, link) => {
    map[link.xc] = link;
    return map;
  }, {} as HyperlinkMap);

  for (let row of sheet.rows) {
    for (let cell of row.cells) {
      cells[cell.xc] = {
        content: getCellValue(cell, hyperlinkMap, sharedStrings, warningManager),
      };
      if (cell.styleIndex) {
        // + 1 : our indexes for normalized values begin at 1 and not 0
        styles[cell.xc] = cell.styleIndex + 1;
        formats[cell.xc] = data.styles[cell.styleIndex].numFmtId + 1;
        borders[cell.xc] = data.styles[cell.styleIndex].borderId + 1;
      }
    }
  }

  // Apply row style
  for (let row of sheet.rows.filter((row) => row.styleIndex)) {
    for (let colIndex = 1; colIndex <= sheetDims[0]; colIndex++) {
      const xc = toXC(colIndex - 1, row.index - 1); // Excel indexes start at 1
      let cell = cells[xc];
      if (!cell) {
        cell = {};
        cells[xc] = cell;
      }
      styles[xc] ??= row.styleIndex! + 1;
      borders[xc] ??= data.styles[row.styleIndex!].borderId + 1;
      formats[xc] ??= data.styles[row.styleIndex!].numFmtId + 1;
    }
  }

  // Apply col style
  for (let col of sheet.cols.filter((col) => col.styleIndex)) {
    for (let colIndex = col.min; colIndex <= Math.min(col.max, sheetDims[0]); colIndex++) {
      for (let rowIndex = 1; rowIndex <= sheetDims[1]; rowIndex++) {
        const xc = toXC(colIndex - 1, rowIndex - 1); // Excel indexes start at 1
        let cell = cells[xc];
        if (!cell) {
          cell = {};
          cells[xc] = cell;
        }
        styles[xc] ??= col.styleIndex! + 1;
        borders[xc] ??= data.styles[col.styleIndex!].borderId + 1;
        formats[xc] ??= data.styles[col.styleIndex!].numFmtId + 1;
      }
    }
  }

  return { cells, styles, formats, borders };
}

function getCellValue(
  cell: XLSXCell,
  hyperLinksMap: HyperlinkMap,
  sharedStrings: string[],
  warningManager: XLSXImportWarningManager
) {
  let cellValue: string | undefined;
  switch (cell.type) {
    case "sharedString":
      const ssIndex = parseInt(cell.value!, 10);
      cellValue = sharedStrings[ssIndex];
      break;
    case "boolean":
      cellValue = Number(cell.value) ? "TRUE" : "FALSE";
      break;
    case "date": // I'm not sure where this is used rather than a number with a format
    case "error": // I don't think Excel really uses this
    case "inlineStr":
    case "number":
    case "str":
      cellValue = cell.value;
      break;
  }

  if (cellValue && hyperLinksMap[cell.xc]) {
    cellValue = convertHyperlink(hyperLinksMap[cell.xc], cellValue, warningManager);
  }

  if (cell.formula) {
    cellValue = cell.formula.content;
  }

  return cellValue;
}

function convertHyperlink(
  link: XLSXHyperLink,
  cellValue: string,
  warningManager: XLSXImportWarningManager
): string {
  const label = link.display || cellValue;
  if (!link.relTarget && !link.location) {
    warningManager.generateNotSupportedWarning(WarningTypes.BadlyFormattedHyperlink);
  }
  const url = link.relTarget
    ? link.relTarget
    : buildSheetLink(splitReference(link.location!).sheetName!);
  return markdownLink(label, url);
}

function getSheetDims(sheet: XLSXWorksheet): number[] {
  const dims = [0, 0];

  for (let row of sheet.rows) {
    dims[0] = Math.max(dims[0], largeMax(row.cells.map((cell) => toCartesian(cell.xc).col)));
    dims[1] = Math.max(dims[1], row.index);
  }

  dims[0] = Math.max(dims[0], EXCEL_IMPORT_DEFAULT_NUMBER_OF_COLS);
  dims[1] = Math.max(dims[1], EXCEL_IMPORT_DEFAULT_NUMBER_OF_ROWS);

  return dims;
}

/**
 * Get the header groups from the XLS file.
 *
 * See ASCII art in HeaderGroupingPlugin.exportForExcel() for details on how the groups are defined in the xlsx.
 */
function convertHeaderGroup(
  sheet: XLSXWorksheet,
  dim: Dimension,
  numberOfHeaders: number
): HeaderGroup[] {
  const outlineProperties = sheet?.sheetProperties?.outlinePr;
  const headerGroups: HeaderGroup[] = [];
  let currentLayer = 0;
  for (let i = 0; i < numberOfHeaders; i++) {
    const header = getHeader(sheet, dim, i);
    const headerLayer = header?.outlineLevel || 0;
    if (headerLayer > currentLayer) {
      // Whether the flag indicating if the group is collapsed is on the header before or after the group. Default is after.
      const collapseFlagAfter =
        (dim === "ROW" ? outlineProperties?.summaryBelow : outlineProperties?.summaryRight) ?? true;
      const group = computeHeaderGroup(sheet, dim, i, collapseFlagAfter);
      if (group) {
        headerGroups.push(group);
      }
    }
    currentLayer = headerLayer;
  }
  return headerGroups;
}

function computeHeaderGroup(
  sheet: XLSXWorksheet,
  dim: Dimension,
  startIndex: number,
  collapseFlagAfter: boolean
): HeaderGroup | undefined {
  const startHeader = getHeader(sheet, dim, startIndex);
  const startLayer = startHeader?.outlineLevel;
  if (!startLayer || !startLayer) {
    return undefined;
  }
  let currentLayer = startLayer;
  let currentIndex = startIndex;
  let currentHeader: XLSXRow | XLSXColumn | undefined = startHeader;

  while (currentHeader && currentLayer >= startLayer) {
    currentIndex++;
    currentHeader = getHeader(sheet, dim, currentIndex);
    currentLayer = currentHeader?.outlineLevel || 0;
  }
  const start = startIndex;
  const end = currentIndex - 1;
  const collapseFlagHeader = collapseFlagAfter
    ? getHeader(sheet, dim, end + 1)
    : getHeader(sheet, dim, start - 1);
  const isFolded = collapseFlagHeader?.collapsed || false;
  return { start: start - 1, end: end - 1, isFolded }; // -1 because indices start at 1 in excel and 0 in o-spreadsheet
}

function getHeader(
  sheet: XLSXWorksheet,
  dim: Dimension,
  index: number
): XLSXRow | XLSXColumn | undefined {
  return "COL" === dim
    ? sheet.cols.find((col) => col.min <= index && index <= col.max)
    : sheet.rows.find((row) => row.index === index);
}
