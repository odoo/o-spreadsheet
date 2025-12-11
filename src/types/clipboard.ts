import { AllowedImageMimeTypes, Image } from "./image";
import { ClipboardCell, HeaderIndex, UID, Zone } from "./misc";

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
  sheetId?: UID;
  cells?: ClipboardCell[][];
  zones?: Zone[];
  figureIds?: UID[];
  [key: string]: unknown;
};
