export type Alias = {} & {};

export type UID = string & Alias;

export type HeaderIndex = number & Alias;

export interface CellPosition {
  col: HeaderIndex;
  row: HeaderIndex;
  sheetId: UID;
}

export interface Zone {
  left: HeaderIndex;
  right: HeaderIndex;
  top: HeaderIndex;
  bottom: HeaderIndex;
}

export type CellValue = string | number | boolean | null;

export type Format = string & Alias;

export type Maybe<T> = T | undefined;

export type Matrix<T = unknown> = T[][];

export type Dimension = "COL" | "ROW";

export type SortDirection = "asc" | "desc";

export interface FunctionResultObject {
  value: CellValue;
  format?: Format;
  errorOriginPosition?: CellPosition;
  message?: string;
  origin?: CellPosition;
}
