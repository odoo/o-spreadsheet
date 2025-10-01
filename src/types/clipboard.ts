import { AllowedImageMimeTypes, Image } from "@odoo/o-spreadsheet-engine/types/image";
import { ClipboardCell, HeaderIndex, UID, Zone } from "@odoo/o-spreadsheet-engine/types/misc";
import { SpreadsheetClipboardData } from "../plugins/ui_stateful";

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
  figureId: UID;
};

export type ClipboardData = ClipboardCellData | ClipboardFigureData;

export type ClipboardPasteTarget = {
  sheetId: UID;
  zones: Zone[];
  figureId?: UID;
};

export type MinimalClipboardData = {
  sheetId?: UID;
  cells?: ClipboardCell[][];
  zones?: Zone[];
  figureId?: UID;
  [key: string]: unknown;
};
