import { _t } from "../translation";
import type { Matrix } from "../types";
import { isMatrix } from "../types";

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

  if (M.length !== M[0].length) {
    throw new Error(
      `Function [[FUNCTION_NAME]] invert matrix error, only square matrices are invertible`
    );
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
        if (C[pivot][row] != 0) {
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

function swapMatrixRows(matrix: number[][], row1: number, row2: number) {
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
  if (matrix1.length !== matrix2[0].length) {
    throw new Error(_t("Cannot multiply matrices : incompatible matrices size."));
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
export function toScalar<T>(matrix: Matrix<T> | T): T {
  if (!isMatrix(matrix)) {
    return matrix;
  }
  if (matrix.length !== 1 || matrix[0].length !== 1) {
    throw new Error("toScalar: matrix should be a scalar or a 1x1 matrix");
  }
  return matrix[0][0];
}
