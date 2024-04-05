import { Alias, ExcelChartDefinition, Format, PaneDivision } from ".";
import { ExcelImage } from "../types/image";
import { ExcelFigureSize } from "./figure";

/**
 * Most of the times we tried to create Objects that matched quite closely with the data in the XLSX files.
 * The most notable exceptions are graphs and charts, as their definition are complex and we won't use most of it.
 *
 * Used the specification of the OpenXML file formats
 * https://www.ecma-international.org/publications-and-standards/standards/ecma-376/
 *
 * Or XLSX extension of OpenXml
 * https://docs.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/2c5dee00-eff2-4b22-92b6-0738acd4475e
 *
 *
 * Quick reference :
 * [OpenXml] :
 *  - border (XLSXBorder): §18.8.4 (border)
 *  - cells (XLSXCell): §18.3.1.4 (c)
 *  - color (XLSXColor): §18.3.1.15 (color)
 *  - columns (XLSXColumn): §18.3.1.13 (col)
 *  - conditional format (XLSXConditionalFormat): §18.3.1.18 (conditionalFormatting)
 *  - chart (ExcelChartDefinition): §21.2.2.27 (chart)
 *  - cf rule (XLSXCfRule): §18.3.1.10 (cfRule)
 *  - cf rule icon set (XLSXIconSet) : §18.3.1.49 (iconSet)
 *  - cf value object (XLSXCfValueObject): §18.3.1.11 (cfvo)
 *  - data filter (XLSXSimpleFilter): §18.3.2.6 (filter)
 *  - data filter column (XLSXFilterColumn): §18.3.2.7 (filterColumns)
 *  - data filter zone (XLSXAutoFilter): §18.3.1.2 (autoFilter)
 *  - external workbook (XLSXExternalBook): $18.14.7 (externalBook)
 *  - fills (XLSXFill): §18.8.20 (fill)
 *  - figure (XLSXFigure): §20.5.2.35 (wsDr (Worksheet Drawing))
 *  - fonts (XLSXFont): §18.8.22 (font)
 *  - images (XLSXImageFile): §20.2.2.5 (pic)
 *  - merge (string): §18.3.1.55 (mergeCell)
 *  - number format (XLSXNumFormat) : §18.8.30 (numFmt)
 *  - outline properties (XLSXOutlineProperties): §18.3.1.31 (outlinePr)
 *  - rows (XLSXRow): §18.3.1.73 (row)
 *  - sheet (XLSXWorksheet): §18.3.1.99 (worksheet)
 *  - sheet format (XLSXSheetFormat): §18.3.1.81 (sheetFormatPr)
 *  - sheet properties (XLSXSheetProperties): §18.3.1.82 (sheetPr)
 *  - sheet view (XLSXSheetView): §18.3.1.87 (sheetFormatPr)
 *  - sheet workbook info (XLSXSheetWorkbookInfo): §18.2.19 (sheet)
 *  - style, for cell (XLSXStyle): §18.8.45 (xf)
 *  - style, for non-cell (eg. conditional format) (XLSXDxf): §18.8.14 (dxf)
 *  - table (XLSXTable) : §18.5.1.2 (table)
 *  - table column (XLSXTableCol) : §18.5.1.3 (tableColumn)
 *  - table style (XLSXTableStyleInfo) : §18.5.1.5 (tableStyleInfo)
 *  - theme color : §20.1.2.3.32 (srgbClr/sysClr)
 *
 * [XLSX]: :
 * - cf rule (XLSXCfRule): §2.6.2 (CT_ConditionalFormatting)
 * - cf rule icon set (XLSXIconSet): §2.6.28 (CT_IconSet)
 * - cf icon (XLSXCfIcon): §2.6.36 (CT_CfIcon)
 *
 * Simple Types :
 * [OpenXml] :
 *  - border style (XLSXBorderStyle):  §18.18.3 (Border Line Styles)
 *  - cell type (XLSXCellType):  §18.18.11 (Cell Type) (mapped with xlsxCellTypeMap to be human readable)
 *  - cf type (XLSXCfType):  §18.18.12 (Conditional Format Type)
 *  - cf value object type (XLSXCfValueObjectType):  §18.18.13 (Conditional Format Value Object Type)
 *  - cf operator type (XLSXCfOperatorType):  §18.18.15 (Conditional Format Operators)
 *  - fill pattern types (XLSXFillPatternType):  §18.18.55 (Pattern Type)
 *  - horizontal alignment (XLSXHorizontalAlignment):  §18.18.40 (Horizontal Alignment Type)
 *  - vertical alignment (XLSXVerticalAlignment):  §18.18.88 (Horizontal Alignment Type)
 *
 * [XLSX] :
 *  - icon set types (ExcelIconSet):  §2.7.10 (ST_IconSetType)
 */

/**
 * This structure covers all the necessary "assets" to generate an XLSX file.
 * Those assets consist of:
 *  - a rel file including metadata specifying how the others files form the final document
 *    (this currently includes sheets, styles, shared content (string))
 *  - a sharedStrings file that regroups all static string values found in the cells
 *  - a style file including all the normalized style elements for cells,
 *    including cell-specific conditional formatting
 *
 * @param rels: a list of files and their specific type/role in the final document
 * @param sharedStrings: regroups all static string values found in the cells.
 * @param fonts: All normalized fonts
 * @param fills: " normalized fills
 * @param borders: " normalized borders
 * @param NumFmts: " normalized number formats
 * @param styles: " combinations of font-fill-border, number format found in the cells
 * @param dxf: " Conditional Formatting of type "CellIsRule"
 */
export interface XLSXStructure {
  relsFiles: XLSXRelFile[];
  sharedStrings: string[];
  fonts: XLSXFont[];
  fills: XLSXFill[];
  borders: XLSXBorder[];
  numFmts: XLSXNumFormat[];
  styles: XLSXStyle[];
  dxfs: XLSXDxf[];
}

export interface XLSXImportData extends Omit<XLSXStructure, "relsFiles"> {
  sheets: XLSXWorksheet[];
  externalBooks: XLSXExternalBook[];
}

export interface XLSXFileStructure {
  sheets: XLSXImportFile[];
  workbook: XLSXImportFile;
  styles: XLSXImportFile;
  sharedStrings: XLSXImportFile;
  theme?: XLSXImportFile;
  charts: XLSXImportFile[];
  figures: XLSXImportFile[];
  tables: XLSXImportFile[];
  externalLinks: XLSXImportFile[];
  images: XLSXImageFile[];
}

export type XMLAttributeValue = string | number | boolean;
type XMLAttribute = [string, XMLAttributeValue];
export type XMLAttributes = XMLAttribute[];

/**
 * Represent a raw XML string
 */
export class XMLString {
  /**
   * @param xmlString should be a well formed, properly escaped XML string
   */
  constructor(private xmlString: string) {}

  toString(): string {
    return this.xmlString;
  }
}

export interface XLSXDxf {
  font?: XLSXFont;
  fill?: XLSXFill;
  numFmt?: XLSXNumFormat;
  alignment?: XLSXCellAlignment;
  border?: XLSXBorder;
}

export interface XLSXRel {
  id: string;
  type: string;
  target: string;
  targetMode?: "External";
}

export interface XLSXRelFile {
  path: string;
  rels: XLSXRel[];
}

export type XLSXExportFile = XLSXExportImageFile | XLSXExportXMLFile;

export interface XLSXExportXMLFile {
  path: string;
  content: string;
  contentType?: string;
}

export interface XLSXExportImageFile {
  path: string;
  imageSrc: string;
}

export interface XLSXExport {
  name: string;
  files: XLSXExportFile[];
}

export interface XLSXFont {
  size?: number;
  family?: number;
  color?: XLSXColor;
  name?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}
export interface XLSXCellAlignment {
  horizontal?: XLSXHorizontalAlignment;
  vertical?: XLSXVerticalAlignment;
  textRotation?: number;
  wrapText?: boolean;
  indent?: number;
  relativeIndent?: number;
  justifyLastLine?: boolean;
  shrinkToFit?: boolean;
  readingOrder?: number;
}

export interface XLSXFill {
  patternType?: XLSXFillPatternType;
  reservedAttribute?: string; // will generate a specific specific attribute in XML. If set, fgColor is ignored.
  fgColor?: XLSXColor;
  bgColor?: XLSXColor;
}

export interface XLSXStyle {
  fontId: number;
  fillId: number;
  borderId: number;
  numFmtId: number;
  alignment?: XLSXCellAlignment;
}

export interface ExtractedStyle {
  font: XLSXFont;
  fill: XLSXFill;
  border: number;
  numFmt: XLSXNumFormat | undefined;
  alignment: XLSXCellAlignment;
}

export interface XLSXWorksheet {
  sheetName: string;
  isVisible: boolean;
  sheetViews: XLSXSheetView[];
  sheetFormat?: XLSXSheetFormat;
  sheetProperties?: XLSXSheetProperties;
  cols: XLSXColumn[];
  rows: XLSXRow[];
  cfs: XLSXConditionalFormat[];
  sharedFormulas: string[];
  merges: string[];
  figures: XLSXFigure[];
  hyperlinks: XLSXHyperLink[];
  tables: XLSXTable[];
}

export interface XLSXSheetView {
  /** True if this is the sheet currently selected */
  tabSelected: boolean;
  showFormulas: boolean;
  showGridLines: boolean;
  showRowColHeaders: boolean;
  pane: PaneDivision;
}

export interface XLSXSheetFormat {
  defaultColWidth: number;
  defaultRowHeight: number;
}

export interface XLSXColumn {
  min: number;
  max: number;
  width?: number;
  customWidth?: boolean;
  bestFit?: boolean;
  hidden?: boolean;
  styleIndex?: number;
  outlineLevel?: number;
  collapsed?: boolean;
}
export interface XLSXRow {
  index: number;
  height?: number;
  customHeight?: boolean;
  hidden?: boolean;
  cells: XLSXCell[];
  styleIndex?: number;
  outlineLevel?: number;
  collapsed?: boolean;
}

export interface XLSXFormula {
  content?: string;
  sharedIndex?: number;
  ref?: string;
}

export interface XLSXCell {
  xc: string; // OpenXml specs defines it as optional, but not having it makes no sense
  styleIndex?: number;
  type: XLSXCellType;
  value?: string;
  formula?: XLSXFormula;
}
export interface XLSXTheme {
  clrScheme?: XLSXColorScheme[];
}

export interface XLSXColorScheme {
  name: string;
  value: string;
  lastClr?: string;
}

export interface XLSXNumFormat {
  id: number;
  format: Format;
}
export interface XLSXBorder {
  top?: XLSXBorderDescr;
  left?: XLSXBorderDescr;
  bottom?: XLSXBorderDescr;
  right?: XLSXBorderDescr;
  diagonal?: XLSXBorderDescr;
  diagonalUp?: boolean;
  diagonalDown?: boolean;
}

export interface XLSXBorderDescr {
  style: XLSXBorderStyle;
  color: XLSXColor;
}

export type ExcelIconSet =
  | "NoIcons"
  | "3Arrows"
  | "3ArrowsGray"
  | "3Symbols"
  | "3Symbols2"
  | "3Signs"
  | "3Flags"
  | "3TrafficLights1"
  | "3TrafficLights2"
  | "4Arrows"
  | "4ArrowsGray"
  | "4RedToBlack"
  | "4Rating"
  | "4TrafficLights"
  | "5Arrows"
  | "5ArrowsGray"
  | "5Rating"
  | "5Quarters"
  | "3Stars"
  | "3Triangles"
  | "5Boxes";

/**
 * Standardized XLSX hexadecimal color (with or without alpha channel).
 * Note that the alpha channel goes first! AARRGGBB
 * e.g. "1E5010" or "331E5010"
 */
export type XlsxHexColor = string & Alias;

export interface ImportedFiles {
  [path: string]:
    | string
    | {
        imageSrc: string;
      };
}

export interface XLSXXmlDocuments {
  [path: string]: XMLDocument;
}

export interface XLSXImageFile {
  fileName: string;
  imageSrc: string;
}

type XLSXFillPatternType =
  | "none"
  | "solid"
  | "gray0625"
  | "gray125"
  | "lightGray"
  | "mediumGray"
  | "darkGray"
  | "darkHorizontal"
  | "darkVertical"
  | "darkUp"
  | "darkDown"
  | "darkGrid"
  | "darkTrellis"
  | "lightHorizontal"
  | "lightVertical"
  | "lightDown"
  | "lightUp"
  | "lightGrid"
  | "lightTrellis";

export type XLSXBorderStyle =
  | "dashDot"
  | "dashDotDot"
  | "dashed"
  | "dotted"
  | "double"
  | "hair"
  | "medium"
  | "mediumDashDot"
  | "mediumDashDotDot"
  | "mediumDashed"
  | "none"
  | "slantDashDot"
  | "thick"
  | "thin";

export type XLSXCellType =
  | "boolean"
  | "date"
  | "error"
  | "inlineStr"
  | "number"
  | "sharedString"
  | "str";

export type XLSXCfType =
  | "aboveAverage"
  | "expression"
  | "cellIs"
  | "colorScale"
  | "dataBar"
  | "iconSet"
  | "top10"
  | "uniqueValues"
  | "duplicateValues"
  | "containsText"
  | "notContainsText"
  | "beginsWith"
  | "endsWith"
  | "containsBlanks"
  | "notContainsBlanks"
  | "containsErrors"
  | "notContainsErrors"
  | "timePeriod";

export type XLSXCfOperatorType =
  | "beginsWith"
  | "between"
  | "containsText"
  | "endsWith"
  | "equal"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "notBetween"
  | "notContains"
  | "notEqual";

export type XLSXHorizontalAlignment =
  | "general"
  | "left"
  | "center"
  | "right"
  | "fill"
  | "justify"
  | "centerContinuous"
  | "distributed";

export type XLSXVerticalAlignment = "top" | "center" | "bottom" | "justify" | "distributed";

export type XLSXCfValueObjectType = "num" | "percent" | "max" | "min" | "percentile" | "formula";

export interface XLSXCfValueObject {
  type: XLSXCfValueObjectType;
  gte?: boolean;
  value?: string;
}
export interface XLSXColorScale {
  colors: XLSXColor[];
  cfvos: XLSXCfValueObject[];
}

export interface XLSXIconSet {
  iconSet: ExcelIconSet;
  cfvos: XLSXCfValueObject[];
  cfIcons?: XLSXCfIcon[]; // Icons can be defined individually instead of following iconSet
  showValue?: boolean;
  percent?: boolean;
  reverse?: boolean;
  custom?: boolean;
}

export interface XLSXCfIcon {
  iconSet: ExcelIconSet;
  iconId: number;
}
export interface XLSXConditionalFormat {
  cfRules: XLSXCfRule[];
  sqref: string[];
  pivot?: boolean;
}

export interface XLSXCfRule {
  type: XLSXCfType;
  priority: number;
  formula?: string[];
  colorScale?: XLSXColorScale;
  dataBar?: any;
  iconSet?: XLSXIconSet;
  dxfId?: number;
  stopIfTrue?: boolean;
  aboveAverage?: boolean;
  percent?: boolean;
  bottom?: boolean;
  operator?: XLSXCfOperatorType;
  text?: string;
  timePeriod?: any;
  rank?: number;
  stdDev?: number;
  equalAverage?: boolean;
}

export interface XLSXSharedFormula {
  formula: string;
  refCellXc: string;
}

export interface XLSXColor {
  auto?: boolean;
  indexed?: number;
  rgb?: string;
  tint?: number;
}

export interface XLSXFigureAnchor {
  col: number;
  colOffset: number; // in EMU (English Metrical Unit)
  row: number;
  rowOffset: number; // in EMU (English Metrical Unit)
}

export interface XLSXFigureSize {
  cx: number;
  cy: number;
}

export interface XLSXFigure {
  anchors: XLSXFigureAnchor[];
  data: ExcelChartDefinition | ExcelImage;
  figureSize?: ExcelFigureSize;
}

export const XLSX_CHART_TYPES = [
  "areaChart",
  "area3DChart",
  "lineChart",
  "line3DChart",
  "stockChart",
  "radarChart",
  "scatterChart",
  "pieChart",
  "pie3DChart",
  "doughnutChart",
  "barChart",
  "bar3DChart",
  "ofPieChart",
  "surfaceChart",
  "surface3DChart",
  "bubbleChart",
] as const;
export type XLSXChartType = (typeof XLSX_CHART_TYPES)[number];

/** An XLSX File is a main XML file and optionally a corresponding rel file */
export interface XLSXImportFile {
  file: XMLFile;
  rels?: XMLFile;
}

export interface XMLFile {
  fileName: string;
  xml: XMLDocument;
}

export interface XLSXHyperLink {
  xc: string;
  location?: string;
  display?: string;
  relTarget?: string;
}

export interface XLSXTableStyleInfo {
  name?: string;
  showFirstColumn?: boolean;
  showLastColumn?: boolean;
  showRowStripes?: boolean;
  showColumnStripes?: boolean;
}

export interface XLSXTableCol {
  name: string;
  id: string;
  colFormula?: string;
}

export interface XLSXTable {
  displayName: string;
  name?: string;
  id: string;
  ref: string;
  headerRowCount: number;
  totalsRowCount: number;
  cols: XLSXTableCol[];
  style?: XLSXTableStyleInfo;
  autoFilter?: XLSXAutoFilter;
}

export interface XLSXAutoFilter {
  zone: string;
  columns: XLSXFilterColumn[];
}

export interface XLSXFilterColumn {
  colId: number;
  hiddenButton?: boolean;
  filters: XLSXSimpleFilter[];
}

export interface XLSXSimpleFilter {
  val: string;
}

export interface XLSXExternalBook {
  rId: string;
  sheetNames: string[];
  datasets: XLSXExternalSheetData[];
}

export interface XLSXExternalSheetData {
  sheetId: number;
  data: Record<string, string>; // Record XC : value
}

export type XLSXSheetState = "visible" | "hidden" | "veryHidden";

export interface XLSXSheetWorkbookInfo {
  relationshipId: string;
  sheetId: string;
  sheetName: string;
  state: XLSXSheetState;
}

export interface XLSXSheetProperties {
  outlinePr?: XLSXOutlineProperties;
}

export interface XLSXOutlineProperties {
  summaryBelow: boolean;
  summaryRight: boolean;
}
