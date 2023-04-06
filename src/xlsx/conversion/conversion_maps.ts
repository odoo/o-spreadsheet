import { IconSetType } from "../../components/icons/icons";
import {
  Align,
  BorderStyle,
  ConditionalFormattingOperatorValues,
  ExcelChartType,
  ThresholdType,
} from "../../types";
import { LegendPosition } from "../../types/chart/common_chart";
import {
  ExcelIconSet,
  XLSXBorderStyle,
  XLSXCellType,
  XLSXCfOperatorType,
  XLSXCfType,
  XLSXCfValueObjectType,
  XLSXChartType,
  XLSXHorizontalAlignment,
} from "../../types/xlsx";

export const SUPPORTED_BORDER_STYLES = ["thin"];
export const SUPPORTED_HORIZONTAL_ALIGNMENTS = ["general", "left", "center", "right"];
export const SUPPORTED_FONTS = ["Arial"];
export const SUPPORTED_FILL_PATTERNS = ["solid"];
export const SUPPORTED_CF_TYPES = [
  "expression",
  "cellIs",
  "colorScale",
  "iconSet",
  "containsText",
  "notContainsText",
  "beginsWith",
  "endsWith",
  "containsBlanks",
  "notContainsBlanks",
];

/** Map between cell type in XLSX file and human readable cell type  */
export const CELL_TYPE_CONVERSION_MAP: Record<string, XLSXCellType> = {
  b: "boolean",
  d: "date",
  e: "error",
  inlineStr: "inlineStr",
  n: "number",
  s: "sharedString",
  str: "str",
};

/** Conversion map Border Style in XLSX <=> Border style in o_spreadsheet*/
export const BORDER_STYLE_CONVERSION_MAP: Record<XLSXBorderStyle, BorderStyle | undefined> = {
  dashDot: "thin",
  dashDotDot: "thin",
  dashed: "thin",
  dotted: "thin",
  double: "thin",
  hair: "thin",
  medium: "thin",
  mediumDashDot: "thin",
  mediumDashDotDot: "thin",
  mediumDashed: "thin",
  none: undefined,
  slantDashDot: "thin",
  thick: "thin",
  thin: "thin",
};

/** Conversion map Horizontal Alignment in XLSX <=> Horizontal Alignment in o_spreadsheet*/
export const H_ALIGNMENT_CONVERSION_MAP: Record<XLSXHorizontalAlignment, Align> = {
  general: undefined,
  left: "left",
  center: "center",
  right: "right",
  fill: "left",
  justify: "left",
  centerContinuous: "center",
  distributed: "center",
};

/** Convert the "CellIs" cf operator.
 * We have all the operators that the xlsx have, but ours begin with a uppercase character */
export function convertCFCellIsOperator(
  xlsxCfOperator: XLSXCfOperatorType
): ConditionalFormattingOperatorValues {
  return (xlsxCfOperator.slice(0, 1).toUpperCase() +
    xlsxCfOperator.slice(1)) as ConditionalFormattingOperatorValues;
}

/** Conversion map CF types in XLSX <=> Cf types in o_spreadsheet */
export const CF_TYPE_CONVERSION_MAP: Record<
  XLSXCfType,
  ConditionalFormattingOperatorValues | undefined
> = {
  aboveAverage: undefined,
  expression: undefined,
  cellIs: undefined, // exist but isn't an operator in o_spreadsheet
  colorScale: undefined, // exist but isn't an operator in o_spreadsheet
  dataBar: undefined,
  iconSet: undefined, // exist but isn't an operator in o_spreadsheet
  top10: undefined,
  uniqueValues: undefined,
  duplicateValues: undefined,
  containsText: "ContainsText",
  notContainsText: "NotContains",
  beginsWith: "BeginsWith",
  endsWith: "EndsWith",
  containsBlanks: "IsEmpty",
  notContainsBlanks: "IsNotEmpty",
  containsErrors: undefined,
  notContainsErrors: undefined,
  timePeriod: undefined,
};

/** Conversion map CF thresholds types in XLSX <=> Cf thresholds types in o_spreadsheet */
export const CF_THRESHOLD_CONVERSION_MAP: Record<XLSXCfValueObjectType, ThresholdType> = {
  num: "number",
  percent: "percentage",
  max: "value",
  min: "value",
  percentile: "percentile",
  formula: "formula",
};

/**
 * Conversion map between Excels IconSets and our own IconSets. The string is the key of the iconset in the ICON_SETS constant.
 *
 * NoIcons is undefined instead of an empty string because we don't support it and need to mange it separately.
 */
export const ICON_SET_CONVERSION_MAP: Record<ExcelIconSet, IconSetType | undefined> = {
  NoIcons: undefined,
  "3Arrows": "arrows",
  "3ArrowsGray": "arrows",
  "3Symbols": "smiley",
  "3Symbols2": "smiley",
  "3Signs": "dots",
  "3Flags": "dots",
  "3TrafficLights1": "dots",
  "3TrafficLights2": "dots",
  "4Arrows": "arrows",
  "4ArrowsGray": "arrows",
  "4RedToBlack": "dots",
  "4Rating": "smiley",
  "4TrafficLights": "dots",
  "5Arrows": "arrows",
  "5ArrowsGray": "arrows",
  "5Rating": "smiley",
  "5Quarters": "dots",
  "3Stars": "smiley",
  "3Triangles": "arrows",
  "5Boxes": "dots",
};

/** Map between legend position in XLSX file and human readable position  */
export const DRAWING_LEGEND_POSITION_CONVERSION_MAP: Record<string, LegendPosition> = {
  b: "bottom",
  t: "top",
  l: "left",
  r: "right",
  tr: "right",
};

/** Conversion map chart types in XLSX <=> Cf chart types o_spreadsheet (undefined for unsupported chart types)*/
export const CHART_TYPE_CONVERSION_MAP: Record<XLSXChartType, ExcelChartType | undefined> = {
  areaChart: undefined,
  area3DChart: undefined,
  lineChart: "line",
  line3DChart: undefined,
  stockChart: undefined,
  radarChart: undefined,
  scatterChart: undefined,
  pieChart: "pie",
  pie3DChart: undefined,
  doughnutChart: "pie",
  barChart: "bar",
  bar3DChart: undefined,
  ofPieChart: undefined,
  surfaceChart: undefined,
  surface3DChart: undefined,
  bubbleChart: undefined,
};

/** Conversion map for the SUBTOTAL(index, formula) function in xlsx, index <=> actual function*/
export const SUBTOTAL_FUNCTION_CONVERSION_MAP: Record<number, string> = {
  "1": "AVERAGE",
  "2": "COUNT",
  "3": "COUNTA",
  "4": "MAX",
  "5": "MIN",
  "6": "PRODUCT",
  "7": "STDEV",
  "8": "STDEVP",
  "9": "SUM",
  "10": "VAR",
  "11": "VARP",
  "101": "AVERAGE",
  "102": "COUNT",
  "103": "COUNTA",
  "104": "MAX",
  "105": "MIN",
  "106": "PRODUCT",
  "107": "STDEV",
  "108": "STDEVP",
  "109": "SUM",
  "110": "VAR",
  "111": "VARP",
};

/** Mapping between Excel format indexes (see XLSX_FORMAT_MAP) and some supported formats  */
export const XLSX_FORMATS_CONVERSION_MAP: Record<number, string | undefined> = {
  0: "",
  1: "0",
  2: "0.00",
  3: "#,#00",
  4: "#,##0.00",
  9: "0%",
  10: "0.00%",
  11: undefined,
  12: undefined,
  13: undefined,
  14: "m/d/yyyy",
  15: "m/d/yyyy",
  16: "m/d/yyyy",
  17: "m/d/yyyy",
  18: "hh:mm:ss a",
  19: "hh:mm:ss a",
  20: "hhhh:mm:ss",
  21: "hhhh:mm:ss",
  22: "m/d/yy h:mm",
  37: undefined,
  38: undefined,
  39: undefined,
  40: undefined,
  45: "hhhh:mm:ss",
  46: "hhhh:mm:ss",
  47: "hhhh:mm:ss",
  48: undefined,
  49: undefined,
};

/**
 * Mapping format index to format defined by default
 *
 * OpenXML $18.8.30
 * */
export const XLSX_FORMAT_MAP = {
  "0": 1,
  "0.00": 2,
  "#,#00": 3,
  "#,##0.00": 4,
  "0%": 9,
  "0.00%": 10,
  "0.00E+00": 11,
  "# ?/?": 12,
  "# ??/??": 13,
  "mm-dd-yy": 14,
  "d-mm-yy": 15,
  "mm-yy": 16,
  "mmm-yy": 17,
  "h:mm AM/PM": 18,
  "h:mm:ss AM/PM": 19,
  "h:mm": 20,
  "h:mm:ss": 21,
  "m/d/yy h:mm": 22,
  "#,##0 ;(#,##0)": 37,
  "#,##0 ;[Red](#,##0)": 38,
  "#,##0.00;(#,##0.00)": 39,
  "#,##0.00;[Red](#,##0.00)": 40,
  "mm:ss": 45,
  "[h]:mm:ss": 46,
  "mmss.0": 47,
  "##0.0E+0": 48,
  "@": 49,
  "hh:mm:ss a": 19, // TODO: discuss: this format is not recognized by excel for example (doesn't follow their guidelines I guess)
};

/** OpenXML $18.8.27 */
export const XLSX_INDEXED_COLORS = {
  0: "000000",
  1: "FFFFFF",
  2: "FF0000",
  3: "00FF00",
  4: "0000FF",
  5: "FFFF00",
  6: "FF00FF",
  7: "00FFFF",
  8: "000000",
  9: "FFFFFF",
  10: "FF0000",
  11: "00FF00",
  12: "0000FF",
  13: "FFFF00",
  14: "FF00FF",
  15: "00FFFF",
  16: "800000",
  17: "008000",
  18: "000080",
  19: "808000",
  20: "800080",
  21: "008080",
  22: "C0C0C0",
  23: "808080",
  24: "9999FF",
  25: "993366",
  26: "FFFFCC",
  27: "CCFFFF",
  28: "660066",
  29: "FF8080",
  30: "0066CC",
  31: "CCCCFF",
  32: "000080",
  33: "FF00FF",
  34: "FFFF00",
  35: "00FFFF",
  36: "800080",
  37: "800000",
  38: "008080",
  39: "0000FF",
  40: "00CCFF",
  41: "CCFFFF",
  42: "CCFFCC",
  43: "FFFF99",
  44: "99CCFF",
  45: "FF99CC",
  46: "CC99FF",
  47: "FFCC99",
  48: "3366FF",
  49: "33CCCC",
  50: "99CC00",
  51: "FFCC00",
  52: "FF9900",
  53: "FF6600",
  54: "666699",
  55: "969696",
  56: "003366",
  57: "339966",
  58: "003300",
  59: "333300",
  60: "993300",
  61: "993366",
  62: "333399",
  63: "333333",
  64: "000000", // system foreground
  65: "FFFFFF", // system background
};

export const IMAGE_MIMETYPE_EXTENSION_MAPPING = {
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/vnd.microsoft.icon": "ico",
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/tiff": "tiff",
  "image/webp": "webp",
};
