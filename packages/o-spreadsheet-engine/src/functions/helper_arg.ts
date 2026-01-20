import { Arg, CellValue, FunctionResultObject, Matrix, Maybe } from "..";
import { isFunctionResultObject } from "../types/misc";

export class MimicMatrix {
  [key: number]: never; // Prevent array-like indexing on MimicMatrix instances --> ex: TypeScript error when trying to do 'mimicMatrix[0][0]'
  readonly width: number;
  readonly height: number;
  private getElement: (col: number, row: number) => FunctionResultObject;

  constructor(
    width: number,
    height: number,
    getElement: (col: number, row: number) => FunctionResultObject
  ) {
    this.width = width;
    this.height = height;
    this.getElement = getElement;
  }

  /** Note: Calling get() will access corresponding element and may register dependencies if applicable */
  get(col: number, row: number): FunctionResultObject {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      throw new Error(
        `Index out of bounds (${col}, ${row}) for matrix of size ${this.width}x${this.height}`
      );
    }
    return this.getElement(col, row);
  }

  /** Note: Calling getAll() will access all elements and may register dependencies if applicable */
  getAll(): Matrix<FunctionResultObject> {
    if (this.isEmpty()) {
      return [[]];
    }
    // Performance issue: nested loop is faster than a map here
    const elements: Matrix<FunctionResultObject> = new Array(this.width);
    for (let col = 0; col < this.width; col++) {
      elements[col] = new Array(this.height);
      for (let row = 0; row < this.height; row++) {
        elements[col][row] = this.getElement(col, row);
      }
    }
    return elements;
  }

  getRow(rowIndex: number, startColIndex: number = 0): MimicMatrix {
    if (rowIndex < 0 || rowIndex >= this.height) {
      throw new Error(`Row index out of bounds (${rowIndex}) for matrix of height ${this.height}`);
    }
    if (startColIndex < 0 || startColIndex >= this.width) {
      throw new Error(
        `Start column index out of bounds (${startColIndex}) for matrix of width ${this.width}`
      );
    }
    const rowWidth = this.width - startColIndex;
    return new MimicMatrix(rowWidth, 1, (col, row) =>
      this.getElement(startColIndex + col, rowIndex)
    );
  }

  getCol(colIndex: number, startRowIndex: number = 0): MimicMatrix {
    if (colIndex < 0 || colIndex >= this.width) {
      throw new Error(`Column index out of bounds (${colIndex}) for matrix of width ${this.width}`);
    }
    if (startRowIndex < 0 || startRowIndex >= this.height) {
      throw new Error(
        `Start row index out of bounds (${startRowIndex}) for matrix of height ${this.height}`
      );
    }
    const colHeight = this.height - startRowIndex;
    return new MimicMatrix(1, colHeight, (col, row) =>
      this.getElement(colIndex, startRowIndex + row)
    );
  }

  sliceCols(startCol: number, endCol?: number): MimicMatrix {
    const actualEndCol = endCol !== undefined ? endCol : this.width;
    if (
      startCol < 0 ||
      startCol > this.width ||
      actualEndCol < startCol ||
      actualEndCol > this.width
    ) {
      throw new Error(
        `Invalid column slice indices: startCol=${startCol}, endCol=${actualEndCol}, width=${this.width}`
      );
    }
    const sliceWidth = actualEndCol - startCol;
    return new MimicMatrix(sliceWidth, this.height, (col, row) =>
      this.getElement(startCol + col, row)
    );
  }

  sliceRows(startRow: number, endRow?: number): MimicMatrix {
    const actualEndRow = endRow !== undefined ? endRow : this.height;
    if (
      startRow < 0 ||
      startRow > this.height ||
      actualEndRow < startRow ||
      actualEndRow > this.height
    ) {
      throw new Error(
        `Invalid row slice indices: startRow=${startRow}, endRow=${actualEndRow}, height=${this.height}`
      );
    }
    const sliceHeight = actualEndRow - startRow;
    return new MimicMatrix(this.width, sliceHeight, (col, row) =>
      this.getElement(col, startRow + row)
    );
  }

  // TO DO: verify if preferred to return an array or a MimicMatrix
  /** Note: Calling flatten() will access all elements and may register dependencies if applicable */
  flatten<T = FunctionResultObject>(
    dimension: "rowFirst" | "colFirst" = "rowFirst",
    cb?: (value: FunctionResultObject) => T
  ): T[] {
    const elements: T[] = [];
    const applyCb = cb ? cb : (v: FunctionResultObject) => v as unknown as T;
    if (dimension === "rowFirst") {
      for (let row = 0; row < this.height; row++) {
        for (let col = 0; col < this.width; col++) {
          elements.push(applyCb(this.getElement(col, row)));
        }
      }
      return elements;
    }
    for (let col = 0; col < this.width; col++) {
      for (let row = 0; row < this.height; row++) {
        elements.push(applyCb(this.getElement(col, row)));
      }
    }
    return elements;
  }

  reduce<T>(
    dimension: "rowFirst" | "colFirst",
    cb: (acc: T, value: FunctionResultObject) => T,
    initialValue: T
  ): T {
    let acc = initialValue;
    if (dimension === "rowFirst") {
      for (let row = 0; row < this.height; row++) {
        for (let col = 0; col < this.width; col++) {
          acc = cb(acc, this.getElement(col, row));
        }
      }
    } else {
      for (let col = 0; col < this.width; col++) {
        for (let row = 0; row < this.height; row++) {
          acc = cb(acc, this.getElement(col, row));
        }
      }
    }
    return acc;
  }

  /** Note: Calling map() will access all elements and may register dependencies if applicable */
  map<T>(cb: (value: FunctionResultObject) => T): Matrix<T> {
    if (this.isEmpty()) {
      return [[]];
    }
    // Performance issue: nested loop is faster than a map here
    const elements: Matrix<T> = new Array(this.width);
    for (let col = 0; col < this.width; col++) {
      elements[col] = new Array(this.height);
      for (let row = 0; row < this.height; row++) {
        elements[col][row] = cb(this.getElement(col, row));
      }
    }
    return elements;
  }

  /** Note: Calling visit() will access all elements and may register dependencies if applicable */
  visit(cb: (value: FunctionResultObject) => void): void {
    for (let col = 0; col < this.width; col++) {
      for (let row = 0; row < this.height; row++) {
        cb(this.getElement(col, row));
      }
    }
  }

  forEach(cb: (value: FunctionResultObject) => void): MimicMatrix {
    return new MimicMatrix(this.width, this.height, (col, row) => {
      const element = this.getElement(col, row);
      cb(element);
      return element;
    });
  }

  transform(cb: (value: FunctionResultObject) => FunctionResultObject): MimicMatrix {
    return new MimicMatrix(this.width, this.height, (col, row) => {
      return cb(this.getElement(col, row));
    });
  }

  transpose(): MimicMatrix {
    return new MimicMatrix(this.height, this.width, (col, row) => this.getElement(row, col));
  }

  isSingleColOrRow(): boolean {
    return this.width === 1 || this.height === 1;
  }

  isSingleElement(): boolean {
    return this.width === 1 && this.height === 1;
  }

  isEmpty(): boolean {
    return this.width === 0 || this.height === 0;
  }
}

const EMPTY_MIMIC_MATRIX = new MimicMatrix(0, 0, () => ({ value: null }));

export function toMimicMatrix(data: Arg): MimicMatrix {
  if (data === undefined) {
    return EMPTY_MIMIC_MATRIX;
  }

  // Cache for MimicMatrix instances with simple values
  const mimicMatrixSimpleValueCache: Record<string, MimicMatrix> = {};

  if (isMimicMatrix(data)) {
    return data;
  }
  // Only cache for primitive values (number, boolean, null, undefined, string)
  // Use typeof + value as key for uniqueness
  let key: string;
  switch (typeof data.value) {
    case "number":
      key = `n${data.value}`;
      break;
    case "boolean":
      key = `b${data.value ? 1 : 0}`;
      break;
    case "string":
      key = `s${data.value}`;
      break;
    default:
      key = `u`;
      break;
  }

  if (!mimicMatrixSimpleValueCache[key]) {
    mimicMatrixSimpleValueCache[key] = new MimicMatrix(1, 1, () => data);
  }
  return mimicMatrixSimpleValueCache[key];
}

export function matrixToMimicMatrix(matrix: Matrix<FunctionResultObject | CellValue>): MimicMatrix {
  const width = matrix.length;
  const height = width > 0 ? matrix[0].length : 0;
  if (height === 0) {
    return EMPTY_MIMIC_MATRIX;
  }
  const firstElement = matrix[0]?.[0];
  if (firstElement !== undefined && isFunctionResultObject(firstElement)) {
    return new MimicMatrix(width, height, (col, row) => {
      return matrix[col][row] as FunctionResultObject;
    });
  }
  return new MimicMatrix(width, height, (col, row) => {
    return { value: matrix[col][row] as CellValue };
  });
}

export function isMimicMatrix(value: Arg): value is MimicMatrix {
  return value instanceof MimicMatrix;
}

export function isMultipleElementMimicMatrix(value: Arg) {
  return isMimicMatrix(value) && !value.isSingleElement();
}

export function toScalarMimicMatrix(
  arg: MimicMatrix | Maybe<FunctionResultObject>
): Maybe<FunctionResultObject> {
  if (!isMimicMatrix(arg)) {
    return arg;
  }
  if (!arg.isSingleElement()) {
    throw new Error("The value should be a scalar or a 1x1 matrix");
  }
  return arg.get(0, 0);
}

export function unitMimicMatrix(n: number): MimicMatrix {
  return new MimicMatrix(n, n, (col, row) => {
    return { value: col === row ? 1 : 0 };
  });
}
