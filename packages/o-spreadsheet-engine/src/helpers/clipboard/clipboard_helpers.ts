import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import {
  ClipboardCellData,
  ClipboardMIMEType,
  ClipboardOptions,
  ClipboardPasteTarget,
  MinimalClipboardData,
  OSClipboardContent,
  ParsedOSClipboardContent,
  SpreadsheetClipboardData,
} from "../../types/clipboard";
import { AllowedImageMimeTypes } from "../../types/image";
import { UID, Zone } from "../../types/misc";
import { SelectionStreamProcessor } from "../../types/selection_stream_processor";
import { mergeOverlappingZones, positions, union } from "../zones";

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

function getOSheetDataFromHTML(htmlDocument: Document) {
  const attributes = [...htmlDocument.documentElement.attributes];
  // Check if it's a Microsoft Office clipboard data (it will have some namespaces defined in the root element)
  if (attributes.some((attr) => attr.value.includes("microsoft"))) {
    return undefined;
  }
  const oSheetClipboardData = htmlDocument
    .querySelector("div")
    ?.getAttribute("data-osheet-clipboard");
  return oSheetClipboardData && JSON.parse(oSheetClipboardData);
}

/**
 * Applies each clipboard handler to paste its corresponding data into the target.
 */
export const applyClipboardHandlersPaste = (
  handlers: { handlerName: string; handler: ClipboardHandler<any> }[],
  copiedData: MinimalClipboardData,
  target: ClipboardPasteTarget,
  options: ClipboardOptions
): void => {
  handlers.forEach(({ handlerName, handler }) => {
    const data = copiedData[handlerName];
    if (data) {
      handler.paste(target, data, options);
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
  copiedData: MinimalClipboardData,
  handlers: { handlerName: string; handler: ClipboardHandler<any> }[],
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
    const handlerData = copiedData[handlerName];
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
