<<<<<<< f135c07860d14c28c3002f0aacd7d4d10b229c3f:packages/o-spreadsheet-engine/src/types/workbook_data.ts
import { ZoneBorderData } from "../plugins/core/borders";
import { CellValue } from "./cells";
import { ExcelChartDefinition } from "./chart";
||||||| a1801a94ff524e45fe8f7f409e4b80837c7a37b7:src/types/workbook_data.ts
import { CellValue, DataValidationRule, Format, Locale } from ".";
import { ZoneBorderData } from "../plugins/core";
import { ExcelChartDefinition } from "./chart/chart";
=======
import { CellValue, DataValidationRule, Format, Locale } from ".";
import { ExcelChartDefinition } from "./chart/chart";
>>>>>>> 81aa2cdcb3b43f517fb9cbc15c989686107464de:src/types/workbook_data.ts
import { ConditionalFormat } from "./conditional_formatting";
import { DataValidationRule } from "./data_validation";
import { Format } from "./format";
import { Image } from "./image";
import { Locale } from "./locale";
import {
  Border,
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
  borders: { [key: number]: Border };
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
