import { Arg, CellValue, FunctionResultObject, Matrix, Maybe, Zone } from "..";
import { intersection } from "../helpers/zones";
import { isFunctionResultObject } from "../types/misc";
import { generateMatrix, matrixForEach, matrixMap } from "./helpers";

export class MimicMatrix {
  [key: number]: never; // Prevent array-like indexing on MimicMatrix instances --> ex: TypeScript error when trying to do 'mimicMatrix[0][0]'
  readonly width: number;
  readonly height: number;
  private getElements: (zone: Zone) => Matrix<FunctionResultObject>;

  constructor(
    width: number,
    height: number,
    getElements: (zone: Zone) => Matrix<FunctionResultObject>
  ) {
    this.width = width;
    this.height = height;
    this.getElements = getElements;
  }

  /** Note: Calling get() will access corresponding element and may register dependencies if applicable */
  get(col: number, row: number): FunctionResultObject {
    return this.getZone({ left: col, right: col, top: row, bottom: row })[0][0];
  }

  /** Note: Calling getZone() will access corresponding element and may register dependencies if applicable */
  getZone(zone: Zone): Matrix<FunctionResultObject> {
    const { top, left, bottom, right } = zone;
    if (left < 0 || right >= this.width || top < 0 || bottom >= this.height) {
      throw new Error(
        `Zone out of bounds (left: ${left}, right: ${right}, top: ${top}, bottom: ${bottom}) for matrix of size ${this.width}x${this.height}`
      );
    }

    if (this.width === 0 || this.height === 0) {
      return [[]];
    }
    return this.getElements(zone);
  }

  /** Note: Calling getIntersection() will access corresponding element and may register dependencies if applicable */
  getIntersection(zone: Zone): Matrix<FunctionResultObject> {
    const intersectionZone = intersection(this.toZone(), zone);
    if (!intersectionZone) {
      return [[]];
    }
    return this.getZone(intersectionZone);
  }

  /** Note: Calling getAll() will access all elements and may register dependencies if applicable */
  getAll(): Matrix<FunctionResultObject> {
    const zone = { top: 0, left: 0, bottom: this.height - 1, right: this.width - 1 };
    return this.getZone(zone);
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
    return new MimicMatrix(rowWidth, 1, (zone) =>
      this.getElements({
        left: startColIndex + zone.left,
        right: startColIndex + zone.right,
        top: rowIndex,
        bottom: rowIndex,
      })
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
    return new MimicMatrix(1, colHeight, (zone) =>
      this.getElements({
        left: colIndex,
        right: colIndex,
        top: startRowIndex + zone.top,
        bottom: startRowIndex + zone.bottom,
      })
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
    return new MimicMatrix(sliceWidth, this.height, (zone) =>
      this.getElements({
        left: startCol + zone.left,
        right: startCol + zone.right,
        top: zone.top,
        bottom: zone.bottom,
      })
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
    return new MimicMatrix(this.width, sliceHeight, (zone) =>
      this.getElements({
        left: zone.left,
        right: zone.right,
        top: startRow + zone.top,
        bottom: startRow + zone.bottom,
      })
    );
  }

  // TO DO: verify if preferred to return an array or a MimicMatrix
  /** Note: Calling flatten() will access all elements and may register dependencies if applicable */
  flatten<T = FunctionResultObject>(
    dimension: "rowFirst" | "colFirst" = "rowFirst",
    cb?: (value: FunctionResultObject) => T
  ): T[] {
    const result: T[] = new Array(this.width * this.height);
    let idx = 0;
    const applyCb = cb ? cb : (v: FunctionResultObject) => v as unknown as T;
    const elements = this.getAll();

    if (dimension === "rowFirst") {
      for (let row = 0; row < this.height; row++) {
        for (let col = 0; col < this.width; col++) {
          result[idx++] = applyCb(elements[col][row]);
        }
      }
      return result;
    }
    for (let col = 0; col < this.width; col++) {
      for (let row = 0; row < this.height; row++) {
        result[idx++] = applyCb(elements[col][row]);
      }
    }
    return result;
  }

  reduce<T>(
    dimension: "rowFirst" | "colFirst",
    cb: (acc: T, value: FunctionResultObject) => T,
    initialValue: T
  ): T {
    const elements = this.getAll();
    let acc = initialValue;
    if (dimension === "rowFirst") {
      for (let row = 0; row < this.height; row++) {
        for (let col = 0; col < this.width; col++) {
          acc = cb(acc, elements[col][row]);
        }
      }
    } else {
      for (let col = 0; col < this.width; col++) {
        for (let row = 0; row < this.height; row++) {
          acc = cb(acc, elements[col][row]);
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
    return matrixMap(this.getAll(), (value) => cb(value));
  }

  /** Note: Calling visit() will access all elements and may register dependencies if applicable */
  visit(cb: (value: FunctionResultObject) => void): void {
    matrixForEach(this.getAll(), (cell) => cb(cell));
  }

  // TO DO: forEach is void ?
  forEach(cb: (value: FunctionResultObject) => void): MimicMatrix {
    return new MimicMatrix(this.width, this.height, (zone) => {
      const elements = this.getElements(zone);
      matrixForEach(elements, (cell) => cb(cell));
      return elements;
    });
  }

  transform(cb: (value: FunctionResultObject) => FunctionResultObject): MimicMatrix {
    return new MimicMatrix(this.width, this.height, (zone) => {
      return matrixMap(this.getElements(zone), (value) => cb(value));
    });
  }

  transpose(): MimicMatrix {
    return new MimicMatrix(this.height, this.width, (zone) => {
      const elements = this.getElements({
        left: zone.top,
        right: zone.bottom,
        top: zone.left,
        bottom: zone.right,
      });

      return generateMatrix(this.height, this.width, (col, row) => elements[row][col]);
    });
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

  toZone(): Zone {
    return {
      left: 0,
      right: this.width > 0 ? this.width - 1 : 0,
      top: 0,
      bottom: this.height > 0 ? this.height - 1 : 0,
    };
  }
}

const EMPTY_MIMIC_MATRIX = new MimicMatrix(0, 0, (zone) => [[]]);

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
    mimicMatrixSimpleValueCache[key] = new MimicMatrix(1, 1, () => [[data]]);
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
    return generateMimicMatrix(width, height, (col, row) => {
      return matrix[col][row] as FunctionResultObject;
    });
  }
  return generateMimicMatrix(width, height, (col, row) => {
    return { value: matrix[col][row] as CellValue };
  });
}

export function generateMimicMatrix(
  width: number,
  height: number,
  cb: (col: number, row: number) => FunctionResultObject
): MimicMatrix {
  return new MimicMatrix(width, height, (zone) => {
    const partialHeight = zone.bottom - zone.top + 1;
    const partialWidth = zone.right - zone.left + 1;
    return generateMatrix(partialWidth, partialHeight, (col, row) => {
      return cb(zone.left + col, zone.top + row);
    });
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
  return generateMimicMatrix(n, n, (col, row) => ({ value: col === row ? 1 : 0 }));
}
