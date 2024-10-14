import { HtmlClipboardData } from "../plugins/ui_stateful";
import { Image } from "./image";
import { HeaderIndex, UID, Zone } from "./misc";

export enum ClipboardMIMEType {
  PlainText = "text/plain",
  Html = "text/html",
  Png = "image/png",
}

export type OSClipboardContent = {
  [ClipboardMIMEType.PlainText]?: string;
  [ClipboardMIMEType.Html]?: string;
  [ClipboardMIMEType.Png]?: Blob;
  // TODORAR : should support more image/* types  see IMAGE_MIMETYPE_TO_EXTENSION_MAPPING for the supported types
};

export type ImportClipboardContent = {
  text?: string;
  data?: HtmlClipboardData;
  imageData?: Image;
};

export interface ClipboardOptions {
  isCutOperation: boolean;
  pasteOption?: ClipboardPasteOptions;
  selectTarget?: boolean;
}
export type ClipboardPasteOptions = "onlyFormat" | "asValue";
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
