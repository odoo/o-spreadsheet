import { CellValue, CellValueType, EvaluatedCell } from "../types/cells";
import { SortDirection } from "../types/misc";
import {
  getEvaluatedCellType,
  isEmptyCell,
  isErrorCell,
  isTextCell,
} from "./cells/cell_evaluation";

type CellWithIndex = { index: number; type: CellValueType; value: any };

const SORT_TYPES: CellValueType[] = [
  CellValueType.number,
  CellValueType.error,
  CellValueType.text,
  CellValueType.boolean,
];

export function cellsSortingCriterion(sortingOrder: string) {
  const inverse = sortingOrder === "asc" ? 1 : -1;
  return (
    left: { type: CellValueType; value: CellValue },
    right: { type: CellValueType; value: CellValue }
  ) => {
    if (isEmptyCell(left)) {
      return isEmptyCell(right) ? 0 : 1;
    } else if (isEmptyCell(right)) {
      return -1;
    }
    let typeOrder = SORT_TYPES.indexOf(left.type) - SORT_TYPES.indexOf(right.type);
    if (typeOrder === 0) {
      if (isTextCell(left) || isErrorCell(left)) {
        typeOrder = (left.value as string).localeCompare(right.value as string);
      } else {
        typeOrder = (left.value as number) - (right.value as number);
      }
    }
    return inverse * typeOrder;
  };
}

export function sortCells(
  cells: EvaluatedCell[],
  sortDirection: SortDirection,
  emptyCellAsZero: boolean
): CellWithIndex[] {
  const cellsWithIndex: CellWithIndex[] = cells.map((cell, index) => ({
    index,
    type: getEvaluatedCellType(cell),
    value: cell.value,
  }));

  const cellsToSort = emptyCellAsZero
    ? cellsWithIndex.map((cell) =>
        isEmptyCell(cell) ? { ...cell, type: CellValueType.number, value: 0 } : cell
      )
    : cellsWithIndex;

  return cellsToSort.sort(cellsSortingCriterion(sortDirection));
}
