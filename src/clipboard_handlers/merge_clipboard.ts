import { expandCompactMergeCells } from "../helpers/clipboard/clipboard_helpers";
import {
  ClipboardCellData,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
  CompactMergeHandlerData,
} from "../types/clipboard";
import { CellPosition, HeaderIndex, Maybe, Merge, UID, Zone } from "../types/misc";
import { AbstractCellClipboardHandler } from "./abstract_cell_clipboard_handler";

export class MergeClipboardHandler extends AbstractCellClipboardHandler<
  Maybe<Merge>,
  CompactMergeHandlerData
> {
  copy(data: ClipboardCellData): CompactMergeHandlerData | undefined {
    const sheetId = this.getters.getActiveSheetId();
    const { rowsIndexes, columnsIndexes } = data;
    const merges: Maybe<Merge>[][] = [];

    for (const row of rowsIndexes) {
      const mergesInRow: Maybe<Merge>[] = [];
      for (const col of columnsIndexes) {
        const position = { col, row, sheetId };
        mergesInRow.push(this.getters.getMerge(position));
      }
      merges.push(mergesInRow);
    }
    return this.compact(merges);
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(
    target: ClipboardPasteTarget,
    content: Maybe<Merge>[][],
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {
    if (options.isCutOperation && positions.sheetId && positions.zones) {
      // Derive absolute zone of each unique merge from its grid position and originZones.
      const rows = new Set<number>();
      const cols = new Set<number>();
      for (const zone of positions.zones) {
        for (let r = zone.top; r <= zone.bottom; r++) {
          rows.add(r);
        }
        for (let c = zone.left; c <= zone.right; c++) {
          cols.add(c);
        }
      }
      const sortedRows = [...rows].sort((a, b) => a - b);
      const sortedCols = [...cols].sort((a, b) => a - b);
      // All cells within the same merge share the same object reference — use that to dedup.
      const seenMerges = new WeakSet<Merge>();
      const mergeZones: Zone[] = [];
      for (let r = 0; r < content.length; r++) {
        for (let c = 0; c < (content[r]?.length ?? 0); c++) {
          const merge = content[r][c];
          if (!merge || seenMerges.has(merge)) {
            continue;
          }
          seenMerges.add(merge);
          const absLeft = sortedCols[c] ?? c;
          const absTop = sortedRows[r] ?? r;
          mergeZones.push({
            left: absLeft,
            top: absTop,
            right: absLeft + (merge.right - merge.left),
            bottom: absTop + (merge.bottom - merge.top),
          });
        }
      }
      if (mergeZones.length) {
        this.dispatch("REMOVE_MERGE", { sheetId: positions.sheetId, target: mergeZones });
      }
    }
    this.pasteFromCopy(target.sheetId, target.zones, content, options, positions);
  }

  pasteZone(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    merges: Maybe<Merge>[][],
    _options: ClipboardOptions,
    _positions: ClipboardPositions
  ) {
    for (const [r, rowMerges] of merges.entries()) {
      for (const [c, originMerge] of rowMerges.entries()) {
        const position = { col: col + c, row: row + r, sheetId };
        this.pasteMerge(originMerge, position);
      }
    }
  }

  private pasteMerge(originMerge: Maybe<Merge>, target: CellPosition) {
    if (!originMerge) {
      return;
    }

    if (this.getters.isInMerge(target)) {
      return;
    }

    const { sheetId, col, row } = target;
    this.dispatch("ADD_MERGE", {
      sheetId,
      force: true,
      target: [
        {
          left: col,
          top: row,
          right: col + originMerge.right - originMerge.left,
          bottom: row + originMerge.bottom - originMerge.top,
        },
      ],
    });
  }

  protected compact(data: Maybe<Merge>[][]): CompactMergeHandlerData {
    const rows = data.length;
    const cols = data[0]?.length ?? 0;
    const seen = new Set<string>();
    const items: CompactMergeHandlerData["items"] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < (data[r]?.length ?? 0); c++) {
        const merge = data[r][c];
        if (!merge) {
          continue;
        }
        // Deduplicate: use the merge's absolute top-left as key.
        const key = `${merge.left},${merge.top}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        items.push({ r, c, w: merge.right - merge.left, h: merge.bottom - merge.top });
      }
    }
    return { rows, cols, items };
  }

  expand(data: unknown): Maybe<Merge>[][] {
    if (Array.isArray(data)) {
      return data as Maybe<Merge>[][];
    }
    return expandCompactMergeCells(data as CompactMergeHandlerData);
  }
}
