import { ExcelIconSet } from "../types/xlsx";

/** In XLSX color format (no #)  */
export const AUTO_COLOR = "000000";

export const XLSX_ICONSET_MAP: Record<string, ExcelIconSet> = {
  arrow: "3Arrows",
  smiley: "3Symbols",
  dot: "3TrafficLights1",
};

export const NAMESPACE = {
  styleSheet: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  sst: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  Relationships: "http://schemas.openxmlformats.org/package/2006/relationships",
  Types: "http://schemas.openxmlformats.org/package/2006/content-types",
  worksheet: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  workbook: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  drawing: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
  table: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
  revision: "http://schemas.microsoft.com/office/spreadsheetml/2014/revision",
  revision3: "http://schemas.microsoft.com/office/spreadsheetml/2016/revision3",
  markupCompatibility: "http://schemas.openxmlformats.org/markup-compatibility/2006",
};

export const DRAWING_NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
export const DRAWING_NS_C = "http://schemas.openxmlformats.org/drawingml/2006/chart";

export const CONTENT_TYPES = {
  workbook: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  sheet: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  sharedStrings: "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
  styles: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
  drawing: "application/vnd.openxmlformats-officedocument.drawing+xml",
  chart: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
  themes: "application/vnd.openxmlformats-officedocument.theme+xml",
  table: "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml",
  pivot: "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml",
  externalLink: "application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml",
} as const;

export const XLSX_RELATION_TYPE = {
  document: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  sheet: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
  sharedStrings:
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
  styles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
  drawing: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
  chart: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
  theme: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
  table: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/table",
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
} as const;

export const RELATIONSHIP_NSR =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export const HEIGHT_FACTOR = 0.75; // 100px => 75 u
export const WIDTH_FACTOR = 0.1317; // 100px => 13.17 u

/** unit : maximum number of characters a column can hold at the standard font size. What. */
export const EXCEL_DEFAULT_COL_WIDTH = 8.43;
/** unit : points */
export const EXCEL_DEFAULT_ROW_HEIGHT = 12.75;

export const EXCEL_IMPORT_DEFAULT_NUMBER_OF_COLS = 30;
export const EXCEL_IMPORT_DEFAULT_NUMBER_OF_ROWS = 100;

export const FIRST_NUMFMT_ID = 164;

interface functionDefaultArg {
  type: "NUMBER";
  value: number;
}

export const FORCE_DEFAULT_ARGS_FUNCTIONS: Record<string, functionDefaultArg[]> = {
  FLOOR: [{ type: "NUMBER", value: 1 }],
  CEILING: [{ type: "NUMBER", value: 1 }],
  ROUND: [{ type: "NUMBER", value: 0 }],
  ROUNDUP: [{ type: "NUMBER", value: 0 }],
  ROUNDDOWN: [{ type: "NUMBER", value: 0 }],
};

/**
 * This list contains all "future" functions that are not compatible with older versions of Excel
 * For more information, see https://docs.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/5d1b6d44-6fc1-4ecd-8fef-0b27406cc2bf
 */
export const NON_RETROCOMPATIBLE_FUNCTIONS = [
  "ACOT",
  "ACOTH",
  "AGGREGATE",
  "ARABIC",
  "BASE",
  "BETA.DIST",
  "BETA.INV",
  "BINOM.DIST",
  "BINOM.DIST.RANGE",
  "BINOM.INV",
  "BITAND",
  "BITLSHIFT",
  "BITOR",
  "BITRSHIFT",
  "BITXOR",
  "BYCOL",
  "BYROW",
  "CEILING.MATH",
  "CEILING.PRECISE",
  "CHISQ.DIST",
  "CHISQ.DIST.RT",
  "CHISQ.INV",
  "CHISQ.INV.RT",
  "CHISQ.TEST",
  "CHOOSECOLS",
  "CHOOSEROWS",
  "COMBINA",
  "CONCAT",
  "CONFIDENCE.NORM",
  "CONFIDENCE.T",
  "COT",
  "COTH",
  "COVARIANCE.P",
  "COVARIANCE.S",
  "CSC",
  "CSCH",
  "DAYS",
  "DECIMAL",
  "DROP",
  "ERF.PRECISE",
  "ERFC.PRECISE",
  "EXPAND",
  "EXPON.DIST",
  "F.DIST",
  "F.DIST.RT",
  "F.INV",
  "F.INV.RT",
  "F.TEST",
  "FIELDVALUE",
  "FILTERXML",
  "FLOOR.MATH",
  "FLOOR.PRECISE",
  "FORECAST.ETS",
  "FORECAST.ETS.CONFINT",
  "FORECAST.ETS.SEASONALITY",
  "FORECAST.ETS.STAT",
  "FORECAST.LINEAR",
  "FORMULATEXT",
  "GAMMA",
  "GAMMA.DIST",
  "GAMMA.INV",
  "GAMMALN.PRECISE",
  "GAUSS",
  "HSTACK",
  "HYPGEOM.DIST",
  "IFNA",
  "IFS",
  "IMCOSH",
  "IMCOT",
  "IMCSC",
  "IMCSCH",
  "IMSEC",
  "IMSECH",
  "IMSINH",
  "IMTAN",
  "ISFORMULA",
  "ISOMITTED",
  "ISOWEEKNUM",
  "LAMBDA",
  "LET",
  "LOGNORM.DIST",
  "LOGNORM.INV",
  "MAKEARRAY",
  "MAP",
  "MAXIFS",
  "MINIFS",
  "MODE.MULT",
  "MODE.SNGL",
  "MUNIT",
  "NEGBINOM.DIST",
  "NORM.DIST",
  "NORM.INV",
  "NORM.S.DIST",
  "NORM.S.INV",
  "NUMBERVALUE",
  "PDURATION",
  "PERCENTILE.EXC",
  "PERCENTILE.INC",
  "PERCENTRANK.EXC",
  "PERCENTRANK.INC",
  "PERMUTATIONA",
  "PHI",
  "POISSON.DIST",
  "PQSOURCE",
  "PYTHON_STR",
  "PYTHON_TYPE",
  "PYTHON_TYPENAME",
  "QUARTILE.EXC",
  "QUARTILE.INC",
  "QUERYSTRING",
  "RANDARRAY",
  "RANK.AVG",
  "RANK.EQ",
  "REDUCE",
  "RRI",
  "SCAN",
  "SEC",
  "SECH",
  "SEQUENCE",
  "SHEET",
  "SHEETS",
  "SKEW.P",
  "SORTBY",
  "STDEV.P",
  "STDEV.S",
  "SWITCH",
  "T.DIST",
  "T.DIST.2T",
  "T.DIST.RT",
  "T.INV",
  "T.INV.2T",
  "T.TEST",
  "TAKE",
  "TEXTAFTER",
  "TEXTBEFORE",
  "TEXTJOIN",
  "TEXTSPLIT",
  "TOCOL",
  "TOROW",
  "UNICHAR",
  "UNICODE",
  "UNIQUE",
  "VAR.P",
  "VAR.S",
  "VSTACK",
  "WEBSERVICE",
  "WEIBULL.DIST",
  "WRAPCOLS",
  "WRAPROWS",
  "XLOOKUP",
  "XOR",
  "Z.TEST",
];

export const CONTENT_TYPES_FILE = "[Content_Types].xml";
