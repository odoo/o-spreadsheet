import { SquishedContent } from "../plugins/core/squisher";
import { CellValue } from "./cells";
import { ConditionalFormat } from "./conditional_formatting";
import { DataValidationRule } from "./data_validation";
import { Format, FormattedValue } from "./format";
import { AllowedImageMimeTypes, Image } from "./image";
import { Border, BorderDescr, HeaderIndex, Maybe, Merge, Style, UID, Zone } from "./misc";
import { RangeData } from "./range";
import { CoreTableType, TableConfig } from "./table";

export enum ClipboardMIMEType {
  PlainText = "text/plain",
  Html = "text/html",
  Image = "image",
}

export type OSClipboardContent = {
  [key in (typeof AllowedImageMimeTypes)[number]]?: Blob;
} & {
  [ClipboardMIMEType.PlainText]?: string;
  [ClipboardMIMEType.Html]?: string;
};

export interface SpreadsheetClipboardData extends MinimalClipboardData {
  version?: string;
  clipboardId?: string;
}

export type ParsedOSClipboardContent = {
  text?: string;
  data?: SpreadsheetClipboardData;
  imageBlob?: Blob;
};

export type ParsedOsClipboardContentWithImageData = ParsedOSClipboardContent & {
  imageData?: Image;
};

export interface ClipboardOptions {
  isCutOperation: boolean;
  pasteOption?: ClipboardPasteOptions;
  selectTarget?: boolean;
}

export interface ClipboardPositions {
  sheetId: UID;
  zones: Zone[];
  rowsIndexes?: HeaderIndex[];
  columnsIndexes?: HeaderIndex[];
}

export type ClipboardPasteOptions = "onlyFormat" | "asValue";
export type ClipboardCopyOptions = "copyPaste" | "shiftCells";
export type ClipboardOperation = "CUT" | "COPY";

export type ClipboardCellData = {
  sheetId: UID;
  zones: Zone[];
  rowsIndexes: HeaderIndex[];
  columnsIndexes: HeaderIndex[];
  clippedZones: Zone[];
};

export type ClipboardFigureData = {
  sheetId: UID;
  figureIds: UID[];
};

export type ClipboardData = ClipboardCellData | ClipboardFigureData;

export type ClipboardPasteTarget = {
  sheetId: UID;
  zones: Zone[];
  figureIds?: Record<UID, UID>; // Record<OriginalId, CopyId>
};

export type MinimalClipboardData = {
  sheetId: UID;
  figureIds?: UID[];
  zones: Zone[];
  rowsIndexes?: HeaderIndex[];
  columnsIndexes?: HeaderIndex[];
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Compact (serialized) clipboard data types
// ---------------------------------------------------------------------------

export type ClipboardCF = { rules: ConditionalFormat[] } | undefined;
export type ClipboardDV = { rule: Maybe<DataValidationRule> } | undefined;

export interface ClipboardTableStyle {
  style?: Style;
  border?: Border;
}

export interface ClipboardCopiedTable {
  range: RangeData;
  config: TableConfig;
  type: CoreTableType;
}

export interface ClipboardTableCell {
  style?: ClipboardTableStyle;
  table?: ClipboardCopiedTable;
  isWholeTableCopied?: boolean;
}

export type ClipboardTable = ClipboardTableCell | null;

export type SparseCellHandlerData =
  | Border
  | null
  | Maybe<Merge>
  | ClipboardCF
  | ClipboardDV
  | ClipboardTable;

export type CompactEvaluatedCell = {
  value?: CellValue;
  format?: Format;
  formattedValue?: FormattedValue;
};

export type CompactClipboardCell = {
  evaluatedCell?: CompactEvaluatedCell;
  styleIdx?: number;
  formatIdx?: number;
};

export type CompactSparse2DArray<T extends SparseCellHandlerData> = {
  rows: number;
  cols: number;
  items: { r: number; c: number; v: T }[];
};

export type CompactMergeHandlerData = {
  rows: number;
  cols: number;
  /** One entry per unique merge: grid position (r,c) of its top-left cell, and dimensions (w,h). */
  items: { r: number; c: number; w: number; h: number }[];
};

export type CompactDVHandlerData = {
  rows: number;
  cols: number;
  /** Deduplicated list of DataValidation rules. */
  ruleTable: DataValidationRule[];
  items: { r: number; c: number; ruleIdx: number }[];
};

export type CompactCFHandlerData = {
  rows: number;
  cols: number;
  /** Deduplicated list of ConditionalFormat rules. */
  cfTable: ConditionalFormat[];
  items: { r: number; c: number; cfIndices: number[] }[];
};

/** A Border with each side replaced by an index into a shared BorderDescr table. */
export type CompactBorderCell = {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
};

export type CompactBorderHandlerData = {
  rows: number;
  cols: number;
  /** Deduplicated list of {style, color} descriptors. */
  descrTable: BorderDescr[];
  items: { r: number; c: number; v: CompactBorderCell }[];
};

export type CompactCellHandlerData = {
  rows: number;
  cols: number;
  items: { r: number; c: number; v: CompactClipboardCell }[];
  styleTable: Style[];
  formatTable: Format[];
  /**
   * Range-key compressed map of squished cell content (col-major order).
   * Keys are either single XC addresses ("A1") or same-column ranges ("A1:A100").
   * Items never contain a `content` field; all content lives here.
   */
  squishedMap: Record<string, SquishedContent>;
};

export type CompactClipboardTableCell = {
  tableIdx?: number;
  styleIdx?: number;
  isWholeTableCopied?: boolean;
};

/** A ClipboardTableStyle where each border side is replaced by an index into a shared borderDescrTable. */
export type CompactTableStyle = {
  style?: Style;
  border?: CompactBorderCell;
};

export type CompactTableHandlerData = {
  rows: number;
  cols: number;
  tables: ClipboardCopiedTable[];
  /** Deduplicated list of {style, color} border descriptors. */
  borderDescrTable: BorderDescr[];
  styleTable: CompactTableStyle[];
  items: { r: number; c: number; v: CompactClipboardTableCell }[];
};
