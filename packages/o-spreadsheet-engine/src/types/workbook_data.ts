import { ZoneBorderData } from "../plugins/core/borders";
import { CellValue } from "./cells";
import { ExcelChartDefinition } from "./chart";
import { ConditionalFormat } from "./conditional_formatting";
import { DataValidationRule } from "./data_validation";
import { Format } from "./format";
import { Image } from "./image";
import { Locale } from "./locale";
import {
  Color,
  Dimension,
  HeaderGroup,
  HeaderIndex,
  PaneDivision,
  Pixel,
  PixelPosition,
  Style,
  UID,
} from "./misc";
import { PivotCoreDefinition } from "./pivot";
import { CoreTableType, TableConfig, TableStyleTemplateName } from "./table";

export interface Dependencies {
  references: string[];
  numbers: number[];
  strings: string[];
}

export interface HeaderData {
  size?: number;
  isHidden?: boolean;
}

export interface FigureData<T> {
  id: UID;
  col: HeaderIndex;
  row: HeaderIndex;
  offset: PixelPosition;
  width: Pixel;
  height: Pixel;
  tag: string;
  data: T;
}

export interface SheetData {
  id: string;
  name: string;
  colNumber: number;
  rowNumber: number;
  cells: { [key: string]: string | undefined };
  styles: { [zone: string]: number };
  formats: { [zone: string]: number };
  borders: { [zone: string]: number };
  merges: string[];
  figures: FigureData<any>[];
  cols: { [key: number]: HeaderData };
  rows: { [key: number]: HeaderData };
  conditionalFormats: ConditionalFormat[];
  dataValidationRules: DataValidationRuleData[];
  tables: TableData[];
  areGridLinesVisible?: boolean;
  isVisible: boolean;
  panes?: PaneDivision;
  headerGroups?: Record<Dimension, HeaderGroup[]>;
  color?: Color;
  isLocked?: boolean;
}

interface WorkbookSettings {
  locale: Locale;
  disableCellAnimations?: boolean;
}

type PivotData = { formulaId: string } & PivotCoreDefinition;

export interface WorkbookData {
  version: string;
  sheets: SheetData[];
  styles: { [key: number]: Style };
  formats: { [key: number]: Format };
  borders: { [key: number]: ZoneBorderData };
  pivots: { [key: string]: PivotData };
  pivotNextId: number;
  revisionId: UID;
  uniqueFigureIds: boolean;
  settings: WorkbookSettings;
  customTableStyles: { [key: string]: TableStyleData };
}

export interface ExcelWorkbookData extends WorkbookData {
  sheets: ExcelSheetData[];
}

export interface ExcelSheetData extends Omit<SheetData, "figureTables" | "cols" | "rows"> {
  cellValues: { [xc: string]: CellValue | undefined };
  formulaSpillRanges: { [xc: string]: string };
  charts: FigureData<ExcelChartDefinition>[];
  images: FigureData<Image>[];
  tables: ExcelTableData[];
  cols: { [key: number]: ExcelHeaderData };
  rows: { [key: number]: ExcelHeaderData };
}

export interface ExcelHeaderData extends HeaderData {
  outlineLevel?: number;
  collapsed?: boolean;
}

export interface TableData {
  range: string;
  config?: TableConfig;
  type?: CoreTableType;
}

export interface DataValidationRuleData extends Omit<DataValidationRule, "ranges"> {
  ranges: string[];
}

export interface ExcelTableData {
  range: string;
  filters: ExcelFilterData[];
  config: TableConfig;
}

export interface ExcelFilterData {
  colId: number;
  displayedValues: string[];
  displayBlanks?: boolean;
}

export interface TableStyleData {
  templateName: TableStyleTemplateName;
  primaryColor: string;
  displayName: string;
}
