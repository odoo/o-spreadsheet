import { Cell, CellValueType, SortDirection } from "../types";

type CellWithIndex = { index: number; type: CellValueType; value: any };

const SORT_TYPES: CellValueType[] = [
  CellValueType.number,
  CellValueType.error,
  CellValueType.text,
  CellValueType.boolean,
];

function convertCell(cell: Cell | undefined, index: number): CellWithIndex {
  return {
    index,
    type: cell ? cell.evaluated.type : CellValueType.empty,
    value: cell ? cell.evaluated.value : "",
  };
}

export function sortCells(
  cells: (Cell | undefined)[],
  sortDirection: SortDirection
): CellWithIndex[] {
  const cellsWithIndex: CellWithIndex[] = cells.map(convertCell);
  const emptyCells: CellWithIndex[] = cellsWithIndex.filter((x) => x.type === CellValueType.empty);
  const nonEmptyCells: CellWithIndex[] = cellsWithIndex.filter(
    (x) => x.type !== CellValueType.empty
  );

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
