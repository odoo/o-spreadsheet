import { _lt } from "../translation";
import {
  CellValueType,
  CommandResult,
  DispatchResult,
  EvaluatedCell,
  Position,
  SortDirection,
  SpreadsheetChildEnv,
  UID,
  Zone,
} from "../types";
import { isEqual } from "./zones";

type CellWithIndex = { index: number; type: CellValueType; value: any };

const SORT_TYPES: CellValueType[] = [
  CellValueType.number,
  CellValueType.error,
  CellValueType.text,
  CellValueType.boolean,
];

export function sortCells(
  cells: EvaluatedCell[],
  sortDirection: SortDirection,
  emptyCellAsZero: boolean
): CellWithIndex[] {
  const cellsWithIndex: CellWithIndex[] = cells.map((cell, index) => ({
    index,
    type: cell.type,
    value: cell.value,
  }));
  let emptyCells: CellWithIndex[] = cellsWithIndex.filter((x) => x.type === CellValueType.empty);
  let nonEmptyCells: CellWithIndex[] = cellsWithIndex.filter((x) => x.type !== CellValueType.empty);
  if (emptyCellAsZero) {
    nonEmptyCells.push(
      ...emptyCells.map((emptyCell) => ({ ...emptyCell, type: CellValueType.number, value: 0 }))
    );
    emptyCells = [];
  }

  const inverse = sortDirection === "descending" ? -1 : 1;

  return nonEmptyCells
    .sort((left, right) => {
      let typeOrder = SORT_TYPES.indexOf(left.type) - SORT_TYPES.indexOf(right.type);
      if (typeOrder === 0) {
        if (left.type === CellValueType.text || left.type === CellValueType.error) {
          typeOrder = left.value.localeCompare(right.value);
        } else typeOrder = left.value - right.value;
      }
      return inverse * typeOrder;
    })
    .concat(emptyCells);
}

export function interactiveSortSelection(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  anchor: Position,
  zone: Zone,
  sortDirection: SortDirection
) {
  let result: DispatchResult = DispatchResult.Success;

  //several columns => bypass the contiguity check
  let multiColumns: boolean = zone.right > zone.left;
  if (env.model.getters.doesIntersectMerge(sheetId, zone)) {
    multiColumns = false;
    let table: UID[];
    for (let row = zone.top; row <= zone.bottom; row++) {
      table = [];
      for (let col = zone.left; col <= zone.right; col++) {
        let merge = env.model.getters.getMerge({ sheetId, col, row });
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

  const { col, row } = anchor;
  if (multiColumns) {
    result = env.model.dispatch("SORT_CELLS", { sheetId, col, row, zone, sortDirection });
  } else {
    // check contiguity
    const contiguousZone = env.model.getters.getContiguousZone(sheetId, zone);
    if (isEqual(contiguousZone, zone)) {
      // merge as it is
      result = env.model.dispatch("SORT_CELLS", {
        sheetId,
        col,
        row,
        zone,
        sortDirection,
      });
    } else {
      env.askConfirmation(
        _lt(
          "We found data next to your selection. Since this data was not selected, it will not be sorted. Do you want to extend your selection?"
        ),
        () => {
          zone = contiguousZone;
          result = env.model.dispatch("SORT_CELLS", {
            sheetId,
            col,
            row,
            zone,
            sortDirection,
          });
        },
        () => {
          result = env.model.dispatch("SORT_CELLS", {
            sheetId,
            col,
            row,
            zone,
            sortDirection,
          });
        }
      );
    }
  }
  if (result.isCancelledBecause(CommandResult.InvalidSortZone)) {
    const { col, row } = anchor;
    env.model.selection.selectZone({ cell: { col, row }, zone });
    env.raiseError(
      _lt("Cannot sort. To sort, select only cells or only merges that have the same size.")
    );
  }
}
