import { HIGHLIGHT_COLOR } from "../../constants";
import { CellPosition, Getters, Highlight, UID } from "../../types";
import { mergeContiguousZones, positionToZone } from "../zones";

export function getPivotHighlights(getters: Getters, pivotId: UID): Highlight[] {
  const sheetId = getters.getActiveSheetId();
  const pivotCellPositions = getVisiblePivotCellPositions(getters, pivotId);
  const mergedZones = mergeContiguousZones(pivotCellPositions.map(positionToZone));
  return mergedZones.map((zone) => ({ sheetId, zone, noFill: true, color: HIGHLIGHT_COLOR }));
}

function getVisiblePivotCellPositions(getters: Getters, pivotId: UID) {
  const positions: CellPosition[] = [];
  const sheetId = getters.getActiveSheetId();
  for (const col of getters.getSheetViewVisibleCols()) {
    for (const row of getters.getSheetViewVisibleRows()) {
      const position = { sheetId, col, row };
      const cellPivotId = getters.getPivotIdFromPosition(position);
      if (pivotId === cellPivotId) {
        positions.push(position);
      }
    }
  }
  return positions;
}
