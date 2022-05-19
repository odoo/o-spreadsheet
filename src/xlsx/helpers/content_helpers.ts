import { DEFAULT_FONT_SIZE } from "../../constants";
import { toUnboundedZone } from "../../helpers";
import {
  Align,
  Border,
  CellData,
  ConditionalFormattingOperatorValues,
  ExcelWorkbookData,
  Format,
  Style,
  UID,
  WorkbookData,
} from "../../types";
import { ExtractedStyle, XLSXRel, XLSXRelFile, XLSXStructure } from "../../types/xlsx";
import { FIRST_NUMFMT_ID, HEIGHT_FACTOR, WIDTH_FACTOR, XLSX_FORMAT_MAP } from "../constants";

type PropertyPosition<T> = {
  id: number;
  list: T[];
};

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

export function getCellType(value: number | string | boolean): string {
  switch (typeof value) {
    case "boolean":
      return "b";
    case "string":
      return "str";
    case "number":
      return "n";
  }
}

/**
 * For some reason, Excel will only take the devicePixelRatio (i.e. interface scale on Windows desktop)
 * into account for the height.
 */
export function convertHeight(height: number): number {
  return Math.round(HEIGHT_FACTOR * height * window.devicePixelRatio * 100) / 100;
}

export function convertWidth(width: number): number {
  return Math.round(WIDTH_FACTOR * width * 100) / 100;
}

export function extractStyle(cell: CellData, data: WorkbookData): ExtractedStyle {
  let style: Style = {};
  if (cell.style) {
    style = data.styles[cell.style];
  }
  const format = cell.format ? data.formats[cell.format] : undefined;
  let border: Border = {};
  if (cell.border) {
    border = data.borders[cell.border];
  }
  const styles = {
    font: {
      size: style?.fontSize || DEFAULT_FONT_SIZE,
      color: style?.textColor ? style!.textColor : "000000",
      family: 2,
      name: "Arial",
    },
    fill: style?.fillColor
      ? {
          fgColor: style!.fillColor,
        }
      : { reservedAttribute: "none" },
    numFmt: format,
    border: border || {},
    verticalAlignment: "center" as Align, // we always center vertically for now
    horizontalAlignment: style?.align,
  };

  styles.font["strike"] = !!style?.strikethrough || undefined;
  styles.font["underline"] = !!style?.underline || undefined;
  styles.font["bold"] = !!style?.bold || undefined;
  styles.font["italic"] = !!style?.italic || undefined;
  return styles;
}

export function normalizeStyle(construct: XLSXStructure, styles: ExtractedStyle): number {
  const { id: fontId } = pushElement(styles["font"], construct.fonts);
  const { id: fillId } = pushElement(styles["fill"], construct.fills);
  const { id: borderId } = pushElement(styles["border"], construct.borders);
  // Normalize this
  const numFmtId = convertFormat(styles["numFmt"], construct.numFmts);
  const style = {
    fontId,
    fillId,
    borderId,
    numFmtId,
    verticalAlignment: styles["verticalAlignment"] as string,
    horizontalAlignment: styles["horizontalAlignment"] as string,
  };
  const { id } = pushElement(style, construct.styles);

  return id;
}

export function convertFormat(format: Format | undefined, numFmtStructure: string[]): number {
  if (!format) {
    return 0;
  }
  let formatId: number | undefined = XLSX_FORMAT_MAP[format];
  if (!formatId) {
    const { id } = pushElement(format, numFmtStructure);
    formatId = id + FIRST_NUMFMT_ID;
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

export function pushElement<T>(property: T, propertyList: T[]): PropertyPosition<T> {
  for (let [key, value] of Object.entries(propertyList)) {
    if (JSON.stringify(value) === JSON.stringify(property)) {
      return { id: parseInt(key, 10), list: propertyList };
    }
  }
  let elemId = propertyList.findIndex((elem) => JSON.stringify(elem) === JSON.stringify(property));
  if (elemId === -1) {
    propertyList.push(property);
    elemId = propertyList.length - 1;
  }
  return {
    id: elemId,
    list: propertyList,
  };
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

export function getRangeSize(xc: string, defaultSheetIndex: string, data: ExcelWorkbookData) {
  const xcSplit = xc.split("!");
  let rangeSheetIndex: number;
  if (xcSplit.length > 1) {
    const index = data.sheets.findIndex((sheet) => sheet.name === xcSplit[0]);
    if (index < 0) {
      throw new Error("Unable to find a sheet with the name " + xcSplit[0]);
    }
    rangeSheetIndex = index;
    xc = xcSplit[1];
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
