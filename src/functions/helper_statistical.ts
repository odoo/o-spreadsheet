import { Point } from "chart.js";
import { DEFAULT_WINDOW_SIZE } from "../constants";
import { parseDateTime } from "../helpers/dates";
import { range } from "../helpers/misc";
import { isNumber } from "../helpers/numbers";
import { _t } from "../translation";
import { EvaluationError } from "../types/errors";
import { Locale } from "../types/locale";
import { Arg, isMatrix, Matrix } from "../types/misc";
import { assert, assertNotZero } from "./helper_assert";
import { invertMatrix, multiplyMatrices } from "./helper_matrices";
import {
  isEvaluationError,
  reduceAny,
  reduceNumbers,
  transposeMatrix,
  visitNumbers,
} from "./helpers";

export function assertSameNumberOfElements(...args: any[][]) {
  const dims = args[0].length;
  args.forEach((arg, i) =>
    assert(
      arg.length === dims,
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

export function median(values: Arg[], locale: Locale) {
  const nums: number[] = [];
  visitNumbers(
    values,
    (a) => {
      nums.push(a.value);
    },
    locale
  );
  nums.sort((a, b) => a - b);
  const len = nums.length;
  if (len === 0) {
    return undefined;
  }
  const mid = Math.floor(len / 2);
  if (len % 2 === 0) {
    return (nums[mid - 1] + nums[mid]) / 2;
  } else {
    return nums[mid];
  }
}

export function countNumbers(values: Arg[], locale: Locale) {
  let count = 0;
  for (const n of values) {
    if (isMatrix(n)) {
      for (const i of n) {
        for (const j of i) {
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
  let max = { value: -Infinity };
  visitNumbers(
    values,
    (a) => {
      if (a.value >= max.value) {
        max = a;
      }
    },
    locale
  );
  return max.value === -Infinity ? { value: 0 } : max;
}

export function min(values: Arg[], locale: Locale) {
  let min = { value: Infinity };
  visitNumbers(
    values,
    (a) => {
      if (a.value <= min.value) {
        min = a;
      }
    },
    locale
  );
  return min.value === Infinity ? { value: 0 } : min;
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
  const avgX: number[] = [];
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
    order >= 1,
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

export function getMovingAverageValues(
  dataset: number[],
  labels: number[],
  windowSize = DEFAULT_WINDOW_SIZE
): Point[] {
  const values: Point[] = [];
  // Fill the starting values with null until we have a full window
  for (let i = 0; i < windowSize - 1; i++) {
    values.push({ x: labels[i], y: NaN });
  }
  for (let i = 0; i <= dataset.length - windowSize; i++) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      sum += dataset[j];
    }
    values.push({ x: labels[i + windowSize - 1], y: sum / windowSize });
  }
  return values;
}

// Lanczos approximation of the log-gamma function. The implemented approximation uses g=7 and the
// partial fraction coefficients for he A_g function. The p values are the ones computed by P. Godfrey
// in 2001. See https://en.wikipedia.org/wiki/Lanczos_approximation
export function lnGamma(z: number): number {
  const g = 7;
  const coeffs = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = coeffs[0];
  for (let i = 1; i <= g + 1; i++) {
    x += coeffs[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Upper regularized incomplete gamma Q(a, x) = 1 - P(a, x) — used by CHISQ.DIST.RT
// See Numerical Recipes, section 6.2
export function regularizedGammaUpper(a: number, x: number): number {
  if (x <= 0) {
    return 1;
  }
  if (x < a + 1) {
    // Use series expansion for better convergence when x is small compared to a
    let term = 1 / a,
      sum = term;
    for (let n = 1; n < 300; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-15 * sum) {
        break;
      }
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // Use continued fraction expansion for better convergence when x is large compared to a
  const fpMin = 1e-300;
  let b = x + 1 - a,
    c = 1 / fpMin,
    d = 1 / b,
    h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < fpMin) {
      d = fpMin;
    }
    c = b + an / c;
    if (Math.abs(c) < fpMin) {
      c = fpMin;
    }
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) {
      break;
    }
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

// Regularized incomplete beta I_x(a, b) — used by T.TEST and F.TEST
// See Numerical Recipes, section 6.4
export function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) {
    return 0;
  } else if (x >= 1) {
    return 1;
  }
  const lbeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta);
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaContinuedFraction(x, a, b)) / a;
  } else {
    return 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
  }
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const fpMin = 1e-300,
    eps = 3e-12;
  const qab = a + b,
    qap = a + 1,
    qam = a - 1;
  let c = 1,
    d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpMin) {
    d = fpMin;
  }
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) {
      d = fpMin;
    }
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) {
      c = fpMin;
    }
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) {
      d = fpMin;
    }
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) {
      c = fpMin;
    }
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) {
      break;
    }
  }
  return h;
}

// Inverse normal CDF (Acklam's rational approximation) — used by CONFIDENCE.NORM
// See https://stackedboxes.org/2017/05/01/acklams-normal-quantile-function/
export function normInv(p: number): number {
  if (p <= 0) {
    return -Infinity;
  } else if (p >= 1) {
    return Infinity;
  }
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425,
    pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5,
      r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

// Two-tailed p-value of t-distribution: I_{df/(df+t²)}(df/2, 1/2)
export function tDistTwoTail(t: number, df: number): number {
  return regularizedBeta(df / (df + t * t), df / 2, 0.5);
}

// Critical value for two-tailed t-test at given alpha and df (bisection on tDistTwoTail)
export function tInv2T(alpha: number, df: number): number {
  let lo = 0,
    hi = 1e9;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tDistTwoTail(mid, df) > alpha) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
