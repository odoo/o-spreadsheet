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

export type ReferenceDenormalizer = (
  range: Range,
  isMeta: boolean,
  functionName: string,
  paramNumber: number
) => FunctionResultObject;

export type EnsureRange = (range: Range, isMeta: boolean) => Matrix<FunctionResultObject>;

export type GetSymbolValue = (symbolName: string) => unknown;

export type FormulaToExecute = (
  deps: Range[],
  refFn: ReferenceDenormalizer,
  range: EnsureRange,
  getSymbolValue: GetSymbolValue,
  ctx: Record<string, unknown>
) => Matrix<FunctionResultObject> | FunctionResultObject;
