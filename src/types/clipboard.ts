import { HtmlClipboardData } from "../plugins/ui_stateful";
import { HeaderIndex, UID, Zone } from "./misc";

export enum ClipboardMIMEType {
  PlainText = "text/plain",
  Html = "text/html",
}

export type OSClipboardContent = { [type in ClipboardMIMEType]?: string };

export type ImportClipboardContent = {
  text?: string;
  data?: HtmlClipboardData;
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
