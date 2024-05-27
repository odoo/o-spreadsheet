import { HeaderIndex, UID, Zone } from "./misc";

export enum ClipboardMIMEType {
  PlainText = "text/plain",
  Html = "text/html",
}

export type ClipboardContent = { [type in ClipboardMIMEType]?: string };

export interface ClipboardOptions {
  isCutOperation: boolean;
  pasteOption?: ClipboardPasteOptions;
  selectTarget?: boolean;
}
export type ClipboardPasteOptions = "onlyFormat" | "asValue";
export type ClipboardOperation = "CUT" | "COPY";

export type ClipboardCellData = {
  zones: Zone[];
  rowsIndexes: HeaderIndex[];
  columnsIndexes: HeaderIndex[];
  clippedZones: Zone[];
};

export type ClipboardFigureData = {
  figureId: UID;
};

export type ClipboardData = ClipboardCellData | ClipboardFigureData;

export type ClipboardPasteTarget = {
  zones: Zone[];
  figureId?: UID;
};
