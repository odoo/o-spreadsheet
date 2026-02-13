import { Matrix, isMatrix } from "../types/misc";

export function getUnitMatrix(n: number): Matrix<number> {
  const matrix: Matrix<number> = Array(n);
  for (let i = 0; i < n; i++) {
    matrix[i] = Array(n).fill(0);
    matrix[i][i] = 1;
  }
  return matrix;
}

/**
 * Invert a matrix and compute its determinant using Gaussian Elimination.
 *
 * The Matrix should be a square matrix, and should be indexed [col][row] instead of the
 * standard mathematical indexing [row][col].
 */
export function invertMatrix(M: Matrix<number>): {
  inverted?: Matrix<number>;
  determinant: number;
} {
  // Use Gaussian Elimination to calculate the inverse:
  // (1) 'augment' the matrix (left) by the identity (on the right)
  // (2) Turn the matrix on the left into the identity using elementary row operations
  // (3) The matrix on the right becomes the inverse (was the identity matrix)
  //
  // There are 3 elementary row operations:
  // (a) Swap 2 rows. This multiply the determinant by -1.
  // (b) Multiply a row by a scalar. This multiply the determinant by that scalar.
  // (c) Add to a row a multiple of another row. This does not change the determinant.

  if (M.length < 1 || M[0].length < 1) {
    throw new Error("invertMatrix: an empty matrix cannot be inverted.");
  }

  if (M.length !== M[0].length) {
    throw new Error("invertMatrix: only square matrices are invertible");
  }

  let determinant = 1;
  const dim = M.length;
  const I: Matrix<number> = getUnitMatrix(dim);
  const C: Matrix<number> = M.map((row) => row.slice());

  // Perform elementary row operations
  for (let pivot = 0; pivot < dim; pivot++) {
    let diagonalElement = C[pivot][pivot];

    // if we have a 0 on the diagonal we'll need to swap with a lower row
    if (diagonalElement === 0) {
      //look through every row below the i'th row
      for (let row = pivot + 1; row < dim; row++) {
        //if the ii'th row has a non-0 in the i'th col, swap it with that row
        if (C[pivot][row] !== 0) {
          swapMatrixRows(C, pivot, row);
          swapMatrixRows(I, pivot, row);
          determinant *= -1;
          break;
        }
      }
      diagonalElement = C[pivot][pivot];
      //if it's still 0, matrix isn't invertible
      if (diagonalElement === 0) {
        return { determinant: 0 };
      }
    }

    // Scale this row down by e (so we have a 1 on the diagonal)
    for (let col = 0; col < dim; col++) {
      C[col][pivot] = C[col][pivot] / diagonalElement;
      I[col][pivot] = I[col][pivot] / diagonalElement;
    }
    determinant *= diagonalElement;

    // Subtract a multiple of the current row from ALL of
    // the other rows so that there will be 0's in this column in the
    // rows above and below this one
    for (let row = 0; row < dim; row++) {
      if (row === pivot) {
        continue;
      }

      // We want to change this element to 0
      const e = C[pivot][row];

      // Subtract (the row above(or below) scaled by e) from (the
      // current row) but start at the i'th column and assume all the
      // stuff left of diagonal is 0 (which it should be if we made this
      // algorithm correctly)

      for (let col = 0; col < dim; col++) {
        C[col][row] -= e * C[col][pivot];
        I[col][row] -= e * I[col][pivot];
      }
    }
  }

  // We've done all operations, C should be the identity matrix I should be the inverse
  return { inverted: I, determinant };
}

function swapMatrixRows(matrix: Matrix<number>, row1: number, row2: number) {
  for (let i = 0; i < matrix.length; i++) {
    const tmp = matrix[i][row1];
    matrix[i][row1] = matrix[i][row2];
    matrix[i][row2] = tmp;
  }
}

/**
 * Matrix multiplication of 2 matrices.
 * ex: matrix1 : n x l, matrix2 : m x n => result : m x l
 *
 * Note: we use indexing [col][row] instead of the standard mathematical notation [row][col]
 */
export function multiplyMatrices(matrix1: Matrix<number>, matrix2: Matrix<number>): Matrix<number> {
  if (matrix1.length < 1 || matrix2.length < 1) {
    throw new Error("multiplyMatrices: empty matrices cannot be multiplied.");
  }
  if (matrix1.length !== matrix2[0].length) {
    throw new Error("multiplyMatrices: incompatible matrices size.");
  }

  const rowsM1 = matrix1[0].length;
  const colsM2 = matrix2.length;
  const n = matrix1.length;

  const result: Matrix<number> = Array(colsM2);
  for (let col = 0; col < colsM2; col++) {
    result[col] = Array(rowsM1);
    for (let row = 0; row < rowsM1; row++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += matrix1[k][row] * matrix2[col][k];
      }
      result[col][row] = sum;
    }
  }
  return result;
}

/**
 * Return the input if it's a scalar or the first element of the input if it's a matrix.
 */
export function toScalar<T>(arg: Matrix<T> | T): T {
  if (!isMatrix(arg)) {
    return arg;
  }
  if (!isSingleElementMatrix(arg)) {
    throw new Error("The value should be a scalar or a 1x1 matrix");
  }
  return arg[0][0];
}

function isSingleElementMatrix<T>(matrix: Matrix<T>): boolean {
  return matrix.length === 1 && matrix[0].length === 1;
}

export function isMultipleElementMatrix(arg: any) {
  return isMatrix(arg) && !isSingleElementMatrix(arg);
}

export function transposeMatrix<T>(matrix: Matrix<T>): Matrix<T> {
  if (!matrix.length) {
    return [];
  }
  return generateMatrix(matrix[0].length, matrix.length, (i, j) => matrix[j][i]);
}

/**
 * Generate a matrix of size nColumns x nRows and apply a callback on each position
 */
export function generateMatrix<T>(
  nColumns: number,
  nRows: number,
  callback: (col: number, row: number) => T
): Matrix<T> {
  const returned = Array(nColumns);
  for (let col = 0; col < nColumns; col++) {
    returned[col] = Array(nRows);
    for (let row = 0; row < nRows; row++) {
      returned[col][row] = callback(col, row);
    }
  }
  return returned;
}
export function matrixForEach<T>(matrix: Matrix<T>, fn: (value: T) => void): void {
  const numberOfCols = matrix.length;
  const numberOfRows = matrix[0]?.length ?? 0;
  for (let col = 0; col < numberOfCols; col++) {
    for (let row = 0; row < numberOfRows; row++) {
      fn(matrix[col][row]);
    }
  }
}

export function matrixMap<T, M>(matrix: Matrix<T>, callback: (value: T) => M): Matrix<M> {
  if (matrix.length === 0) {
    return [];
  }
  return generateMatrix(matrix.length, matrix[0].length, (col, row) => callback(matrix[col][row]));
}

export function stackMatricesVertically<T>(matrices: Matrix<T>[], missingValue: T): Matrix<T> {
  const width = matrices.reduce((acc, matrix) => Math.max(acc, matrix.length), 0);
  const height = matrices.reduce((acc, matrix) => acc + matrix[0].length, 0);
  const result: Matrix<T> = new Array(width);
  for (let col = 0; col < width; col++) {
    let rowStep = 0;
    result[col] = new Array(height);
    for (const matrix of matrices) {
      for (let row = 0; row < matrix[0].length; row++) {
        result[col][row + rowStep] = col < matrix.length ? matrix[col][row] : missingValue;
      }
      rowStep += matrix[0].length;
    }
  }
  return result;
}

export function stackMatricesHorizontally<T>(matrices: Matrix<T>[], missingValue: T): Matrix<T> {
  const height = matrices.reduce((acc, matrix) => Math.max(acc, matrix[0]?.length ?? 0), 0);
  const width = matrices.reduce((acc, matrix) => acc + matrix.length, 0);
  const result: Matrix<T> = new Array(width);
  let colStep = 0;
  for (const matrix of matrices) {
    for (let col = 0; col < matrix.length; col++) {
      result[col + colStep] = new Array(height);
      for (let row = 0; row < height; row++) {
        result[col + colStep][row] =
          row < (matrix[0]?.length ?? 0) ? matrix[col][row] : missingValue;
      }
    }
    colStep += matrix.length;
  }
  return result;
}
