import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import {
  ClipboardCellData,
  ClipboardCF,
  ClipboardDV,
  ClipboardMIMEType,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
  ClipboardTableCell,
  ClipboardTableStyle,
  CompactBorderCell,
  CompactBorderHandlerData,
  CompactCFHandlerData,
  CompactDVHandlerData,
  CompactMergeHandlerData,
  CompactTableHandlerData,
  CompactTableStyle,
  MinimalClipboardData,
  OSClipboardContent,
  ParsedOSClipboardContent,
  SpreadsheetClipboardData,
} from "../../types/clipboard";
import { AllowedImageMimeTypes } from "../../types/image";
import { Border, BorderDescr, Maybe, Merge, UID, Zone } from "../../types/misc";
import { SelectionStreamProcessor } from "../../types/selection_stream_processor";
import { mergeOverlappingZones, positions, union } from "../zones";

/**
 * Creates a deduplicating indexer: given a value, returns its index in the
 * accumulated table, inserting it if it has not been seen before.
 * The `toKey` function must return a stable string key for equality comparison.
 *
 * Usage:
 *   const { index, table } = makeIndexer<Style>(JSON.stringify);
 *   const idx = index(someStyle); // 0, 1, 2 …
 *   const styleTable = table;     // deduplicated array
 */
export function makeIndexer<T>(toKey: (value: T) => string): {
  index: (value: T) => number;
  table: T[];
} {
  const table: T[] = [];
  const map = new Map<string, number>();
  return {
    table,
    index(value: T): number {
      const key = toKey(value);
      const cached = map.get(key);
      if (cached !== undefined) {
        return cached;
      }
      const idx = table.length;
      table.push(value);
      map.set(key, idx);
      return idx;
    },
  };
}

/**
 * Encode a Border into its compact form, replacing each side's BorderDescr
 * with its index in a deduplication table (see `makeIndexer`).
 */
export function compactBorderCell(
  border: Border,
  descrIndex: (value: BorderDescr) => number
): CompactBorderCell {
  const cb: CompactBorderCell = {};
  if (border.top) {
    cb.top = descrIndex(border.top);
  }
  if (border.left) {
    cb.left = descrIndex(border.left);
  }
  if (border.bottom) {
    cb.bottom = descrIndex(border.bottom);
  }
  if (border.right) {
    cb.right = descrIndex(border.right);
  }
  return cb;
}

/**
 * Decode a compact border cell back into a Border, looking up each side's
 * BorderDescr from the deduplication table produced by `compactBorderCell`.
 */
export function expandBorderCell(cb: CompactBorderCell, descrTable: BorderDescr[]): Border {
  const border: Border = {};
  if (cb.top !== undefined) {
    border.top = descrTable[cb.top];
  }
  if (cb.left !== undefined) {
    border.left = descrTable[cb.left];
  }
  if (cb.bottom !== undefined) {
    border.bottom = descrTable[cb.bottom];
  }
  if (cb.right !== undefined) {
    border.right = descrTable[cb.right];
  }
  return border;
}

/**
 * Decode compact border handler data back into a full grid, looking up each cell's sides
 * from the deduplicated `descrTable`. Shared by `BorderClipboardHandler.expand()` and the
 * flat (HTML clipboard) expansion path so the two stay in sync.
 */
export function expandCompactBorderCells(compact: CompactBorderHandlerData): (Border | null)[][] {
  const { rows, cols, descrTable, items } = compact;
  const result: (Border | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );
  for (const { r, c, v } of items) {
    result[r][c] = expandBorderCell(v, descrTable);
  }
  return result;
}

/**
 * Decode compact conditional-format handler data back into a full grid, looking up each
 * cell's rules from the deduplicated `cfTable`. Shared by `ConditionalFormatClipboardHandler.expand()`
 * and the flat (HTML clipboard) expansion path so the two stay in sync.
 */
export function expandCompactCFCells(compact: CompactCFHandlerData): ClipboardCF[][] {
  const { rows, cols, cfTable, items } = compact;
  const result: ClipboardCF[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ rules: [] }))
  );
  for (const { r, c, cfIndices } of items) {
    result[r][c] = { rules: cfIndices.map((i) => cfTable[i]) };
  }
  return result;
}

/**
 * Decode compact data-validation handler data back into a full grid, looking up each
 * cell's rule from the deduplicated `ruleTable`. Shared by `DataValidationClipboardHandler.expand()`
 * and the flat (HTML clipboard) expansion path so the two stay in sync.
 */
export function expandCompactDVCells(compact: CompactDVHandlerData): ClipboardDV[][] {
  const { rows, cols, ruleTable, items } = compact;
  const result: ClipboardDV[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ rule: undefined }))
  );
  for (const { r, c, ruleIdx } of items) {
    result[r][c] = { rule: ruleTable[ruleIdx] };
  }
  return result;
}

/**
 * Decode compact merge handler data (one entry per unique merge, with width/height) back into
 * a full grid where every cell covered by a merge points to the same synthetic Merge object.
 * Shared by `MergeClipboardHandler.expand()` and the flat (HTML clipboard) expansion path.
 */
export function expandCompactMergeCells(compact: CompactMergeHandlerData): Maybe<Merge>[][] {
  const { rows, cols, items } = compact;
  const result: Maybe<Merge>[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => undefined)
  );
  for (const { r, c, w, h } of items) {
    const synthetic: Merge = { id: 0, left: 0, top: 0, right: w, bottom: h };
    for (let dr = 0; dr <= h; dr++) {
      for (let dc = 0; dc <= w; dc++) {
        if (r + dr < rows && c + dc < cols) {
          result[r + dr][c + dc] = synthetic;
        }
      }
    }
  }
  return result;
}

/**
 * Decode compact table handler data back into a full grid. Style expansion is delegated to
 * `expandStyle` since callers differ slightly there: `TableClipboardHandler.expand()` only ever
 * sees current-format style entries, while the flat (HTML clipboard) expansion path also has to
 * tolerate older cached payloads that stored borders/styles inline instead of by index.
 */
export function expandCompactTableCells(
  compact: CompactTableHandlerData,
  expandStyle: (cs: CompactTableStyle) => ClipboardTableStyle
): ClipboardTableCell[][] {
  const { rows, cols, tables, styleTable, items } = compact;
  const expanded: ClipboardTableCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({}))
  );
  for (const { r, c, v } of items) {
    expanded[r][c] = {
      ...(v.tableIdx !== undefined ? { table: tables[v.tableIdx] } : {}),
      // Support both old format (style inline) and new format (styleIdx)
      ...(v.styleIdx !== undefined
        ? { style: expandStyle(styleTable[v.styleIdx]) }
        : (v as any).style !== undefined
        ? { style: (v as any).style }
        : {}),
      ...(v.isWholeTableCopied !== undefined ? { isWholeTableCopied: v.isWholeTableCopied } : {}),
    };
  }
  return expanded;
}

export function getClipboardDataPositions(sheetId: UID, zones: Zone[]): ClipboardCellData {
  const lefts = new Set(zones.map((z) => z.left));
  const rights = new Set(zones.map((z) => z.right));
  const tops = new Set(zones.map((z) => z.top));
  const bottoms = new Set(zones.map((z) => z.bottom));

  const areZonesCompatible =
    (tops.size === 1 && bottoms.size === 1) || (lefts.size === 1 && rights.size === 1);

  // In order to don't paste several times the same cells in intersected zones
  // --> we merge zones that have common cells
  const clippedZones = areZonesCompatible
    ? mergeOverlappingZones(zones)
    : [zones[zones.length - 1]];

  const cellsPosition = clippedZones.map((zone) => positions(zone)).flat();
  const columnsIndexes = [...new Set(cellsPosition.map((p) => p.col))].sort((a, b) => a - b);
  const rowsIndexes = [...new Set(cellsPosition.map((p) => p.row))].sort((a, b) => a - b);
  return { sheetId, zones, clippedZones, columnsIndexes, rowsIndexes };
}

/**
 * The clipped zone is copied as many times as it fits in the target.
 * This returns the list of zones where the clipped zone is copy-pasted.
 */
export function splitZoneForPaste(
  selection: Zone,
  splitWidth: number,
  splitHeight: number
): Zone[] {
  if (splitWidth <= 0 || splitHeight <= 0) {
    // Nothing to repeat: paste a single copy over the selection instead of looping forever.
    return [selection];
  }
  const right = Math.max(selection.right - splitWidth + 1, selection.left);
  const bottom = Math.max(selection.bottom - splitHeight + 1, selection.top);
  const zones: Zone[] = [];
  for (let left = selection.left; left <= right; left += splitWidth) {
    for (let top = selection.top; top <= bottom; top += splitHeight) {
      zones.push({
        left,
        top,
        bottom: top + splitHeight - 1,
        right: left + splitWidth - 1,
      });
    }
  }
  return zones;
}

/**
 * Compute the complete zones where to paste the current clipboard
 */
export function getPasteZones<T>(target: Zone[], content: T[][]): Zone[] {
  if (!content.length || !content[0].length) {
    return target;
  }
  const width = content[0].length,
    height = content.length;
  return target.map((t) => splitZoneForPaste(t, width, height)).flat();
}

export function parseOSClipboardContent(content: OSClipboardContent): ParsedOSClipboardContent {
  let spreadsheetContent: SpreadsheetClipboardData | undefined = undefined;
  if (content[ClipboardMIMEType.Html]) {
    const htmlDocument = new DOMParser().parseFromString(
      content[ClipboardMIMEType.Html],
      "text/html"
    );
    spreadsheetContent = getOSheetDataFromHTML(htmlDocument);
  }
  const textContent = content[ClipboardMIMEType.PlainText] || "";

  let imageBlob: Blob | undefined = undefined;
  if (!textContent.trim()) {
    for (const type of AllowedImageMimeTypes) {
      if (content[type]) {
        imageBlob = content[type];
        break;
      }
    }
  }
  const osClipboardContent: ParsedOSClipboardContent = {
    text: textContent,
    data: spreadsheetContent,
    imageBlob,
  };
  return osClipboardContent;
}

/**
 * Fast-path extraction used to detect an internal o-spreadsheet paste without
 * instantiating a DOMParser on large HTML payloads. Reads the dedicated
 * `data-osheet-clipboard-id` marker instead of parsing the embedded JSON.
 */
export function getOSheetClipboardIdFromHTML(htmlContent: string | undefined): string | undefined {
  return htmlContent?.match(/<div data-osheet-clipboard-id=(['"])([^'"]+)\1/)?.[2];
}

function getOSheetDataFromHTML(htmlDocument: Document) {
  const attributes = [...htmlDocument.documentElement.attributes];
  // Check if it's a Microsoft Office clipboard data (it will have some namespaces defined in the root element)
  if (attributes.some((attr) => attr.value.includes("microsoft"))) {
    return undefined;
  }
  const oSheetClipboardData = htmlDocument
    .querySelector("div")
    ?.getAttribute("data-osheet-clipboard");
  const parsed = oSheetClipboardData && JSON.parse(oSheetClipboardData);
  return parsed && expandClipboardData(parsed);
}

/**
 * Expand compact clipboard data back to the full format expected by
 * clipboard handlers.
 */
function expandClipboardData(data: Record<string, any>): Record<string, any> {
  const sheetId = data.sheetId;
  if (data.cell) {
    return expandFlatClipboardData(data, sheetId);
  }
  return data;
}

/**
 * Expand new flat format where handler data is stored directly.
 * data.cell = [[cell, cell], ...], data.border = { rows, cols, items }, etc.
 */
function expandFlatClipboardData(data: Record<string, any>, sheetId: string): Record<string, any> {
  // Note: data.cell is left as raw CompactCellHandlerData so that CellClipboardHandler.expand()
  // can handle it (including the squishedMap field).

  // Expand border data: new format uses descrTable + per-side indices, old used { r, c, v: Border }.
  if (data.border?.items !== undefined) {
    const borderData = data.border;
    data.border =
      borderData.descrTable !== undefined
        ? expandCompactBorderCells(borderData)
        : // Old sparse format: { r, c, v: Border | null }
          expandSparse2DArray(borderData, () => null);
  }

  // Expand conditionalFormat: new format uses cfTable+cfIndices, old used { r, c, v }.
  if (data.conditionalFormat?.items !== undefined) {
    const cfData = data.conditionalFormat;
    data.conditionalFormat =
      cfData.cfTable !== undefined
        ? expandCompactCFCells(cfData)
        : expandSparse2DArray(cfData, () => ({ rules: [] }));
  }

  // Expand dataValidation: new format uses ruleTable+ruleIdx, old format used { r, c, v }.
  if (data.dataValidation?.items !== undefined) {
    const dvData = data.dataValidation;
    data.dataValidation =
      dvData.ruleTable !== undefined
        ? expandCompactDVCells(dvData)
        : // Old sparse format: { r, c, v: ClipboardDV }
          expandSparse2DArray(dvData, () => ({ rule: undefined }));
  }

  // Expand merge data: new format stores one entry per unique merge (w/h), old format used v.
  if (data.merge?.items !== undefined) {
    const mergeData = data.merge;
    data.merge =
      mergeData.items[0]?.v !== undefined
        ? // Old format: sparse2D with full Merge objects per cell
          expandSparse2DArray(mergeData, () => undefined)
        : // New format: one entry per unique merge with width/height
          expandCompactMergeCells(mergeData);
  }

  // Expand compact table handler data (deduped tables + styleTable + per-cell indices)
  if (data.table) {
    const tableData = data.table as CompactTableHandlerData;
    if (tableData.tables !== undefined) {
      const borderDescrTable = tableData.borderDescrTable ?? [];
      const styleTable: CompactTableStyle[] = tableData.styleTable ?? [];

      const expandStyle = (cs: CompactTableStyle): ClipboardTableStyle => {
        const s: ClipboardTableStyle = {};
        if (cs.style) {
          s.style = cs.style;
        }
        if (cs.border) {
          const anyBorder = cs.border as Record<string, unknown>;
          // Support both old format (border stored inline) and new format (indexed by descrTable)
          s.border =
            borderDescrTable.length === 0 || typeof anyBorder.top === "object"
              ? (cs.border as unknown as Border)
              : expandBorderCell(cs.border as CompactBorderCell, borderDescrTable);
        }
        return s;
      };

      data.table = expandCompactTableCells(
        { ...tableData, borderDescrTable, styleTable },
        expandStyle
      );
    } else if (tableData.items !== undefined) {
      // Backward compat: old sparse format without deduplication
      data.table = expandSparse2DArray(data.table, () => ({}));
    }
  }

  return data;
}

/**
 * Reconstruct a full 2D array from a sparse { rows, cols, items } representation.
 */
export function expandSparse2DArray<T>(
  sparse: { rows: number; cols: number; items: { r: number; c: number; v: T }[] },
  makeDefault: () => T
): T[][] {
  const array: T[][] = Array.from({ length: sparse.rows }, () =>
    Array.from({ length: sparse.cols }, makeDefault)
  );
  for (const { r, c, v } of sparse.items) {
    array[r][c] = v;
  }
  return array;
}

/**
 * Pre-expands compact clipboard data for each handler and returns a new MinimalClipboardData
 * object where each handler's data is already in its full expanded form.
 */
export function expandHandlerData(
  handlers: { handlerName: string; handler: ClipboardHandler<any> }[],
  copiedData: MinimalClipboardData
): MinimalClipboardData {
  const expandedData: MinimalClipboardData = { ...copiedData };
  for (const { handlerName, handler } of handlers) {
    const data = copiedData[handlerName];
    if (data !== undefined) {
      expandedData[handlerName] = handler.expand(data);
    }
  }
  return expandedData;
}

/**
 * Applies each clipboard handler to paste its corresponding data into the target.
 */
export const applyClipboardHandlersPaste = (
  handlers: { handlerName: string; handler: ClipboardHandler<any> }[],
  expandedData: MinimalClipboardData,
  target: ClipboardPasteTarget,
  options: ClipboardOptions,
  positions: ClipboardPositions
): void => {
  handlers.forEach(({ handlerName, handler }) => {
    const data = expandedData[handlerName];
    if (data) {
      handler.paste(target, data, options, positions);
    }
  });
};

/**
 * Returns the paste target based on clipboard handlers.
 * Also includes the full affected zone and the list of pasted zones for selection.
 */
export function getPasteTargetFromHandlers(
  sheetId: string,
  zones: Zone[],
  handlers: { handlerName: string; handler: ClipboardHandler<any> }[],
  expandedData: MinimalClipboardData,
  options: ClipboardOptions
): {
  target: ClipboardPasteTarget;
  zone?: Zone;
  selectedZones: Zone[];
} {
  let zone: Zone | undefined = undefined;
  const selectedZones: Zone[] = [];
  const target: ClipboardPasteTarget = {
    sheetId,
    zones,
  };

  for (const { handlerName, handler } of handlers) {
    const handlerData = expandedData[handlerName];
    if (!handlerData) {
      continue;
    }
    const currentTarget = handler.getPasteTarget(sheetId, zones, handlerData, options);
    if (currentTarget.figureIds) {
      target.figureIds = { ...target.figureIds, ...currentTarget.figureIds };
    }
    for (const targetZone of currentTarget.zones) {
      selectedZones.push(targetZone);
      if (zone === undefined) {
        zone = targetZone;
        continue;
      }
      zone = union(zone, targetZone);
    }
  }

  return {
    target,
    zone,
    selectedZones,
  };
}

/**
 * Updates the selection after a paste operation.
 */
export const selectPastedZone = (
  selection: SelectionStreamProcessor,
  sourceZones: Zone[],
  pastedZones: Zone[]
): void => {
  const anchorCell = {
    col: sourceZones[0].left,
    row: sourceZones[0].top,
  };
  selection.getBackToDefault();
  selection.selectZone(
    { cell: anchorCell, zone: union(...pastedZones) },
    { scrollIntoView: false }
  );
};
