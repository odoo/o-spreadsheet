import { _t, SortDirection, UID, Zone } from "@odoo/o-spreadsheet-engine";
import { isEqual } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { CommandResult } from "@odoo/o-spreadsheet-engine/types/commands";
import { Position, SortOptions } from "@odoo/o-spreadsheet-engine/types/misc";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";

export function interactiveSortSelection(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  anchor: Position,
  zone: Zone,
  sortDirection: SortDirection
) {
  //several columns => bypass the contiguity check
  let multiColumns: boolean = zone.right > zone.left;
  if (env.model.getters.doesIntersectMerge(sheetId, zone)) {
    multiColumns = false;
    let table: UID[];
    for (let row = zone.top; row <= zone.bottom; row++) {
      table = [];
      for (let col = zone.left; col <= zone.right; col++) {
        const merge = env.model.getters.getMerge({ sheetId, col, row });
        if (merge && !table.includes(merge.id.toString())) {
          table.push(merge.id.toString());
        }
      }
      if (table.length >= 2) {
        multiColumns = true;
        break;
      }
    }
  }

  if (multiColumns) {
    interactiveSort(env, sheetId, anchor, zone, sortDirection);
    return;
  }

  const contiguousZone = env.model.getters.getContiguousZone(sheetId, zone);
  if (isEqual(contiguousZone, zone)) {
    interactiveSort(env, sheetId, anchor, zone, sortDirection);
  } else {
    env.askConfirmation(
      _t(
        "We found data next to your selection. Since this data was not selected, it will not be sorted. Do you want to extend your selection?"
      ),
      () => interactiveSort(env, sheetId, anchor, contiguousZone, sortDirection),
      () => interactiveSort(env, sheetId, anchor, zone, sortDirection)
    );
  }
}

export function interactiveSort(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  anchor: Position,
  zone: Zone,
  sortDirection: SortDirection,
  sortOptions?: SortOptions
) {
  const result = env.model.dispatch("SORT_CELLS", {
    sheetId,
    col: anchor.col,
    row: anchor.row,
    zone,
    sortDirection,
    sortOptions,
  });
  if (result.isCancelledBecause(CommandResult.InvalidSortZone)) {
    const { col, row } = anchor;
    env.model.selection.selectZone({ cell: { col, row }, zone });
    env.raiseError(
      _t("Cannot sort. To sort, select only cells or only merges that have the same size.")
    );
  }
  if (result.isCancelledBecause(CommandResult.SortZoneWithArrayFormulas)) {
    const { col, row } = anchor;
    env.model.selection.selectZone({ cell: { col, row }, zone });
    env.raiseError(_t("Cannot sort a zone with array formulas."));
  }
}
