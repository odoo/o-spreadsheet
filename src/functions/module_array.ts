import { args } from "./arguments";
import { FunctionDescription } from "../types";
import { toBoolean } from "./helpers";

type Matrix<T> = T[][];

function toMatrix(a: any): Matrix<any> {
  if (["number", "string", "boolean"].includes(typeof a)) {
    return [[a]];
  }
  return a;
}

function isMatrixNumber(M: Matrix<any>): boolean {
  for (let col of M) {
    for (let cell of col) {
      if (typeof cell !== "number") {
        return false;
      }
    }
  }
  return true;
}

function transposeM(M: Matrix<any>): Matrix<any> {
  return M[0].map((col, i) => M.map((row) => row[i]));
}

function multiplyM(A: Matrix<number>, B: Matrix<number>): Matrix<number> {
  const dimRowA = A.length;
  const dimColB = B[0].length;
  if (dimRowA !== dimColB) {
    throw new Error(`Multiply mattrices impossible, matrices haven't compatible dimensions`);
  }
  const dimColA = A[0].length;
  const dimRowB = B.length;
  let result: number[][] = [];
  for (let i = 0; i < dimRowB; i++) {
    let col: number[] = [];
    for (let j = 0; j < dimColA; j++) {
      let sum = 0;
      for (let k = 0; k < dimRowA; k++) {
        sum += A[k][j] * B[i][k];
      }
      col.push(sum);
    }
    result.push(col);
  }
  return result;
}

function invertM(M: Matrix<number>): Matrix<number> {
  // I use Guassian Elimination to calculate the inverse:
  // (1) 'augment' the matrix (left) by the identity (on the right)
  // (2) Turn the matrix on the left into the identity by elemetry row ops
  // (3) The matrix on the right is the inverse (was the identity matrix)
  // There are 3 elemtary row ops: (I combine b and c in my code)
  // (a) Swap 2 rows
  // (b) Multiply a row by a scalar
  // (c) Add 2 rows

  //if the matrix isn't square: exit (error)
  if (M.length !== M[0].length) {
    throw new Error(`Invert mattrices impossible, matrices haven't compatible dimensions`);
  }

  //create the identity matrix (I), and a copy (C) of the original
  let i = 0;
  let ii = 0;
  let j = 0;
  const dim = M.length;
  let e = 0;
  let I: Matrix<number> = [];
  let C: Matrix<number> = [];
  for (i = 0; i < dim; i += 1) {
    // Create the row
    I[I.length] = [];
    C[C.length] = [];
    for (j = 0; j < dim; j += 1) {
      //if we're on the diagonal, put a 1 (for identity)
      if (i == j) {
        I[i][j] = 1;
      } else {
        I[i][j] = 0;
      }

      // Also, make the copy of the original
      C[i][j] = M[i][j];
    }
  }

  // Perform elementary row operations
  for (i = 0; i < dim; i += 1) {
    // get the element e on the diagonal
    e = C[i][i];

    // if we have a 0 on the diagonal (we'll need to swap with a lower row)
    if (e == 0) {
      //look through every row below the i'th row
      for (ii = i + 1; ii < dim; ii += 1) {
        //if the ii'th row has a non-0 in the i'th col
        if (C[ii][i] != 0) {
          //it would make the diagonal have a non-0 so swap it
          for (j = 0; j < dim; j++) {
            e = C[i][j]; //temp store i'th row
            C[i][j] = C[ii][j]; //replace i'th row by ii'th
            C[ii][j] = e; //repace ii'th by temp
            e = I[i][j]; //temp store i'th row
            I[i][j] = I[ii][j]; //replace i'th row by ii'th
            I[ii][j] = e; //repace ii'th by temp
          }
          //don't bother checking other rows since we've swapped
          break;
        }
      }
      //get the new diagonal
      e = C[i][i];
      //if it's still 0, not invertable (error)
      if (e == 0) {
        throw new Error(`Invert mattrices impossible`);
      }
    }

    // Scale this row down by e (so we have a 1 on the diagonal)
    for (j = 0; j < dim; j++) {
      C[i][j] = C[i][j] / e; //apply to original matrix
      I[i][j] = I[i][j] / e; //apply to identity
    }

    // Subtract this row (scaled appropriately for each row) from ALL of
    // the other rows so that there will be 0's in this column in the
    // rows above and below this one
    for (ii = 0; ii < dim; ii++) {
      // Only apply to other rows (we want a 1 on the diagonal)
      if (ii == i) {
        continue;
      }

      // We want to change this element to 0
      e = C[ii][i];

      // Subtract (the row above(or below) scaled by e) from (the
      // current row) but start at the i'th column and assume all the
      // stuff left of diagonal is 0 (which it should be if we made this
      // algorithm correctly)
      for (j = 0; j < dim; j++) {
        C[ii][j] -= e * C[i][j]; //apply to original matrix
        I[ii][j] -= e * I[i][j]; //apply to identity
      }
    }
  }

  //we've done all operations, C should be the identity
  //matrix I should be the inverse:
  return I;
}

function getLeastSquareCoef(Y: Matrix<number>, X: Matrix<number>): Matrix<number> {
  const tX = transposeM(X);
  const tXX = multiplyM(tX, X);
  const part1 = invertM(tXX);
  const part2 = multiplyM(tX, Y);

  return multiplyM(part1, part2);
}

// -----------------------------------------------------------------------------
// TRANSPOSE
// -----------------------------------------------------------------------------

// To do: the function must be able to return values ​​on several cells, when
// possible, uncomment //COM1 to return arrays and not a single value

export const TRANSPOSE: FunctionDescription = {
  description: "Transposes the rows and columns of an array.",
  args: args`array_or_range (any, range) The array or range whose rows and columns will be swapped.`,
  returns: ["NUMBER"],
  compute: function (array_or_range: any): any {
    const _arrayOrRange = toMatrix(array_or_range);
    return transposeM(_arrayOrRange)[0][0];
    //COM1 return transposeM(array_or_range);
  },
};

// -----------------------------------------------------------------------------
// TREND
// -----------------------------------------------------------------------------

// To do: the function must be able to return values ​​on several cells, when
// possible, uncomment //COM1 and //COM2 to return arrays and not a single value

export const TREND: FunctionDescription = {
  description: "Fits points to linear trend derived via least-squares.",
  args: args`
      known_data_y (any, range) The array or range containing dependent (y) values that are already known, used to curve fit an ideal linear trend.
      known_data_x (any, range, optional, default = {1,2,3,...}) The values of the independent variable(s) corresponding with known_data_y.
      new_data_x (any, range, optional, default = known_data_x) The data points to return the y values for on the ideal curve fit.
      b (boolean, optional, default=TRUE) Given a general linear form of y = m*x+b for a curve fit, calculates b if TRUE or forces b to be 0 and only calculates the m values if FALSE, i.e. forces the curve fit to pass through the origin.
    `,
  returns: ["NUMBER"],
  compute: function (
    known_data_y: any,
    known_data_x: any = undefined,
    new_data_x: any = undefined,
    b: any = true
  ): number {
    // -------------------------------------------------------------------------
    // 1 - Prepare arguments for calculates

    const _knownDataY = toMatrix(known_data_y);
    let _knownDataX;
    if (!isMatrixNumber(_knownDataY)) {
      throw new Error(`Function TREND parameter 1 expects number values`);
    }

    const dimRowY = _knownDataY.length;
    const dimColY = _knownDataY[0].length;

    let dimRowX;
    let dimColX;

    // If known_data_x is omitted, it is assumed to be the array {1,2,3,...}
    // that is the same dimension as known_data_y.
    if (known_data_x === undefined) {
      _knownDataX = [];
      for (let i = 0; i < dimRowY; i++) {
        let col: number[] = [];
        for (let j = 1; j < dimColY + 1; j++) {
          col.push(i * dimColY + j);
        }
        _knownDataX.push(col);
      }
      dimRowX = dimRowY;
      dimColX = dimColY;
    } else {
      // The array known_data_x can include one or more sets of variables.

      _knownDataX = toMatrix(known_data_x);
      if (!isMatrixNumber(_knownDataX)) {
        throw new Error(`Function TREND parameter 2 expects number values`);
      }

      dimRowX = _knownDataX.length;
      dimColX = _knownDataX[0].length;

      // If known_data_y and known_data_x have equal dimensions then only one
      // variable is used.
      // If more than one variable is used, known_data_y must be a vector
      // and each column or row of known_data_x is interpreted as a separate
      // variable.
      if (dimRowY > 1 && dimColY > 1) {
        if (dimColX !== dimColY || dimRowX !== dimRowY) {
          throw new Error(
            `TREND has mismatched range sizes. Expected row count: ${dimColY}. column count: ${dimRowY}. Actual row count: ${dimColX}, column count: ${dimRowX}.`
          );
        }
      } else {
        if (dimRowY === 1) {
          if (dimColX !== dimColY) {
            throw new Error(
              `TREND has mismatched row size. Expected: ${dimColY}. Actual: ${dimColX}.`
            );
          }
        } else {
          if (dimRowX !== dimRowY) {
            throw new Error(
              `TREND has mismatched col size. Expected: ${dimRowY}. Actual: ${dimRowX}.`
            );
          }
        }
      }
    }

    let _newDataX;
    let dimRowNewX;
    let dimColNewX;

    // If you omit new_data_x, it is assumed to be the same as known_data_x.
    if (new_data_x === undefined) {
      _newDataX = _knownDataX;

      dimRowNewX = dimRowX;
      dimColNewX = dimColX;
    } else {
      _newDataX = toMatrix(new_data_x);
      if (!isMatrixNumber(_newDataX)) {
        throw new Error(`Function TREND parameter 3 expects number values`);
      }
      dimRowNewX = _newDataX.length;
      dimColNewX = _newDataX[0].length;

      // new_data_x must include a column (or row) for each independent variable,
      // just as known_data_x does. So, if known_data_y is in a single column,
      // known_data_x and new_data_x must have the same number of columns.
      // Ex: If known_data_y is in a single row, known_data_x and new_data_x must
      // have the same number of rows.
      if (dimRowY === 1) {
        if (dimRowX !== dimRowNewX) {
          throw new Error("must have the same dimension");
        }
      } else if (dimColY === 1) {
        if (dimColX !== dimColNewX) {
          throw new Error("must have the same dimension");
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2 - Job part

    const _b = toBoolean(b);

    if (dimRowY > 1 && dimColY > 1) {
      // reduce table to single column table
      const Y = [_knownDataY.flat()];
      let X = [_knownDataX.flat()];

      if (_b) {
        const vectorOfOnes = [X[0].map((x) => 1)];
        X = vectorOfOnes.concat(X);
      }

      // get all the coefficients as a vector
      const minSquareCoef = getLeastSquareCoef(Y, X);

      let a0 = _b ? minSquareCoef[0][0] : 0;
      let a1 = _b ? minSquareCoef[0][1] : minSquareCoef[0][0];

      return a1 * _newDataX[0][0] + a0;
      // COM1 return new_data_x.map(col => col.map( cell => a1*cell + a0))
    } else {
      const workOnColumn = dimRowY === 1;

      const Y = workOnColumn ? _knownDataY : transposeM(_knownDataY);
      let X = workOnColumn ? _knownDataX : transposeM(_knownDataX);
      let newX = workOnColumn ? _newDataX : transposeM(_newDataX);

      if (_b) {
        const vectorOfOnes = [X[0].map((x) => 1)];
        X = vectorOfOnes.concat(X);
        newX = vectorOfOnes.concat(newX);
      }

      const minSquareCoef = getLeastSquareCoef(Y, X);

      const result = multiplyM(newX, minSquareCoef);
      const finalResult = workOnColumn ? result : transposeM(result);

      return finalResult[0][0];
      // COM2 return finalResult
    }
  },
};
