import { HeaderIndex, UID, Zone } from "./misc";

export enum ClipboardMIMEType {
  PlainText = "text/plain",
  Html = "text/html",
}

export type ClipboardContent = { [type in ClipboardMIMEType]?: string };

export interface ClipboardOptions {
  pasteOption?: ClipboardPasteOptions;
  selectTarget?: boolean;
  isCutOperation?: boolean;
}
export type ClipboardPasteOptions = "onlyFormat" | "asValue";
export type ClipboardOperation = "CUT" | "COPY";

export type ClipboardCellData = {
  zones: Zone[];
  rowsIndex: HeaderIndex[];
  columnsIndex: HeaderIndex[];
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
