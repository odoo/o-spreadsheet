import { HIGHLIGHT_COLOR } from "../../constants";
import { ViewportsPlugin } from "../../owl_plugins/viewports_owl_plugin";
import { CellPosition, Highlight, UID } from "../../types/misc";
import { SpreadsheetActionEnv } from "../../types/spreadsheet_env";
import { mergeContiguousZones, positionToZone } from "../zones";

export function getPivotHighlights(env: SpreadsheetActionEnv, pivotId: UID): Highlight[] {
  const getters = env.model().getters;
  const sheetId = getters.getActiveSheetId();
  const pivotCellPositions = getVisiblePivotCellPositions(env, pivotId);
  const mergedZones = mergeContiguousZones(pivotCellPositions.map(positionToZone));
  return mergedZones.map((zone) => ({
    range: getters.getRangeFromZone(sheetId, zone),
    noFill: true,
    color: HIGHLIGHT_COLOR,
  }));
}

function getVisiblePivotCellPositions(env: SpreadsheetActionEnv, pivotId: UID) {
  const getters = env.model().getters;
  const viewStore = env.getPlugin(ViewportsPlugin);
  const positions: CellPosition[] = [];
  const sheetId = getters.getActiveSheetId();
  for (const col of viewStore.visibleCols) {
    for (const row of viewStore.visibleRows) {
      const position = { sheetId, col, row };
      const cellPivotIds = getters.getPivotIdsFromPosition(position);
      if (cellPivotIds.includes(pivotId)) {
        positions.push(position);
      }
    }
  }
  return positions;
}
