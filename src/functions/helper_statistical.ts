import { isNumber, parseDateTime, range } from "../helpers";
import { _t } from "../translation";
import { Arg, Locale, Matrix, isMatrix } from "../types";
import { EvaluationError } from "../types/errors";
import { invertMatrix, multiplyMatrices } from "./helper_matrices";
import {
  assert,
  assertNotZero,
  isEvaluationError,
  reduceAny,
  reduceNumbers,
  transposeMatrix,
} from "./helpers";

export function assertSameNumberOfElements(...args: any[][]) {
  const dims = args[0].length;
  args.forEach((arg, i) =>
    assert(
      () => arg.length === dims,
      _t(
        "[[FUNCTION_NAME]] has mismatched dimensions for argument %s (%s vs %s).",
        i.toString(),
        dims.toString(),
        arg.length.toString()
      )
    )
  );
}

export function average(values: Arg[], locale: Locale) {
  let count = 0;
  const sum = reduceNumbers(
    values,
    (acc, a) => {
      count += 1;
      return acc + a;
    },
    0,
    locale
  );
  assertNotZero(count);
  return sum / count;
}

export function countNumbers(values: Arg[], locale: Locale) {
  let count = 0;
  for (let n of values) {
    if (isMatrix(n)) {
      for (let i of n) {
        for (let j of i) {
          if (typeof j.value === "number") {
            count += 1;
          }
        }
      }
    } else {
      const value = n?.value;
      if (
        !isEvaluationError(value) &&
        (typeof value !== "string" || isNumber(value, locale) || parseDateTime(value, locale))
      ) {
        count += 1;
      }
    }
  }
  return count;
}

export function countAny(values: Arg[]): number {
  return reduceAny(values, (acc, a) => (a !== undefined && a.value !== null ? acc + 1 : acc), 0);
}

export function max(values: Arg[], locale: Locale) {
  const result = reduceNumbers(values, (acc, a) => (acc < a ? a : acc), -Infinity, locale);
  return result === -Infinity ? 0 : result;
}

export function min(values: Arg[], locale: Locale): number {
  const result = reduceNumbers(values, (acc, a) => (a < acc ? a : acc), Infinity, locale);
  return result === Infinity ? 0 : result;
}

function prepareDataForRegression(X: Matrix<number>, Y: Matrix<number>, newX: Matrix<number>) {
  const _X = X[0].length ? X : [range(1, Y.flat().length + 1)];
  const nVar = _X.length;
  let _newX = newX[0].length ? newX : _X;
  _newX = _newX.length === nVar ? transposeMatrix(_newX) : _newX;
  return { _X, _newX };
}

/*
 * This function performs a linear regression on the data set. It returns an array with two elements.
 * The first element is the slope, and the second element is the intercept.
 * The linear regression line is: y = slope*x + intercept
 * The function use the least squares method to find the best fit for the data set :
 * see https://www.mathsisfun.com/data/least-squares-regression.html
 *     https://www.statology.org/standard-error-of-estimate/
 *     https://agronomy4future.org/?p=16670
 *     https://vitalflux.com/interpreting-f-statistics-in-linear-regression-formula-examples/
 *     https://web.ist.utl.pt/~ist11038/compute/errtheory/,regression/regrthroughorigin.pdf
 */

export function fullLinearRegression(
  X: Matrix<number>,
  Y: Matrix<number>,
  computeIntercept = true,
  verbose: boolean = false
) {
  const y = Y.flat();
  const n = y.length;
  let { _X } = prepareDataForRegression(X, Y, [[]]);
  _X = _X.length === n ? transposeMatrix(_X) : _X.slice();
  assertSameNumberOfElements(_X[0], y);
  const nVar = _X.length;
  const nDeg = n - nVar - (computeIntercept ? 1 : 0);
  const yMatrix = [y];
  const xMatrix: Matrix<number> = transposeMatrix(_X.reverse());
  let avgX: number[] = [];
  for (let i = 0; i < nVar; i++) {
    avgX.push(0);
    if (computeIntercept) {
      for (const xij of _X[i]) {
        avgX[i] += xij;
      }
      avgX[i] /= n;
    }
  }
  let avgY = 0;
  if (computeIntercept) {
    for (const yi of y) {
      avgY += yi;
    }
    avgY /= n;
  }
  const redX: Matrix<number> = xMatrix.map((row) => row.map((value, i) => value - avgX[i]));
  if (computeIntercept) {
    xMatrix.forEach((row) => row.push(1));
  }
  const coeffs = getLMSCoefficients(xMatrix, yMatrix);
  if (!computeIntercept) {
    coeffs.push([0]);
  }
  if (!verbose) {
    return coeffs;
  }
  const dot1 = multiplyMatrices(redX, transposeMatrix(redX));
  const { inverted: dotInv } = invertMatrix(dot1);
  if (dotInv === undefined) {
    throw new EvaluationError(_t("Matrix is not invertible"));
  }
  let SSE = 0,
    SSR = 0;
  for (let i = 0; i < n; i++) {
    const yi = y[i] - avgY;
    let temp = 0;
    for (let j = 0; j < nVar; j++) {
      const xi = redX[i][j];
      temp += xi * coeffs[j][0];
    }
    const ei = yi - temp;
    SSE += ei * ei;
    SSR += temp * temp;
  }
  const RMSE = Math.sqrt(SSE / nDeg);
  const r2 = SSR / (SSR + SSE);
  const f_stat = SSR / nVar / (SSE / nDeg);
  const deltaCoeffs: number[] = [];
  for (let i = 0; i < nVar; i++) {
    deltaCoeffs.push(RMSE * Math.sqrt(dotInv[i][i]));
  }
  if (computeIntercept) {
    const dot2 = multiplyMatrices(dotInv, [avgX]);
    const dot3 = multiplyMatrices(transposeMatrix([avgX]), dot2);
    deltaCoeffs.push(RMSE * Math.sqrt(dot3[0][0] + 1 / y.length));
  }
  const returned: (number | string)[][] = [
    [coeffs[0][0], deltaCoeffs[0], r2, f_stat, SSR],
    [coeffs[1][0], deltaCoeffs[1], RMSE, nDeg, SSE],
  ];
  for (let i = 2; i < nVar; i++) {
    returned.push([coeffs[i][0], deltaCoeffs[i], "", "", ""]);
  }
  if (computeIntercept) {
    returned.push([coeffs[nVar][0], deltaCoeffs[nVar], "", "", ""]);
  } else {
    returned.push([0, "", "", "", ""]);
  }
  return returned;
}

/*
  This function performs a polynomial regression on the data set. It returns the coefficients of
  the polynomial function that best fits the data set.
  The polynomial function is: y = c0 + c1*x + c2*x^2 + ... + cn*x^n, where n is the order (degree)
  of the polynomial. The returned coefficients are then in the form: [c0, c1, c2, ..., cn]
  The function is based on the method of least squares :
  see: https://mathworld.wolfram.com/LeastSquaresFittingPolynomial.html
*/
export function polynomialRegression(
  flatY: number[],
  flatX: number[],
  order: number,
  intercept: boolean
): Matrix<number> {
  assertSameNumberOfElements(flatX, flatY);
  assert(
    () => order >= 1,
    _t("Function [[FUNCTION_NAME]] A regression of order less than 1 cannot be possible.")
  );

  const yMatrix = [flatY];
  const xMatrix: Matrix<number> = flatX.map((x) =>
    range(0, order).map((i) => Math.pow(x, order - i))
  );
  if (intercept) {
    xMatrix.forEach((row) => row.push(1));
  }

  const coeffs = getLMSCoefficients(xMatrix, yMatrix);
  if (!intercept) {
    coeffs.push([0]);
  }
  return coeffs;
}

function getLMSCoefficients(xMatrix: Matrix<number>, yMatrix: Matrix<number>): Matrix<number> {
  const xMatrixT = transposeMatrix(xMatrix);
  const dot1 = multiplyMatrices(xMatrix, xMatrixT);
  const { inverted: dotInv } = invertMatrix(dot1);
  if (dotInv === undefined) {
    throw new EvaluationError(_t("Matrix is not invertible"));
  }
  const dot2 = multiplyMatrices(xMatrix, yMatrix);
  return transposeMatrix(multiplyMatrices(dotInv, dot2));
}

export function evaluatePolynomial(coeffs: number[], x: number, order: number): number {
  return coeffs.reduce((acc, coeff, i) => acc + coeff * Math.pow(x, order - i), 0);
}

export function expM(M: Matrix<number>): Matrix<number> {
  return M.map((col) => col.map((cell) => Math.exp(cell)));
}

export function logM(M: Matrix<number>): Matrix<number> {
  return M.map((col) => col.map((cell) => Math.log(cell)));
}

export function predictLinearValues(
  Y: Matrix<number>,
  X: Matrix<number>,
  newX: Matrix<number>,
  computeIntercept: boolean
): Matrix<number> {
  const { _X, _newX } = prepareDataForRegression(X, Y, newX);
  const coeffs = fullLinearRegression(_X, Y, computeIntercept, false);
  const nVar = coeffs.length - 1;
  const newY = _newX.map((col) => {
    let value = 0;
    for (let i = 0; i < nVar; i++) {
      value += (coeffs[i][0] as number) * col[nVar - i - 1];
    }
    value += coeffs[nVar][0] as number;
    return [value];
  });
  return newY.length === newX.length ? newY : transposeMatrix(newY);
}
