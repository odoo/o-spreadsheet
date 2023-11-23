import { range } from "../helpers";
import { percentile } from "../helpers/index";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgValue,
  CellValue,
  Locale,
  Matrix,
  Maybe,
  FPayload,
  isMatrix,
} from "../types";
import { NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import { invertMatrix, multiplyMatrices } from "./helper_matrices";
import {
  assertSameNumberOfElements,
  average,
  countAny,
  countNumbers,
  max,
  min,
} from "./helper_statistical";
import {
  assert,
  dichotomicSearch,
  matrixMap,
  reduceNumbers,
  reduceNumbersTextAs0,
  toBoolean,
  toMatrix,
  toNumber,
  transposeMatrix,
  tryCastAsNumberMatrix,
  visitAny,
  visitMatchingRanges,
  visitNumbers,
} from "./helpers";

function filterAndFlatData(
  dataY: ArgValue,
  dataX: ArgValue
): { flatDataY: number[]; flatDataX: number[] } {
  const _flatDataY: Maybe<CellValue>[] = [];
  const _flatDataX: Maybe<CellValue>[] = [];
  let lenY = 0;
  let lenX = 0;

  visitAny([dataY], (y) => {
    _flatDataY.push(y);
    lenY += 1;
  });

  visitAny([dataX], (x) => {
    _flatDataX.push(x);
    lenX += 1;
  });

  assert(
    () => lenY === lenX,
    _t("[[FUNCTION_NAME]] has mismatched argument count %s vs %s.", lenY, lenX)
  );
  const flatDataX: number[] = [];
  const flatDataY: number[] = [];
  for (let i = 0; i < lenY; i++) {
    const valueY = _flatDataY[i];
    const valueX = _flatDataX[i];
    if (typeof valueY === "number" && typeof valueX === "number") {
      flatDataY.push(valueY);
      flatDataX.push(valueX);
    }
    if (valueY instanceof Error) {
      throw valueY;
    }
    if (valueX instanceof Error) {
      throw valueX;
    }
  }
  return { flatDataX, flatDataY };
}

// Note: dataY and dataX may not have the same dimension
function covariance(dataY: ArgValue, dataX: ArgValue, isSample: boolean): number {
  const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
  const count = flatDataY.length;

  assert(
    () => count !== 0 && (!isSample || count !== 1),
    _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
  );

  let sumY = 0;
  let sumX = 0;
  for (let i = 0; i < count; i++) {
    sumY += flatDataY[i];
    sumX += flatDataX[i];
  }

  const averageY = sumY / count;
  const averageX = sumX / count;

  let acc = 0;
  for (let i = 0; i < count; i++) {
    acc += (flatDataY[i] - averageY) * (flatDataX[i] - averageX);
  }

  return acc / (count - (isSample ? 1 : 0));
}

function variance(args: ArgValue[], isSample: boolean, textAs0: boolean, locale: Locale): number {
  let count = 0;
  let sum = 0;
  const reduceFunction = textAs0 ? reduceNumbersTextAs0 : reduceNumbers;

  sum = reduceFunction(
    args,
    (acc, a) => {
      count += 1;
      return acc + a;
    },
    0,
    locale
  );

  assert(
    () => count !== 0 && (!isSample || count !== 1),
    _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
  );

  const average = sum / count;
  return (
    reduceFunction(args, (acc, a) => acc + Math.pow(a - average, 2), 0, locale) /
    (count - (isSample ? 1 : 0))
  );
}

function centile(
  data: ArgValue[],
  percent: Maybe<CellValue>,
  isInclusive: boolean,
  locale: Locale
): number {
  const _percent = toNumber(percent, locale);
  assert(
    () => (isInclusive ? 0 <= _percent && _percent <= 1 : 0 < _percent && _percent < 1),
    _t("Function [[FUNCTION_NAME]] parameter 2 value is out of range.")
  );
  let sortedArray: number[] = [];
  let index: number;
  let count = 0;
  visitAny(data, (d) => {
    if (typeof d === "number") {
      index = dichotomicSearch(
        sortedArray,
        d,
        "nextSmaller",
        "asc",
        sortedArray.length,
        (array, i) => array[i]
      );
      sortedArray.splice(index + 1, 0, d);
      count++;
    }
    if (d instanceof Error) {
      throw d;
    }
  });
  assert(() => count !== 0, _t("[[FUNCTION_NAME]] has no valid input data."));

  if (!isInclusive) {
    // 2nd argument must be between 1/(n+1) and n/(n+1) with n the number of data
    assert(
      () => 1 / (count + 1) <= _percent && _percent <= count / (count + 1),
      _t("Function [[FUNCTION_NAME]] parameter 2 value is out of range.")
    );
  }

  return percentile(sortedArray, _percent, isInclusive);
}

function prepareDataForRegression(X: Matrix<number>, Y: Matrix<number>, newX: Matrix<number>) {
  const _X = X.length ? X : [range(1, Y.flat().length + 1)];
  const nVar = _X.length;
  let _newX = newX.length ? newX : _X;
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

function fullLinearRegression(
  X: Matrix<number>,
  Y: Matrix<number>,
  computeIntercept = true,
  verbose: boolean = false
) {
  const y = Y.flat();
  const n = y.length;
  let { _X } = prepareDataForRegression(X, Y, []);
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
    throw new Error(_t("Matrix is not invertible"));
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
function polynomialRegression(
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
    throw new Error(_t("Matrix is not invertible"));
  }
  const dot2 = multiplyMatrices(xMatrix, yMatrix);
  return transposeMatrix(multiplyMatrices(dotInv, dot2));
}

function evaluatePolynomial(coeffs: number[], x: number, order: number): number {
  return coeffs.reduce((acc, coeff, i) => acc + coeff * Math.pow(x, order - i), 0);
}

function expM(M: Matrix<number>): Matrix<number> {
  return M.map((col) => col.map((cell) => Math.exp(cell)));
}

function logM(M: Matrix<number>): Matrix<number> {
  return M.map((col) => col.map((cell) => Math.log(cell)));
}

function predictLinearValues(
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

// -----------------------------------------------------------------------------
// AVEDEV
// -----------------------------------------------------------------------------
export const AVEDEV = {
  description: _t("Average magnitude of deviations from mean."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the sample.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the sample.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    let count = 0;
    const sum = reduceNumbers(
      values,
      (acc, a) => {
        count += 1;
        return acc + a;
      },
      0,
      this.locale
    );
    assert(
      () => count !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );
    const average = sum / count;
    return reduceNumbers(values, (acc, a) => acc + Math.abs(average - a), 0, this.locale) / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGE
// -----------------------------------------------------------------------------
export const AVERAGE = {
  description: _t("Numerical average value in a dataset, ignoring text."),
  args: [
    arg(
      "value1 (number, range<number>)",
      _t("The first value or range to consider when calculating the average value.")
    ),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to consider when calculating the average value.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return isMatrix(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    return average(values, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGE.WEIGHTED
// -----------------------------------------------------------------------------
const rangeError = _t("[[FUNCTION_NAME]] has mismatched range sizes.");
const negativeWeightError = _t(
  "[[FUNCTION_NAME]] expects the weight to be positive or equal to 0."
);

export const AVERAGE_WEIGHTED = {
  description: _t("Weighted average."),
  args: [
    arg("values (number, range<number>)", _t("Values to average.")),
    arg("weights (number, range<number>)", _t("Weights for each corresponding value.")),
    arg(
      "additional_values (number, range<number>, repeating)",
      _t("Additional values to average.")
    ),
    arg("additional_weights (number, range<number>, repeating)", _t("Additional weights.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (values: Arg) => {
    return isMatrix(values) ? values[0][0]?.format : values?.format;
  },
  compute: function (...values: ArgValue[]): number {
    let sum = 0;
    let count = 0;
    let value;
    let weight;
    assert(
      () => values.length % 2 === 0,
      _t("Wrong number of Argument[]. Expected an even number of Argument[].")
    );
    for (let n = 0; n < values.length - 1; n += 2) {
      value = values[n];
      weight = values[n + 1];
      // if (typeof value != typeof weight) {
      //   throw new Error(rangeError);
      // }
      if (isMatrix(value)) {
        assert(() => isMatrix(weight), rangeError);

        let dimColValue = value.length;
        let dimLinValue = value[0].length;
        assert(() => dimColValue === weight.length && dimLinValue === weight[0].length, rangeError);

        for (let i = 0; i < dimColValue; i++) {
          for (let j = 0; j < dimLinValue; j++) {
            let subValue = value[i][j];
            let subWeight = weight[i][j];
            let subValueIsNumber = typeof subValue === "number";
            let subWeightIsNumber = typeof subWeight === "number";
            // typeof subValue or subWeight can be 'number' or 'undefined'
            assert(
              () => subValueIsNumber === subWeightIsNumber,
              _t("[[FUNCTION_NAME]] expects number values.")
            );

            if (subWeightIsNumber) {
              assert(() => subWeight >= 0, negativeWeightError);

              sum += subValue * subWeight;
              count += subWeight;
            }
          }
        }
      } else {
        weight = toNumber(weight, this.locale);
        value = toNumber(value, this.locale);
        assert(() => weight >= 0, negativeWeightError);

        sum += value * weight;
        count += weight;
      }
    }

    assert(
      () => count !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );

    return sum / count;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGEA
// -----------------------------------------------------------------------------
export const AVERAGEA = {
  description: _t("Numerical average value in a dataset."),
  args: [
    arg(
      "value1 (number, range<number>)",
      _t("The first value or range to consider when calculating the average value.")
    ),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to consider when calculating the average value.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return isMatrix(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    let count = 0;
    const sum = reduceNumbersTextAs0(
      values,
      (acc, a) => {
        count += 1;
        return acc + a;
      },
      0,
      this.locale
    );
    assert(
      () => count !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );
    return sum / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGEIF
// -----------------------------------------------------------------------------
export const AVERAGEIF = {
  description: _t("Average of values depending on criteria."),
  args: [
    arg("criteria_range (number, range<number>)", _t("The range to check against criterion.")),
    arg("criterion (string)", _t("The pattern or test to apply to criteria_range.")),
    arg(
      "average_range (number, range<number>, default=criteria_range)",
      _t("The range to average. If not included, criteria_range is used for the average instead.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    criteriaRange: ArgValue,
    criterion: Maybe<CellValue>,
    averageRange: ArgValue
  ): number {
    const _criteriaRange = toMatrix(criteriaRange);
    const _averageRange = averageRange === undefined ? _criteriaRange : toMatrix(averageRange);

    let count = 0;
    let sum = 0;

    visitMatchingRanges(
      [criteriaRange, criterion],
      (i, j) => {
        const value = _averageRange[i][j];
        if (typeof value === "number") {
          count += 1;
          sum += value;
        }
      },
      this.locale
    );

    assert(
      () => count !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );

    return sum / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGEIFS
// -----------------------------------------------------------------------------
export const AVERAGEIFS = {
  description: _t("Average of values depending on multiple criteria."),
  args: [
    arg("average_range (range)", _t("The range to average.")),
    arg("criteria_range1 (range)", _t("The range to check against criterion1.")),
    arg("criterion1 (string)", _t("The pattern or test to apply to criteria_range1.")),
    arg(
      "criteria_range2 (any, range, repeating)",
      _t("Additional criteria_range and criterion to check.")
    ),
    arg("criterion2 (string, repeating)", _t("The pattern or test to apply to criteria_range2.")),
  ],
  returns: ["NUMBER"],
  compute: function (averageRange: Matrix<CellValue>, ...values: ArgValue[]): number {
    const _averageRange = toMatrix(averageRange);
    let count = 0;
    let sum = 0;
    visitMatchingRanges(
      values,
      (i, j) => {
        const value = _averageRange[i][j];
        if (typeof value === "number") {
          count += 1;
          sum += value;
        }
      },
      this.locale
    );
    assert(
      () => count !== 0,
      _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
    );
    return sum / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNT
// -----------------------------------------------------------------------------
export const COUNT = {
  description: _t("The number of numeric values in dataset."),
  args: [
    arg(
      "value1 (number, range<number>)",
      _t("The first value or range to consider when counting.")
    ),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to consider when counting.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return countNumbers(values, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNTA
// -----------------------------------------------------------------------------
export const COUNTA = {
  description: _t("The number of values in a dataset."),
  args: [
    arg("value1 (any, range)", _t("The first value or range to consider when counting.")),
    arg(
      "value2 (any, range, repeating)",
      _t("Additional values or ranges to consider when counting.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return countAny(values);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COVAR
// -----------------------------------------------------------------------------

// Note: Unlike the VAR function which corresponds to the variance over a sample (VAR.S),
// the COVAR function corresponds to the covariance over an entire population (COVAR.P)
export const COVAR = {
  description: _t("The covariance of a dataset."),
  args: [
    arg("data_y (any, range)", _t("The range representing the array or matrix of dependent data.")),
    arg(
      "data_x (any, range)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataY: ArgValue, dataX: ArgValue): number {
    return covariance(dataY, dataX, false);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COVARIANCE.P
// -----------------------------------------------------------------------------
export const COVARIANCE_P = {
  description: _t("The covariance of a dataset."),
  args: [
    arg("data_y (any, range)", _t("The range representing the array or matrix of dependent data.")),
    arg(
      "data_x (any, range)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataY: ArgValue, dataX: ArgValue): number {
    return covariance(dataY, dataX, false);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COVARIANCE.S
// -----------------------------------------------------------------------------
export const COVARIANCE_S = {
  description: _t("The sample covariance of a dataset."),
  args: [
    arg("data_y (any, range)", _t("The range representing the array or matrix of dependent data.")),
    arg(
      "data_x (any, range)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataY: ArgValue, dataX: ArgValue): number {
    return covariance(dataY, dataX, true);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FORECAST
// -----------------------------------------------------------------------------
export const FORECAST: AddFunctionDescription = {
  description: _t(
    "Calculates the expected y-value for a specified x based on a linear regression of a dataset."
  ),
  args: [
    arg("x (number, range<number>)", _t("The value(s) on the x-axis to forecast.")),
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    x: ArgValue,
    dataY: Matrix<CellValue>,
    dataX: Matrix<CellValue>
  ): number | Matrix<number> {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    return predictLinearValues(
      [flatDataY],
      [flatDataX],
      matrixMap(toMatrix(x), (value) => toNumber(value, this.locale)),
      true
    );
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// GROWTH
// -----------------------------------------------------------------------------
export const GROWTH: AddFunctionDescription = {
  description: _t("Fits points to exponential growth trend."),
  args: [
    arg(
      "known_data_y (range<number>)",
      _t(
        "The array or range containing dependent (y) values that are already known, used to curve fit an ideal exponential growth curve."
      )
    ),
    arg(
      "known_data_x (range<number>, default={1;2;3;...})",
      _t("The values of the independent variable(s) corresponding with known_data_y.")
    ),
    arg(
      "new_data_x (any, range, default=known_data_x)",
      _t("The data points to return the y values for on the ideal curve fit.")
    ),
    arg(
      "b (boolean, default=TRUE)",
      _t(
        "Given a general exponential form of y = b*m^x for a curve fit, calculates b if TRUE or forces b to be 1 and only calculates the m values if FALSE."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    knownDataY: Matrix<CellValue>,
    knownDataX: Matrix<CellValue> = [],
    newDataX: Matrix<CellValue> = [],
    b: Maybe<CellValue> = true
  ): Matrix<number> {
    return expM(
      predictLinearValues(
        logM(tryCastAsNumberMatrix(knownDataY, "the first argument (known_data_y)")),
        tryCastAsNumberMatrix(knownDataX, "the second argument (known_data_x)"),
        tryCastAsNumberMatrix(newDataX, "the third argument (new_data_y)"),
        toBoolean(b)
      )
    );
  },
};

// -----------------------------------------------------------------------------
// INTERCEPT
// -----------------------------------------------------------------------------
export const INTERCEPT: AddFunctionDescription = {
  description: _t("Compute the intercept of the linear regression."),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataY: Matrix<CellValue>, dataX: Matrix<CellValue>): number {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    const [[], [intercept]] = fullLinearRegression([flatDataX], [flatDataY]);
    return intercept as number;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LARGE
// -----------------------------------------------------------------------------
export const LARGE = {
  description: _t("Nth largest element from a data set."),
  args: [
    arg("data (any, range)", _t("Array or range containing the dataset to consider.")),
    arg("n (number)", _t("The rank from largest to smallest of the element to return.")),
  ],
  returns: ["NUMBER"],
  computeValueAndFormat: function (data: Arg, n: Maybe<FPayload>): FPayload {
    const _n = Math.trunc(toNumber(n?.value, this.locale));
    let largests: FPayload[] = [];
    let index: number;
    let count = 0;
    visitAny([data], (d) => {
      if (typeof d.value === "number") {
        index = dichotomicSearch(
          largests,
          d.value,
          "nextSmaller",
          "asc",
          largests.length,
          (array, i) => array[i].value
        );
        largests.splice(index + 1, 0, d);
        count++;
        if (count > _n) {
          largests.shift();
          count--;
        }
      }
      if (d.value instanceof Error) {
        throw d.value;
      }
    });
    const result = largests.shift();
    assert(() => result !== undefined, _t("[[FUNCTION_NAME]] has no valid input data."));
    assert(
      () => count >= _n,
      _t("Function [[FUNCTION_NAME]] parameter 2 value (%s) is out of range.", _n)
    );
    return result!;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LINEST
// -----------------------------------------------------------------------------
export const LINEST: AddFunctionDescription = {
  description: _t("Compute the intercept of the linear regression."),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>, default={1;2;3;...})",
      _t("The range representing the array or matrix of independent data.")
    ),
    arg(
      "calculate_b (boolean, default=TRUE)",
      _t("A flag specifying wheter to compute the slope or not")
    ),
    arg(
      "verbose (boolean, default=FALSE)",
      _t(
        "A flag specifying whether to return additional regression statistics or only the linear coefficients and the y-intercept"
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    dataY: Matrix<CellValue>,
    dataX: Matrix<CellValue> = [],
    calculateB: Maybe<CellValue> = true,
    verbose: Maybe<CellValue> = false
  ): (number | string)[][] {
    return fullLinearRegression(
      tryCastAsNumberMatrix(dataX, "the first argument (data_y)"),
      tryCastAsNumberMatrix(dataY, "the second argument (data_x)"),
      toBoolean(calculateB),
      toBoolean(verbose)
    );
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LOGEST
// -----------------------------------------------------------------------------
export const LOGEST: AddFunctionDescription = {
  description: _t("Compute the intercept of the linear regression."),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>, optional, default={1;2;3;...})",
      _t("The range representing the array or matrix of independent data.")
    ),
    arg(
      "calculate_b (boolean, default=TRUE)",
      _t("A flag specifying wheter to compute the slope or not")
    ),
    arg(
      "verbose (boolean, default=FALSE)",
      _t(
        "A flag specifying whether to return additional regression statistics or only the linear coefficients and the y-intercept"
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    dataY: Matrix<CellValue>,
    dataX: Matrix<CellValue> = [],
    calculateB: Maybe<CellValue> = true,
    verbose: Maybe<CellValue> = false
  ): (number | string)[][] {
    const coeffs = fullLinearRegression(
      tryCastAsNumberMatrix(dataX, "the second argument (data_x)"),
      logM(tryCastAsNumberMatrix(dataY, "the first argument (data_y)")),
      toBoolean(calculateB),
      toBoolean(verbose)
    );
    for (let i = 0; i < coeffs.length; i++) {
      coeffs[i][0] = Math.exp(coeffs[i][0] as number);
    }
    return coeffs;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MATTHEWS
// -----------------------------------------------------------------------------
export const MATTHEWS: AddFunctionDescription = {
  description: _t("Compute the Matthews correlation coefficient of a dataset."),
  args: [
    arg("data_x (range)", _t("The range representing the array or matrix of observed data.")),
    arg("data_y (range)", _t("The range representing the array or matrix of predicted data.")),
  ],
  returns: ["NUMBER"],
  compute: function (dataX: Matrix<CellValue>, dataY: Matrix<CellValue>): number {
    const flatX = dataX.flat();
    const flatY = dataY.flat();
    assertSameNumberOfElements(flatX, flatY);
    if (flatX.length === 0) {
      throw new Error(_t("[[FUNCTION_NAME]] expects non-empty ranges for both parameters."));
    }
    const n = flatX.length;

    let trueN = 0,
      trueP = 0,
      falseP = 0,
      falseN = 0;
    for (let i = 0; i < n; ++i) {
      const isTrue1 = toBoolean(flatX[i]);
      const isTrue2 = toBoolean(flatY[i]);
      if (isTrue1 === isTrue2) {
        if (isTrue1) {
          trueP++;
        } else {
          trueN++;
        }
      } else {
        if (isTrue1) {
          falseN++;
        } else {
          falseP++;
        }
      }
    }
    return (
      (trueP * trueN - falseP * falseN) /
      Math.sqrt((trueP + falseP) * (trueP + falseN) * (trueN + falseP) * (trueN + falseN))
    );
  },
  isExported: false,
};

// -----------------------------------------------------------------------------
// MAX
// -----------------------------------------------------------------------------
export const MAX = {
  description: _t("Maximum value in a numeric dataset."),
  args: [
    arg(
      "value1 (number, range<number>)",
      _t("The first value or range to consider when calculating the maximum value.")
    ),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to consider when calculating the maximum value.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return isMatrix(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    return max(values, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MAXA
// -----------------------------------------------------------------------------
export const MAXA = {
  description: _t("Maximum numeric value in a dataset."),
  args: [
    arg(
      "value1 (any, range)",
      _t("The first value or range to consider when calculating the maximum value.")
    ),
    arg(
      "value2 (any, range, repeating)",
      _t("Additional values or ranges to consider when calculating the maximum value.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return isMatrix(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    const maxa = reduceNumbersTextAs0(
      values,
      (acc, a) => {
        return Math.max(a, acc);
      },
      -Infinity,
      this.locale
    );
    return maxa === -Infinity ? 0 : maxa;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MAXIFS
// -----------------------------------------------------------------------------
export const MAXIFS = {
  description: _t("Returns the maximum value in a range of cells, filtered by a set of criteria."),
  args: [
    arg("range (range)", _t("The range of cells from which the maximum will be determined.")),
    arg("criteria_range1 (range)", _t("The range of cells over which to evaluate criterion1.")),
    arg(
      "criterion1 (string)",
      _t(
        "The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set."
      )
    ),
    arg(
      "criteria_range2 (any, range, repeating)",
      _t(
        "Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair."
      )
    ),
    arg("criterion2 (string, repeating)", _t("The pattern or test to apply to criteria_range2.")),
  ],
  returns: ["NUMBER"],
  compute: function (range: Matrix<CellValue>, ...args: ArgValue[]): number {
    let result = -Infinity;
    const _range = toMatrix(range);
    visitMatchingRanges(
      args,
      (i, j) => {
        const value = _range[i][j];
        if (typeof value === "number") {
          result = result < value ? value : result;
        }
      },
      this.locale
    );
    return result === -Infinity ? 0 : result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MEDIAN
// -----------------------------------------------------------------------------
export const MEDIAN = {
  description: _t("Median value in a numeric dataset."),
  args: [
    arg(
      "value1 (any, range)",
      _t("The first value or range to consider when calculating the median value.")
    ),
    arg(
      "value2 (any, range, repeating)",
      _t("Additional values or ranges to consider when calculating the median value.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return isMatrix(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    let data: ArgValue[] = [];
    visitNumbers(
      values,
      (arg) => {
        data.push(arg);
      },
      this.locale
    );
    return centile(data, 0.5, true, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MIN
// -----------------------------------------------------------------------------
export const MIN = {
  description: _t("Minimum value in a numeric dataset."),
  args: [
    arg(
      "value1 (number, range<number>)",
      _t("The first value or range to consider when calculating the minimum value.")
    ),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to consider when calculating the minimum value.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return isMatrix(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    return min(values, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MINA
// -----------------------------------------------------------------------------
export const MINA = {
  description: _t("Minimum numeric value in a dataset."),
  args: [
    arg(
      "value1 (number, range<number>)",
      _t("The first value or range to consider when calculating the minimum value.")
    ),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to consider when calculating the minimum value.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (value1: Arg) => {
    return isMatrix(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    const mina: number = reduceNumbersTextAs0(
      values,
      (acc, a) => {
        return Math.min(a, acc);
      },
      Infinity,
      this.locale
    );
    return mina === Infinity ? 0 : mina;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MINIFS
// -----------------------------------------------------------------------------
export const MINIFS = {
  description: _t("Returns the minimum value in a range of cells, filtered by a set of criteria."),
  args: [
    arg("range (range)", _t("The range of cells from which the minimum will be determined.")),
    arg("criteria_range1 (range)", _t("The range of cells over which to evaluate criterion1.")),
    arg(
      "criterion1 (string)",
      _t(
        "The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set."
      )
    ),
    arg(
      "criteria_range2 (any, range, repeating)",
      _t(
        "Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair."
      )
    ),
    arg("criterion2 (string, repeating)", _t("The pattern or test to apply to criteria_range2.")),
  ],
  returns: ["NUMBER"],
  compute: function (range: Matrix<CellValue>, ...args: ArgValue[]): number {
    let result = Infinity;
    const _range = toMatrix(range);
    visitMatchingRanges(
      args,
      (i, j) => {
        const value = _range[i][j];
        if (typeof value === "number") {
          result = result > value ? value : result;
        }
      },
      this.locale
    );
    return result === Infinity ? 0 : result;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PEARSON
// -----------------------------------------------------------------------------
export const PEARSON: AddFunctionDescription = {
  description: _t("Compute the Pearson product-moment correlation coefficient of a dataset."),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataY: Matrix<CellValue>, dataX: Matrix<CellValue>): number {
    const { flatDataX, flatDataY } = filterAndFlatData(dataX, dataY);
    if (flatDataX.length === 0) {
      throw new Error(_t("[[FUNCTION_NAME]] expects non-empty ranges for both parameters."));
    }
    if (flatDataX.length < 2) {
      throw new Error(_t("[[FUNCTION_NAME]] needs at least two values for both parameters"));
    }
    const n = flatDataX.length;

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0,
      sumYY = 0;
    for (let i = 0; i < n; i++) {
      const xij = flatDataX[i];
      const yij = flatDataY[i];

      sumX += xij;
      sumY += yij;

      sumXY += xij * yij;
      sumXX += xij * xij;
      sumYY += yij * yij;
    }
    return (
      (n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))
    );
  },
  isExported: true,
};
// In GSheet, CORREL is just an alias to PEARSON
export const CORREL: AddFunctionDescription = PEARSON;

// -----------------------------------------------------------------------------
// PERCENTILE
// -----------------------------------------------------------------------------
export const PERCENTILE = {
  description: _t("Value at a given percentile of a dataset."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg(
      "percentile (number)",
      _t("The percentile whose value within data will be calculated and returned.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (data: Arg) => {
    return isMatrix(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, percentile: Maybe<CellValue>): number {
    return PERCENTILE_INC.compute.bind(this)(data, percentile);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PERCENTILE.EXC
// -----------------------------------------------------------------------------
export const PERCENTILE_EXC = {
  description: _t("Value at a given percentile of a dataset exclusive of 0 and 1."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg(
      "percentile (number)",
      _t(
        "The percentile, exclusive of 0 and 1, whose value within 'data' will be calculated and returned."
      )
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (data: Arg) => {
    return isMatrix(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, percentile: Maybe<CellValue>): number {
    return centile([data], percentile, false, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PERCENTILE.INC
// -----------------------------------------------------------------------------
export const PERCENTILE_INC = {
  description: _t("Value at a given percentile of a dataset."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg(
      "percentile (number)",
      _t("The percentile whose value within data will be calculated and returned.")
    ),
  ],
  returns: ["NUMBER"],
  computeFormat: (data: Arg) => {
    return isMatrix(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, percentile: Maybe<CellValue>): number {
    return centile([data], percentile, true, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// POLYFIT
// -----------------------------------------------------------------------------
export const POLYFIT_COEFFS: AddFunctionDescription = {
  description: _t("Compute the coefficients of polynomial regression of the dataset."),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
    arg("order (number)", _t("The order of the polynomial to fit the data, between 1 and 6.")),
    arg(
      "intercept (boolean, default=TRUE)",
      _t("A flag specifying whether to compute the intercept or not.")
    ),
  ],
  returns: ["RANGE<NUMBER>"],
  compute: function (
    dataY: Matrix<CellValue>,
    dataX: Matrix<CellValue>,
    order: Maybe<CellValue>,
    intercept: Maybe<CellValue> = true
  ): Matrix<number> {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    return polynomialRegression(
      flatDataY,
      flatDataX,
      toNumber(order, this.locale),
      toBoolean(intercept)
    );
  },
  isExported: false,
};

// -----------------------------------------------------------------------------
// POLYFIT.FORECAST
// -----------------------------------------------------------------------------
export const POLYFIT_FORECAST: AddFunctionDescription = {
  description: _t("Predict value by computing a polynomial regression of the dataset."),
  args: [
    arg("x (number, range<number>)", _t("The value(s) on the x-axis to forecast.")),
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
    arg("order (number)", _t("The order of the polynomial to fit the data, between 1 and 6.")),
    arg(
      "intercept (boolean, default=TRUE)",
      _t("A flag specifying whether to compute the intercept or not.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    x: ArgValue,
    dataY: Matrix<CellValue>,
    dataX: Matrix<CellValue>,
    order: Maybe<CellValue>,
    intercept: Maybe<CellValue> = true
  ): number | Matrix<number> {
    const _order = toNumber(order, this.locale);
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    const coeffs = polynomialRegression(flatDataY, flatDataX, _order, toBoolean(intercept)).flat();
    return matrixMap(toMatrix(x), (xij) =>
      evaluatePolynomial(coeffs, toNumber(xij, this.locale), _order)
    );
  },
  isExported: false,
};

// -----------------------------------------------------------------------------
// QUARTILE
// -----------------------------------------------------------------------------
export const QUARTILE = {
  description: _t("Value nearest to a specific quartile of a dataset."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg("quartile_number (number)", _t("Which quartile value to return.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (data: Arg) => {
    return isMatrix(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, quartileNumber: Maybe<CellValue>): number {
    return QUARTILE_INC.compute.bind(this)(data, quartileNumber);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// QUARTILE.EXC
// -----------------------------------------------------------------------------
export const QUARTILE_EXC = {
  description: _t("Value nearest to a specific quartile of a dataset exclusive of 0 and 4."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg("quartile_number (number)", _t("Which quartile value, exclusive of 0 and 4, to return.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (data: Arg) => {
    return isMatrix(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, quartileNumber: Maybe<CellValue>): number {
    const _quartileNumber = Math.trunc(toNumber(quartileNumber, this.locale));
    return centile([data], 0.25 * _quartileNumber, false, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// QUARTILE.INC
// -----------------------------------------------------------------------------
export const QUARTILE_INC = {
  description: _t("Value nearest to a specific quartile of a dataset."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg("quartile_number (number)", _t("Which quartile value to return.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (data: Arg) => {
    return isMatrix(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, quartileNumber: Maybe<CellValue>): number {
    const _quartileNumber = Math.trunc(toNumber(quartileNumber, this.locale));
    return centile([data], 0.25 * _quartileNumber, true, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// RANK
// -----------------------------------------------------------------------------
export const RANK: AddFunctionDescription = {
  description: _t("Returns the rank of a specified value in a dataset."),
  args: [
    arg("value (number)", _t("The value whose rank will be determined.")),
    arg("data (range)", _t("The range containing the dataset to consider.")),
    arg(
      "is_ascending (boolean, default=FALSE)",
      _t("Whether to consider the values in data in descending or ascending order.")
    ),
  ],
  returns: ["ANY"],
  compute: function (
    value: Maybe<CellValue>,
    data: Matrix<CellValue>,
    isAscending: Maybe<CellValue> = false
  ): number {
    const _isAscending = toBoolean(isAscending);
    const _value = toNumber(value, this.locale);
    let rank = 1;
    let found = false;
    for (const row of data) {
      for (const cell of row) {
        if (typeof cell !== "number") {
          continue;
        }
        const _cell = toNumber(cell, this.locale);
        if (_cell === _value) {
          found = true;
        } else if (_cell > _value !== _isAscending) {
          rank++;
        }
      }
    }
    if (!found) {
      throw new NotAvailableError(_t("Value not found in the given data."));
    }
    return rank;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// RSQ
// -----------------------------------------------------------------------------
export const RSQ: AddFunctionDescription = {
  description: _t(
    "Compute the square of r, the Pearson product-moment correlation coefficient of a dataset."
  ),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataY: Matrix<CellValue>, dataX: Matrix<CellValue>): number {
    const pearson = PEARSON.compute.bind(this);
    return Math.pow(pearson(dataX, dataY) as number, 2.0);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SLOPE
// -----------------------------------------------------------------------------
export const SLOPE: AddFunctionDescription = {
  description: _t("Compute the slope of the linear regression."),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataY: Matrix<CellValue>, dataX: Matrix<CellValue>): number {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    const [[slope]] = fullLinearRegression([flatDataX], [flatDataY]);
    return slope as number;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SMALL
// -----------------------------------------------------------------------------
export const SMALL = {
  description: _t("Nth smallest element in a data set."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg("n (number)", _t("The rank from smallest to largest of the element to return.")),
  ],
  returns: ["NUMBER"],
  computeValueAndFormat: function (data: Arg, n: Maybe<FPayload>): FPayload {
    const _n = Math.trunc(toNumber(n?.value, this.locale));
    let largests: FPayload[] = [];
    let index: number;
    let count = 0;
    visitAny([data], (d) => {
      if (typeof d.value === "number") {
        index = dichotomicSearch(
          largests,
          d.value,
          "nextSmaller",
          "asc",
          largests.length,
          (array, i) => array[i].value
        );
        largests.splice(index + 1, 0, d);
        count++;
        if (count > _n) {
          largests.pop();
          count--;
        }
      }
      if (d.value instanceof Error) {
        throw d.value;
      }
    });
    const result = largests.pop();
    assert(() => result !== undefined, _t("[[FUNCTION_NAME]] has no valid input data."));
    assert(
      () => count >= _n,
      _t("Function [[FUNCTION_NAME]] parameter 2 value (%s) is out of range.", _n)
    );
    return result!;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SPEARMAN
// -----------------------------------------------------------------------------
export const SPEARMAN: AddFunctionDescription = {
  description: _t("Compute the Spearman rank correlation coefficient of a dataset."),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataX: Matrix<CellValue>, dataY: Matrix<CellValue>): number {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    const n = flatDataX.length;

    const order = flatDataX.map((e, i) => [e, flatDataY[i]]);
    order.sort((a, b) => a[0] - b[0]);

    for (let i = 0; i < n; ++i) {
      order[i][0] = i;
    }
    order.sort((a, b) => a[1] - b[1]);

    let sum = 0.0;
    for (let i = 0; i < n; ++i) {
      sum += (order[i][0] - i) ** 2;
    }
    return 1 - (6 * sum) / (n ** 3 - n);
  },
  isExported: false,
};

// -----------------------------------------------------------------------------
// STDEV
// -----------------------------------------------------------------------------
export const STDEV = {
  description: _t("Standard deviation."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the sample.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the sample.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return Math.sqrt(VAR.compute.bind(this)(...values));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// STDEV.P
// -----------------------------------------------------------------------------
export const STDEV_P = {
  description: _t("Standard deviation of entire population."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the population.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the population.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return Math.sqrt(VAR_P.compute.bind(this)(...values));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// STDEV.S
// -----------------------------------------------------------------------------
export const STDEV_S = {
  description: _t("Standard deviation."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the sample.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the sample.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return Math.sqrt(VAR_S.compute.bind(this)(...values));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// STDEVA
// -----------------------------------------------------------------------------
export const STDEVA = {
  description: _t("Standard deviation of sample (text as 0)."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the sample.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the sample.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return Math.sqrt(VARA.compute.bind(this)(...values));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// STDEVP
// -----------------------------------------------------------------------------
export const STDEVP = {
  description: _t("Standard deviation of entire population."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the population.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the population.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return Math.sqrt(VARP.compute.bind(this)(...values));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// STDEVPA
// -----------------------------------------------------------------------------
export const STDEVPA = {
  description: _t("Standard deviation of entire population (text as 0)."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the population.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the population.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return Math.sqrt(VARPA.compute.bind(this)(...values));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// STEYX
// -----------------------------------------------------------------------------
export const STEYX: AddFunctionDescription = {
  description: _t(
    "Calculates the standard error of the predicted y-value for each x in the regression of a dataset."
  ),
  args: [
    arg(
      "data_y (range<number>)",
      _t("The range representing the array or matrix of dependent data.")
    ),
    arg(
      "data_x (range<number>)",
      _t("The range representing the array or matrix of independent data.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (dataY: Matrix<CellValue>, dataX: Matrix<CellValue>): number {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    const data = fullLinearRegression([flatDataX], [flatDataY], true, true);
    return data[1][2] as number;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TREND
// -----------------------------------------------------------------------------
export const TREND: AddFunctionDescription = {
  description: _t("Fits points to linear trend derived via least-squares."),
  args: [
    arg(
      "known_data_y (number, range<number>)",
      _t(
        "The array or range containing dependent (y) values that are already known, used to curve fit an ideal linear trend."
      )
    ),
    arg(
      "known_data_x (number, range<number>, optional, default={1;2;3;...})",
      _t("The values of the independent variable(s) corresponding with known_data_y.")
    ),
    arg(
      "new_data_x (number, range<number>, optional, default=known_data_x)",
      _t("The data points to return the y values for on the ideal curve fit.")
    ),
    arg(
      "b (boolean, optional, default=TRUE)",
      _t(
        "Given a general linear form of y = m*x+b for a curve fit, calculates b if TRUE or forces b to be 0 and only calculates the m values if FALSE, i.e. forces the curve fit to pass through the origin."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    knownDataY: Matrix<CellValue>,
    knownDataX: Matrix<CellValue> = [],
    newDataX: Matrix<CellValue> = [],
    b: Maybe<CellValue> = true
  ): Matrix<number> {
    return predictLinearValues(
      tryCastAsNumberMatrix(knownDataY, "the first argument (known_data_y)"),
      tryCastAsNumberMatrix(knownDataX, "the second argument (known_data_x)"),
      tryCastAsNumberMatrix(newDataX, "the third argument (new_data_y)"),
      toBoolean(b)
    );
  },
};

// -----------------------------------------------------------------------------
// VAR
// -----------------------------------------------------------------------------
export const VAR = {
  description: _t("Variance."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the sample.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the sample.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return variance(values, true, false, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VAR.P
// -----------------------------------------------------------------------------
export const VAR_P = {
  description: _t("Variance of entire population."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the population.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the population.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return variance(values, false, false, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VAR.S
// -----------------------------------------------------------------------------
export const VAR_S = {
  description: _t("Variance."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the sample.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the sample.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return variance(values, true, false, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VARA
// -----------------------------------------------------------------------------
export const VARA = {
  description: _t("Variance of sample (text as 0)."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the sample.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the sample.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return variance(values, true, true, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VARP
// -----------------------------------------------------------------------------
export const VARP = {
  description: _t("Variance of entire population."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the population.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the population.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return variance(values, false, false, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VARPA
// -----------------------------------------------------------------------------
export const VARPA = {
  description: _t("Variance of entire population (text as 0)."),
  args: [
    arg("value1 (number, range<number>)", _t("The first value or range of the population.")),
    arg(
      "value2 (number, range<number>, repeating)",
      _t("Additional values or ranges to include in the population.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return variance(values, false, true, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;
