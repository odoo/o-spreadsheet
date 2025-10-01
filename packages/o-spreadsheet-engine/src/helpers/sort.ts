import { CellValue, CellValueType, EvaluatedCell, SortDirection } from "../types";

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
    if (left.type === CellValueType.empty) {
      return right.type === CellValueType.empty ? 0 : 1;
    } else if (right.type === CellValueType.empty) {
      return -1;
    }
    let typeOrder = SORT_TYPES.indexOf(left.type) - SORT_TYPES.indexOf(right.type);
    if (typeOrder === 0) {
      if (left.type === CellValueType.text || left.type === CellValueType.error) {
        typeOrder = (left.value as string).localeCompare(right.value as string);
      } else {
        typeOrder = (left.value as number) - (right.value as number);
      }
    }
    return inverse * typeOrder;
  };
}

export function sort(
  cells: EvaluatedCell[],
  sortDirection: SortDirection,
  emptyCellAsZero: boolean
): CellWithIndex[] {
  const cellsWithIndex: CellWithIndex[] = cells.map((cell, index) => ({
    index,
    type: cell.type,
    value: cell.value,
  }));

  const cellsToSort = emptyCellAsZero
    ? cellsWithIndex.map((cell) =>
        cell.type === CellValueType.empty ? { ...cell, type: CellValueType.number, value: 0 } : cell
      )
    : cellsWithIndex;

  return cellsToSort.sort(cellsSortingCriterion(sortDirection));
}
