import {
  ClipboardCellData,
  ClipboardMIMEType,
  ImportClipboardContent,
  OSClipboardContent,
  UID,
  Zone,
} from "../../types";
import { mergeOverlappingZones, positions } from "../zones";

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
function splitZoneForPaste(selection: Zone, splitWidth: number, splitHeight: number): Zone[] {
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

export function gePastablePluginClipBoardContent(
  content: OSClipboardContent
): ImportClipboardContent {
  const htmlDocument = new DOMParser().parseFromString(
    content[ClipboardMIMEType.Html] ?? "<div></div>",
    "text/html"
  );
  const oSheetClipboardData = htmlDocument
    .querySelector("div")
    ?.getAttribute("data-osheet-clipboard");
  const spreadsheetContent = oSheetClipboardData && JSON.parse(oSheetClipboardData);
  return {
    [ClipboardMIMEType.PlainText]: content[ClipboardMIMEType.PlainText],
    [ClipboardMIMEType.Html]: spreadsheetContent,
  };
}
