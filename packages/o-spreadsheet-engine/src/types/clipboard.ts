import { deepCopy } from "../helpers";
import { SequenceSet } from "../helpers/cells/sequence_set";
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
  rowsIndexes: SequenceSet;
  columnsIndexes: SequenceSet;
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
  cellContent?: Map2D<ClipboardCell>;
  zones?: Zone[];
  figureId?: UID;
  [key: string]: unknown;
};

export interface CellClipboardContent {
  cellContent: Sizeable;
}

export interface Sizeable {
  width: number;
  height: number;
}

export class Map2D<T> implements Sizeable {
  private map: Map<HeaderIndex, Map<HeaderIndex, T>>;
  width: number;
  height: number;

  constructor(col: number, row: number, map?: Map<HeaderIndex, Map<HeaderIndex, T>>) {
    this.width = col;
    this.height = row;
    this.map = map ? map : new Map();
  }

  set(col: HeaderIndex, row: HeaderIndex, content: T | null | undefined) {
    if (!content) {
      return this.delete(col, row);
    }
    let colMap = this.map.get(col);
    if (!colMap) {
      colMap = new Map();
      this.map.set(col, colMap);
    }
    colMap.set(row, content);
  }

  get(col: HeaderIndex, row: HeaderIndex): T | undefined {
    return this.map.get(col)?.get(row);
  }

  delete(col: HeaderIndex, row: HeaderIndex) {
    const colMap = this.map.get(col);
    if (!colMap) return;
    colMap.delete(row);
    if (!colMap.size) this.map.delete(col);
  }

  *entries(): Generator<[number, number, T]> {
    for (const [col, colMap] of this.map.entries()) {
      for (const [row, content] of colMap.entries()) {
        yield [col, row, content];
      }
    }
  }

  *values(): Generator<T> {
    for (const colMap of this.map.values()) {
      for (const content of colMap.values()) {
        yield content;
      }
    }
  }

  toMatrix(): (T | undefined)[][] {
    const entries = [...this.entries()];
    const maxWidth = Math.max(0, ...entries.map((n) => n[0])) + 1;
    const maxHeight = Math.max(0, ...entries.map((n) => n[1])) + 1;
    const result = new Array(maxHeight);
    for (let r = 0; r < maxHeight; r++) {
      result[r] = new Array(maxWidth);
    }
    for (const [col, row, value] of entries) {
      result[row][col] = value;
    }
    return result;
  }

  clone(): Map2D<T> {
    return new Map2D(this.width, this.height, deepCopy(this.map));
  }
}
