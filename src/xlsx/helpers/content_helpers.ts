import { DEFAULT_FONT_SIZE } from "../../constants";
import { deepEquals, splitReference, toUnboundedZone } from "../../helpers";
import {
  ConditionalFormattingOperatorValues,
  ExcelCellData,
  ExcelWorkbookData,
  Format,
  Style,
  UID,
  WorkbookData,
} from "../../types";
import {
  ExtractedStyle,
  XLSXDataValidationDateOperatorType,
  XLSXDataValidationOperatorType,
  XLSXHorizontalAlignment,
  XLSXNumFormat,
  XLSXRel,
  XLSXRelFile,
  XLSXStructure,
  XLSXStyle,
  XLSXWorksheet,
} from "../../types/xlsx";
import {
  EXCEL_DEFAULT_COL_WIDTH,
  EXCEL_DEFAULT_ROW_HEIGHT,
  FIRST_NUMFMT_ID,
  HEIGHT_FACTOR,
  WIDTH_FACTOR,
} from "../constants";
import {
  V_ALIGNMENT_EXPORT_CONVERSION_MAP,
  XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING,
  XLSX_DV_DECIMAL_OPERATOR_MAPPING,
  XLSX_FORMAT_MAP,
} from "../conversion/conversion_maps";

// -------------------------------------
//            CF HELPERS
// -------------------------------------

/**
 * Convert the conditional formatting o-spreadsheet operator to
 * the corresponding excel operator.
 * */
export function convertOperator(operator: ConditionalFormattingOperatorValues): string {
  switch (operator) {
    case "IsNotEmpty":
      return "notContainsBlanks";
    case "IsEmpty":
      return "containsBlanks";
    case "NotContains":
      return "notContainsBlanks";
    default:
      return operator.charAt(0).toLowerCase() + operator.slice(1);
  }
}

// -------------------------------------
//        WORKSHEET HELPERS
// -------------------------------------

export function getCellType(value: number | string | boolean | null): string | undefined {
  switch (typeof value) {
    case "boolean":
      return "b";
    case "string":
      return "str";
    case "number":
      return "n";
    default:
      return undefined;
  }
}

export function convertHeightToExcel(height: number): number {
  return Math.round(HEIGHT_FACTOR * height * 100) / 100;
}

export function convertWidthToExcel(width: number): number {
  return Math.round(WIDTH_FACTOR * width * 100) / 100;
}

export function convertHeightFromExcel(height: number | undefined): number | undefined {
  if (!height) return height;
  return Math.round((height / HEIGHT_FACTOR) * 100) / 100;
}

export function convertWidthFromExcel(width: number | undefined): number | undefined {
  if (!width) return width;
  return Math.round((width / WIDTH_FACTOR) * 100) / 100;
}

export function extractStyle(cell: ExcelCellData, data: WorkbookData): ExtractedStyle {
  let style: Style = {};
  if (cell.style) {
    style = data.styles[cell.style];
  }
  const format = extractFormat(cell, data);
  const styles = {
    font: {
      size: style?.fontSize || DEFAULT_FONT_SIZE,
      color: { rgb: style?.textColor ? style!.textColor : "000000" },
      family: 2,
      name: "Arial",
    },
    fill: style?.fillColor
      ? {
          fgColor: { rgb: style!.fillColor },
        }
      : { reservedAttribute: "none" },
    numFmt: format ? { format: format, id: 0 /* id not used for export */ } : undefined,
    border: cell.border || 0,
    alignment: {
      horizontal: style.align as XLSXHorizontalAlignment,
      vertical: style.verticalAlign
        ? V_ALIGNMENT_EXPORT_CONVERSION_MAP[style.verticalAlign]
        : undefined,
      wrapText: style.wrapping === "wrap" || undefined,
    },
  };

  styles.font["strike"] = !!style?.strikethrough || undefined;
  styles.font["underline"] = !!style?.underline || undefined;
  styles.font["bold"] = !!style?.bold || undefined;
  styles.font["italic"] = !!style?.italic || undefined;
  return styles;
}

function extractFormat(cell: ExcelCellData, data: WorkbookData): Format | undefined {
  if (cell.format) {
    return data.formats[cell.format];
  }
  return undefined;
}

export function normalizeStyle(construct: XLSXStructure, styles: ExtractedStyle): number {
  // Normalize this
  const numFmtId = convertFormat(styles["numFmt"], construct.numFmts);
  const style = {
    fontId: pushElement(styles.font, construct.fonts),
    fillId: pushElement(styles.fill, construct.fills),
    borderId: styles.border,
    numFmtId,
    alignment: {
      vertical: styles.alignment.vertical,
      horizontal: styles.alignment.horizontal,
      wrapText: styles.alignment.wrapText,
    },
  } as XLSXStyle;

  return pushElement(style, construct.styles);
}

function convertFormat(
  format: XLSXNumFormat | undefined,
  numFmtStructure: XLSXNumFormat[]
): number {
  if (!format) {
    return 0;
  }
  let formatId: number | undefined = XLSX_FORMAT_MAP[format.format];
  if (!formatId) {
    formatId = pushElement(format, numFmtStructure) + FIRST_NUMFMT_ID;
  }
  return formatId;
}

/**
 * Add a relation to the given file and return its id.
 */
export function addRelsToFile(
  relsFiles: XLSXRelFile[],
  path: string,
  rel: Omit<XLSXRel, "id">
): string {
  let relsFile = relsFiles.find((file) => file.path === path);
  // the id is a one-based int casted as string
  let id: string;
  if (!relsFile) {
    id = "rId1";
    relsFiles.push({ path, rels: [{ ...rel, id }] });
  } else {
    id = `rId${(relsFile.rels.length + 1).toString()}`;
    relsFile.rels.push({
      ...rel,
      id,
    });
  }
  return id;
}

export function pushElement<T>(property: T, propertyList: T[]): number {
  let len = propertyList.length;
  const operator = typeof property === "object" ? deepEquals : (a: T, b: T) => a === b;
  for (let i = 0; i < len; i++) {
    if (operator(property, propertyList[i])) {
      return i;
    }
  }

  propertyList[propertyList.length] = property;
  return propertyList.length - 1;
}

const chartIds: UID[] = [];

/**
 * Convert a chart o-spreadsheet id to a xlsx id which
 * are unsigned integers (starting from 1).
 */
export function convertChartId(chartId: UID) {
  const xlsxId = chartIds.findIndex((id) => id === chartId);
  if (xlsxId === -1) {
    chartIds.push(chartId);
    return chartIds.length;
  }
  return xlsxId + 1;
}

const imageIds: UID[] = [];

/**
 * Convert a image o-spreadsheet id to a xlsx id which
 * are unsigned integers (starting from 1).
 */
export function convertImageId(imageId: UID) {
  const xlsxId = imageIds.findIndex((id) => id === imageId);
  if (xlsxId === -1) {
    imageIds.push(imageId);
    return imageIds.length;
  }
  return xlsxId + 1;
}

/**
 * Convert a value expressed in dot to EMU.
 * EMU = English Metrical Unit
 * There are 914400 EMU per inch.
 *
 * /!\ A value expressed in EMU cannot be fractional.
 * See https://docs.microsoft.com/en-us/windows/win32/vml/msdn-online-vml-units#other-units-of-measurement
 */
export function convertDotValueToEMU(value: number) {
  const DPI = 96;
  return Math.round((value * 914400) / DPI);
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
    const index = data.sheets.findIndex((sheet) => sheet.name === sheetName);
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

export function convertEMUToDotValue(value: number) {
  const DPI = 96;
  return Math.round((value * DPI) / 914400);
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
    const rowAtIndex = sheetData.rows[i];
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

/**
 * Convert the o-spreadsheet data validation decimal
 * criterion type to the corresponding excel operator.
 */
export function convertDecimalCriterionTypeToExcelOperator(operator: string) {
  return Object.keys(XLSX_DV_DECIMAL_OPERATOR_MAPPING).find(
    (key) => XLSX_DV_DECIMAL_OPERATOR_MAPPING[key] === operator
  ) as XLSXDataValidationOperatorType;
}

/**
 * Convert the o-spreadsheet data validation date
 * criterion type to the corresponding excel operator.
 */
export function convertDateCriterionTypeToExcelOperator(operator: string) {
  return Object.keys(XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING).find(
    (key) => XLSX_DV_DATE_OPERATOR_TO_DV_TYPE_MAPPING[key] === operator
  ) as XLSXDataValidationDateOperatorType;
}
