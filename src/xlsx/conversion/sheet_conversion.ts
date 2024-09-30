import {
  buildSheetLink,
  largeMax,
  markdownLink,
  replaceSpecialSpaces,
  splitReference,
  toCartesian,
  toXC,
} from "../../helpers";
import { CellData, HeaderData, SheetData } from "../../types";
import { XLSXCell, XLSXHyperLink, XLSXImportData, XLSXWorksheet } from "../../types/xlsx";
import {
  EXCEL_DEFAULT_COL_WIDTH,
  EXCEL_DEFAULT_ROW_HEIGHT,
  EXCEL_IMPORT_DEFAULT_NUMBER_OF_COLS,
  EXCEL_IMPORT_DEFAULT_NUMBER_OF_ROWS,
} from "../constants";
import { convertHeightFromExcel, convertWidthFromExcel } from "../helpers/content_helpers";
import { WarningTypes, XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { convertConditionalFormats } from "./cf_conversion";
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
    return {
      id: sheet.sheetName,
      areGridLinesVisible: sheetOptions ? sheetOptions.showGridLines : true,
      name: sheet.sheetName,
      colNumber: sheetDims[0],
      rowNumber: sheetDims[1],
      cells: convertCells(sheet, data, sheetDims, warningManager),
      merges: sheet.merges,
      cols: convertCols(sheet, sheetDims[0]),
      rows: convertRows(sheet, sheetDims[1]),
      conditionalFormats: convertConditionalFormats(sheet.cfs, data.dxfs, warningManager),
      figures: convertFigures(sheet),
      isVisible: sheet.isVisible,
      panes: sheetOptions
        ? { xSplit: sheetOptions.pane.xSplit, ySplit: sheetOptions.pane.ySplit }
        : { xSplit: 0, ySplit: 0 },
      filterTables: [],
    };
  });
}

function convertCols(sheet: XLSXWorksheet, numberOfCols: number): Record<number, HeaderData> {
  const cols: Record<number, HeaderData> = {};
  // Excel begins indexes at 1
  for (let i = 1; i < numberOfCols + 1; i++) {
    const col = sheet.cols.find((col) => col.min <= i && i <= col.max);
    let colSize: number;
    if (col && col.width) colSize = col.width;
    else if (sheet.sheetFormat?.defaultColWidth) colSize = sheet.sheetFormat.defaultColWidth;
    else colSize = EXCEL_DEFAULT_COL_WIDTH;
    cols[i - 1] = { size: convertWidthFromExcel(colSize), isHidden: col?.hidden };
  }
  return cols;
}

function convertRows(sheet: XLSXWorksheet, numberOfRows: number): Record<number, HeaderData> {
  const rows: Record<number, HeaderData> = {};
  // Excel begins indexes at 1
  for (let i = 1; i < numberOfRows + 1; i++) {
    const row = sheet.rows.find((row) => row.index === i);
    let rowSize: number;
    if (row && row.height) rowSize = row.height;
    else if (sheet.sheetFormat?.defaultRowHeight) rowSize = sheet.sheetFormat.defaultRowHeight;
    else rowSize = EXCEL_DEFAULT_ROW_HEIGHT;
    rows[i - 1] = { size: convertHeightFromExcel(rowSize), isHidden: row?.hidden };
  }
  return rows;
}

function convertSharedStrings(xlsxSharedStrings: string[]): string[] {
  return xlsxSharedStrings.map(replaceSpecialSpaces);
}

function convertCells(
  sheet: XLSXWorksheet,
  data: XLSXImportData,
  sheetDims: number[],
  warningManager: XLSXImportWarningManager
): Record<string, CellData | undefined> {
  const cells: Record<string, CellData | undefined> = {};
  const sharedStrings = convertSharedStrings(data.sharedStrings);

  const hyperlinkMap = sheet.hyperlinks.reduce((map, link) => {
    map[link.xc] = link;
    return map;
  }, {} as HyperlinkMap);

  for (let row of sheet.rows) {
    for (let cell of row.cells) {
      cells[cell.xc] = {
        content: getCellValue(cell, hyperlinkMap, sharedStrings, warningManager),
        // + 1 : our indexes for normalized values begin at 1 and not 0
        style: cell.styleIndex ? cell.styleIndex + 1 : undefined,
        border: cell.styleIndex ? data.styles[cell.styleIndex].borderId + 1 : undefined,
        format: cell.styleIndex ? data.styles[cell.styleIndex].numFmtId + 1 : undefined,
      };
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
      cell.style = cell.style ? cell.style : row.styleIndex! + 1;
      cell.border = cell.border ? cell.border : data.styles[row.styleIndex!].borderId + 1;
      cell.format = cell.format ? cell.format : data.styles[row.styleIndex!].numFmtId + 1;
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
        cell.style = cell.style ? cell.style : col.styleIndex! + 1;
        cell.border = cell.border ? cell.border : data.styles[col.styleIndex!].borderId + 1;
        cell.format = cell.format ? cell.format : data.styles[col.styleIndex!].numFmtId + 1;
      }
    }
  }

  return cells;
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
