import { HtmlClipboardData } from "../plugins/ui_stateful";
import { HeaderIndex, UID, Zone } from "./misc";

export enum ClipboardMIMEType {
  PlainText = "text/plain",
  Html = "text/html",
  Png = "image/png",
}

type ChartClipboardData = {
  type: "chart";
  data: Blob;
};
type ImageClipboardData = {
  type: "image";
  data: string;
};

export type PngClipboardData = ChartClipboardData | ImageClipboardData;

export type OSClipboardContent = {
  [ClipboardMIMEType.PlainText]?: string;
  [ClipboardMIMEType.Html]?: string;
  [ClipboardMIMEType.Png]?: PngClipboardData;
};

export type ImportClipboardContent = {
  [ClipboardMIMEType.PlainText]?: string;
  [ClipboardMIMEType.Html]?: HtmlClipboardData;
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
