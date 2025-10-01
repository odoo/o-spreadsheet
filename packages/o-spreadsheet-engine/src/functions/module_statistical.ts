import { percentile } from "../helpers/index";
import { Arg, FunctionResultObject, Functions, isMatrix, Matrix, Maybe } from "../index";
import { _t } from "../translation";
import { FunctionResultNumber, Locale } from "../types";
import { DivisionByZeroError, EvaluationError, NotAvailableError } from "../types/errors";
import { arg } from "./arguments";
import { areSameDimensions, assert, assertNotZero } from "./helper_assert";
import {
  assertSameNumberOfElements,
  average,
  countAny,
  countNumbers,
  evaluatePolynomial,
  expM,
  fullLinearRegression,
  logM,
  max,
  min,
  polynomialRegression,
  predictLinearValues,
} from "./helper_statistical";
import {
  dichotomicSearch,
  emptyDataErrorMessage,
  inferFormat,
  matrixMap,
  noValidInputErrorMessage,
  reduceNumbers,
  reduceNumbersTextAs0,
  toBoolean,
  toMatrix,
  toNumber,
  toNumberMatrix,
  visitAny,
  visitMatchingRanges,
  visitNumbers,
} from "./helpers";

const CALCULATE_B_OPTIONS = [
  { value: true, label: _t("b is calculated normally") },
  { value: false, label: _t("b is forced to 1") },
];

const RETURN_VERBOSE_OPTIONS = [
  { value: false, label: _t("do not return additional regression statistics") },
  { value: true, label: _t("return additional regression statistics") },
];

const POLYNOMIAL_ORDER_OPTIONS = [
  { value: 1, label: _t("order 1 (Linear)") },
  { value: 2, label: _t("order 2 (Quadratic)") },
  { value: 3, label: _t("order 3 (Cubic)") },
  { value: 4, label: _t("order 4 (Quartic)") },
  { value: 5, label: _t("order 5 (Quintic)") },
  { value: 6, label: _t("order 6 (Sextic)") },
];

const COMPUTE_INTERCEPT_OPTIONS = [
  { value: true, label: _t("Compute intercept") },
  { value: false, label: _t("Force intercept to 0") },
];

const QUARTILE_NUMBER_OPTIONS = [
  { value: 0, label: _t("Minimum value") },
  { value: 1, label: _t("First quartile (25th percentile)") },
  { value: 2, label: _t("Median value (50th percentile)") },
  { value: 3, label: _t("Third quartile (75th percentile)") },
  { value: 4, label: _t("Maximum value") },
];

function filterAndFlatData(dataY: Arg, dataX: Arg): { flatDataY: number[]; flatDataX: number[] } {
  const _flatDataY: Maybe<FunctionResultObject>[] = [];
  const _flatDataX: Maybe<FunctionResultObject>[] = [];
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
    lenY === lenX,
    _t("[[FUNCTION_NAME]] has mismatched argument count %s vs %s.", lenY, lenX)
  );
  const flatDataX: number[] = [];
  const flatDataY: number[] = [];
  for (let i = 0; i < lenY; i++) {
    const valueY = _flatDataY[i]?.value;
    const valueX = _flatDataX[i]?.value;
    if (typeof valueY === "number" && typeof valueX === "number") {
      flatDataY.push(valueY);
      flatDataX.push(valueX);
    }
  }
  return { flatDataX, flatDataY };
}

// Note: dataY and dataX may not have the same dimension
function covariance(dataY: Arg, dataX: Arg, isSample: boolean): number {
  const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
  const count = flatDataY.length;

  assertNotZero(count);
  if (isSample) {
    assertNotZero(count - 1);
  }

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

function variance(args: Arg[], isSample: boolean, textAs0: boolean, locale: Locale): number {
  let count = 0;
  const reduceFunction = textAs0 ? reduceNumbersTextAs0 : reduceNumbers;

  const sum = reduceFunction(
    args,
    (acc, a) => {
      count += 1;
      return acc + a;
    },
    0,
    locale
  );

  assertNotZero(count);
  if (isSample) {
    assertNotZero(count - 1);
  }

  const average = sum / count;
  return (
    reduceFunction(args, (acc, a) => acc + Math.pow(a - average, 2), 0, locale) /
    (count - (isSample ? 1 : 0))
  );
}

function centile(
  data: Arg[],
  percent: Maybe<FunctionResultObject>,
  isInclusive: boolean,
  locale: Locale
): number {
  const _percent = toNumber(percent, locale);
  assert(
    isInclusive ? 0 <= _percent && _percent <= 1 : 0 < _percent && _percent < 1,
    _t("Function [[FUNCTION_NAME]] parameter 2 value is out of range.")
  );
  const sortedArray: number[] = [];
  let index: number;
  let count = 0;
  visitAny(data, (d) => {
    const value = d?.value;
    if (typeof value === "number") {
      index = dichotomicSearch(
        sortedArray,
        d,
        "nextSmaller",
        "asc",
        sortedArray.length,
        (array, i) => array[i]
      );
      sortedArray.splice(index + 1, 0, value);
      count++;
    }
  });
  assert(count !== 0, noValidInputErrorMessage);

  if (!isInclusive) {
    // 2nd argument must be between 1/(n+1) and n/(n+1) with n the number of data
    assert(
      1 / (count + 1) <= _percent && _percent <= count / (count + 1),
      _t("Function [[FUNCTION_NAME]] parameter 2 value is out of range.")
    );
  }

  return percentile(sortedArray, _percent, isInclusive);
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
  compute: function (...values: Arg[]) {
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
    if (count === 0) {
      return new DivisionByZeroError(
        _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
    const average = sum / count;
    return reduceNumbers(values, (acc, a) => acc + Math.abs(average - a), 0, this.locale) / count;
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...values: Arg[]): FunctionResultNumber {
    return {
      value: average(values, this.locale),
      format: inferFormat(values[0]),
    };
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]) {
    let sum = 0;
    let count = 0;
    for (let n = 0; n < args.length - 1; n += 2) {
      const argN = args[n];
      const argN1 = args[n + 1];
      if (!areSameDimensions(argN, argN1)) {
        return new EvaluationError(rangeError);
      }

      if (isMatrix(argN)) {
        for (let i = 0; i < argN.length; i++) {
          for (let j = 0; j < argN[0].length; j++) {
            const value = argN[i][j].value;
            const weight = isMatrix(argN1) ? argN1?.[i][j].value : toNumber(argN1, this.locale);
            const valueIsNumber = typeof value === "number";
            const weightIsNumber = typeof weight === "number";

            if (valueIsNumber && weightIsNumber) {
              if (weight < 0) {
                return new EvaluationError(negativeWeightError);
              }
              sum += value * weight;
              count += weight;
              continue;
            }
            if (valueIsNumber !== weightIsNumber) {
              return new EvaluationError(_t("[[FUNCTION_NAME]] expects number values."));
            }
          }
        }
      } else {
        const value = toNumber(argN, this.locale);
        const weight = isMatrix(argN1) ? argN1?.[0][0].value : toNumber(argN1, this.locale);
        if (typeof weight === "number") {
          if (weight < 0) {
            return new EvaluationError(negativeWeightError);
          }
          sum += value * weight;
          count += weight;
        }
      }
    }
    if (count === 0) {
      return new DivisionByZeroError(
        _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
    return { value: sum / count, format: inferFormat(args[0]) };
  },
} satisfies Functions;

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
  compute: function (...args: Arg[]) {
    let count = 0;
    const sum = reduceNumbersTextAs0(
      args,
      (acc, a) => {
        count += 1;
        return acc + a;
      },
      0,
      this.locale
    );
    if (count === 0) {
      return new DivisionByZeroError(
        _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
    return {
      value: sum / count,
      format: inferFormat(args[0]),
    };
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (
    criteriaRange: Arg,
    criterion: Maybe<FunctionResultObject>,
    averageRange: Arg
  ) {
    const _averageRange =
      averageRange === undefined ? toMatrix(criteriaRange) : toMatrix(averageRange);

    let count = 0;
    let sum = 0;

    visitMatchingRanges(
      [criteriaRange, criterion],
      (i, j) => {
        const value = _averageRange[i]?.[j]?.value;
        if (typeof value === "number") {
          count += 1;
          sum += value;
        }
      },
      this.locale
    );
    if (count === 0) {
      return new DivisionByZeroError(
        _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
    return sum / count;
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (averageRange: Matrix<FunctionResultObject>, ...args: Arg[]) {
    const _averageRange = toMatrix(averageRange);
    let count = 0;
    let sum = 0;
    visitMatchingRanges(
      args,
      (i, j) => {
        const value = _averageRange[i]?.[j]?.value;
        if (typeof value === "number") {
          count += 1;
          sum += value;
        }
      },
      this.locale
    );
    if (count === 0) {
      return new DivisionByZeroError(
        _t("Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.")
      );
    }
    return sum / count;
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// COUNT
// -----------------------------------------------------------------------------
export const COUNT = {
  description: _t("The number of numeric values in dataset."),
  args: [
    arg(
      "value1 (number, any, range<number>)",
      _t("The first value or range to consider when counting.")
    ),
    arg(
      "value2 (number, any, range<number>, repeating)",
      _t("Additional values or ranges to consider when counting.")
    ),
  ],
  compute: function (...values: Arg[]): number {
    return countNumbers(values, this.locale);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...values: Arg[]): number {
    return countAny(values);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (dataY: Arg, dataX: Arg): number {
    return covariance(dataY, dataX, false);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (dataY: Arg, dataX: Arg): number {
    return covariance(dataY, dataX, false);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (dataY: Arg, dataX: Arg): number {
    return covariance(dataY, dataX, true);
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// FORECAST
// -----------------------------------------------------------------------------
export const FORECAST: Functions = {
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
  compute: function (
    x: Arg,
    dataY: Matrix<FunctionResultObject>,
    dataX: Matrix<FunctionResultObject>
  ) {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    if (flatDataX.length === 0 || flatDataY.length === 0) {
      return new NotAvailableError(noValidInputErrorMessage);
    }

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
export const GROWTH: Functions = {
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
      ),
      CALCULATE_B_OPTIONS
    ),
  ],
  compute: function (
    knownDataY: Matrix<FunctionResultObject>,
    knownDataX: Matrix<FunctionResultObject> = [[]],
    newDataX: Matrix<FunctionResultObject> = [[]],
    b: Maybe<FunctionResultObject> = { value: true }
  ) {
    if (knownDataY.length === 0 || knownDataY[0].length === 0) {
      return new EvaluationError(emptyDataErrorMessage("known_data_y"));
    }
    return expM(
      predictLinearValues(
        logM(toNumberMatrix(knownDataY, "the first argument (known_data_y)")),
        toNumberMatrix(knownDataX, "the second argument (known_data_x)"),
        toNumberMatrix(newDataX, "the third argument (new_data_y)"),
        toBoolean(b)
      )
    );
  },
};

// -----------------------------------------------------------------------------
// INTERCEPT
// -----------------------------------------------------------------------------
export const INTERCEPT: Functions = {
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
  compute: function (dataY: Matrix<FunctionResultObject>, dataX: Matrix<FunctionResultObject>) {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    if (flatDataX.length === 0 || flatDataY.length === 0) {
      return new NotAvailableError(noValidInputErrorMessage);
    }
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
  compute: function (data: Arg, n: Maybe<FunctionResultObject>): FunctionResultObject {
    const _n = Math.trunc(toNumber(n?.value, this.locale));
    const largests: FunctionResultObject[] = [];
    let index: number;
    let count = 0;
    visitAny([data], (d) => {
      if (typeof d?.value === "number") {
        index = dichotomicSearch(
          largests,
          d,
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
    });
    const result = largests.shift();
    if (result === undefined) {
      return new EvaluationError(noValidInputErrorMessage);
    }
    if (count < _n) {
      return new EvaluationError(
        _t("Function [[FUNCTION_NAME]] parameter 2 value (%s) is out of range.", _n)
      );
    }
    return result!;
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// LINEST
// -----------------------------------------------------------------------------
export const LINEST: Functions = {
  description: _t(
    "Given partial data about a linear trend, calculates various parameters about the ideal linear trend using the least-squares method."
  ),
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
      _t("A flag specifying whether to compute the slope or not"),
      CALCULATE_B_OPTIONS
    ),
    arg(
      "verbose (boolean, default=FALSE)",
      _t(
        "A flag specifying whether to return additional regression statistics or only the linear coefficients and the y-intercept"
      ),
      RETURN_VERBOSE_OPTIONS
    ),
  ],
  compute: function (
    dataY: Matrix<FunctionResultObject>,
    dataX: Matrix<FunctionResultObject> = [[]],
    calculateB: Maybe<FunctionResultObject> = { value: true },
    verbose: Maybe<FunctionResultObject> = { value: false }
  ) {
    if (dataY.length === 0 || dataY[0].length === 0) {
      return new EvaluationError(emptyDataErrorMessage("data_y"));
    }
    return fullLinearRegression(
      toNumberMatrix(dataX, "the first argument (data_y)"),
      toNumberMatrix(dataY, "the second argument (data_x)"),
      toBoolean(calculateB),
      toBoolean(verbose)
    );
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LOGEST
// -----------------------------------------------------------------------------
export const LOGEST: Functions = {
  description: _t(
    "Given partial data about an exponential growth curve, calculates various parameters about the best fit ideal exponential growth curve."
  ),
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
      _t("A flag specifying whether to compute the slope or not"),
      CALCULATE_B_OPTIONS
    ),
    arg(
      "verbose (boolean, default=FALSE)",
      _t(
        "A flag specifying whether to return additional regression statistics or only the linear coefficients and the y-intercept"
      ),
      RETURN_VERBOSE_OPTIONS
    ),
  ],
  compute: function (
    dataY: Matrix<FunctionResultObject>,
    dataX: Matrix<FunctionResultObject> = [[]],
    calculateB: Maybe<FunctionResultObject> = { value: true },
    verbose: Maybe<FunctionResultObject> = { value: false }
  ) {
    if (dataY.length === 0 || dataY[0].length === 0) {
      return new EvaluationError(emptyDataErrorMessage("data_y"));
    }
    const coeffs = fullLinearRegression(
      toNumberMatrix(dataX, "the second argument (data_x)"),
      logM(toNumberMatrix(dataY, "the first argument (data_y)")),
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
export const MATTHEWS: Functions = {
  description: _t("Compute the Matthews correlation coefficient of a dataset."),
  args: [
    arg("data_x (range)", _t("The range representing the array or matrix of observed data.")),
    arg("data_y (range)", _t("The range representing the array or matrix of predicted data.")),
  ],
  compute: function (dataX: Matrix<FunctionResultObject>, dataY: Matrix<FunctionResultObject>) {
    const flatX = dataX.flat();
    const flatY = dataY.flat();
    assertSameNumberOfElements(flatX, flatY);
    if (flatX.length === 0 || flatY.length === 0) {
      return new NotAvailableError(noValidInputErrorMessage);
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
  compute: function (...values: Arg[]): FunctionResultNumber {
    return max(values, this.locale);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): FunctionResultNumber {
    const maxa = reduceNumbersTextAs0(
      args,
      (acc, a) => {
        return Math.max(a, acc);
      },
      -Infinity,
      this.locale
    );
    return { value: maxa === -Infinity ? 0 : maxa, format: inferFormat(args[0]) };
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (range: Matrix<FunctionResultObject>, ...args: Arg[]): number {
    let result = -Infinity;
    visitMatchingRanges(
      args,
      (i, j) => {
        const value = range[i]?.[j]?.value;
        if (typeof value === "number") {
          result = result < value ? value : result;
        }
      },
      this.locale
    );
    return result === -Infinity ? 0 : result;
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...values: Arg[]): FunctionResultNumber {
    const data: FunctionResultNumber[] = [];
    visitNumbers(
      values,
      (value) => {
        data.push(value);
      },
      this.locale
    );
    return {
      value: centile(data, { value: 0.5 }, true, this.locale),
      format: inferFormat(data[0]),
    };
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...values: Arg[]): FunctionResultNumber {
    return min(values, this.locale);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): FunctionResultNumber {
    const mina: number = reduceNumbersTextAs0(
      args,
      (acc, a) => {
        return Math.min(a, acc);
      },
      Infinity,
      this.locale
    );
    return { value: mina === Infinity ? 0 : mina, format: inferFormat(args[0]) };
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (range: Matrix<FunctionResultObject>, ...args: Arg[]): number {
    let result = Infinity;
    visitMatchingRanges(
      args,
      (i, j) => {
        const value = range[i]?.[j]?.value;
        if (typeof value === "number") {
          result = result > value ? value : result;
        }
      },
      this.locale
    );
    return result === Infinity ? 0 : result;
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// PEARSON
// -----------------------------------------------------------------------------
function pearson(dataY: Matrix<FunctionResultObject>, dataX: Matrix<FunctionResultObject>) {
  const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
  if (flatDataX.length === 0 || flatDataY.length === 0) {
    return new NotAvailableError(noValidInputErrorMessage);
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
}

export const PEARSON: Functions = {
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
  compute: function (
    dataY: Matrix<FunctionResultObject>,
    dataX: Matrix<FunctionResultObject>
  ): number | NotAvailableError {
    return pearson(dataY, dataX);
  },
  isExported: true,
};

// CORREL
// In GSheet, CORREL is just an alias to PEARSON
export const CORREL: Functions = PEARSON;

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
  compute: function (data: Arg, percentile: Maybe<FunctionResultObject>): FunctionResultNumber {
    return PERCENTILE_INC.compute.bind(this)(data, percentile);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (data: Arg, percentile: Maybe<FunctionResultObject>): FunctionResultNumber {
    return {
      value: centile([data], percentile, false, this.locale),
      format: inferFormat(data),
    };
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (data: Arg, percentile: Maybe<FunctionResultObject>): FunctionResultNumber {
    return {
      value: centile([data], percentile, true, this.locale),
      format: inferFormat(data),
    };
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// POLYFIT
// -----------------------------------------------------------------------------
export const POLYFIT_COEFFS: Functions = {
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
    arg(
      "order (number)",
      _t("The order of the polynomial to fit the data, between 1 and 6."),
      POLYNOMIAL_ORDER_OPTIONS
    ),
    arg(
      "intercept (boolean, default=TRUE)",
      _t("A flag specifying whether to compute the intercept or not."),
      COMPUTE_INTERCEPT_OPTIONS
    ),
  ],
  compute: function (
    dataY: Matrix<FunctionResultObject>,
    dataX: Matrix<FunctionResultObject>,
    order: Maybe<FunctionResultObject>,
    intercept: Maybe<FunctionResultObject> = { value: true }
  ) {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    if (flatDataX.length === 0 || flatDataY.length === 0) {
      return new NotAvailableError(noValidInputErrorMessage);
    }
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
export const POLYFIT_FORECAST: Functions = {
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
    arg(
      "order (number)",
      _t("The order of the polynomial to fit the data, between 1 and 6."),
      POLYNOMIAL_ORDER_OPTIONS
    ),
    arg(
      "intercept (boolean, default=TRUE)",
      _t("A flag specifying whether to compute the intercept or not."),
      COMPUTE_INTERCEPT_OPTIONS
    ),
  ],
  compute: function (
    x: Arg,
    dataY: Matrix<FunctionResultObject>,
    dataX: Matrix<FunctionResultObject>,
    order: Maybe<FunctionResultObject>,
    intercept: Maybe<FunctionResultObject> = { value: true }
  ) {
    const _order = toNumber(order, this.locale);
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    if (flatDataX.length === 0 || flatDataY.length === 0) {
      return new NotAvailableError(noValidInputErrorMessage);
    }
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
    arg("quartile_number (number)", _t("Which quartile value to return."), QUARTILE_NUMBER_OPTIONS),
  ],
  compute: function (data: Arg, quartileNumber: Maybe<FunctionResultObject>): FunctionResultNumber {
    return QUARTILE_INC.compute.bind(this)(data, quartileNumber);
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// QUARTILE.EXC
// -----------------------------------------------------------------------------
export const QUARTILE_EXC = {
  description: _t("Value nearest to a specific quartile of a dataset exclusive of 0 and 4."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg("quartile_number (number)", _t("Which quartile value, exclusive of 0 and 4, to return."), [
      { value: 1, label: _t("First quartile (25th percentile)") },
      { value: 2, label: _t("Median value (50th percentile)") },
      { value: 3, label: _t("Third quartile (75th percentile)") },
    ]),
  ],
  compute: function (data: Arg, quartileNumber: Maybe<FunctionResultObject>): FunctionResultNumber {
    const _quartileNumber = Math.trunc(toNumber(quartileNumber, this.locale));
    const percent = { value: 0.25 * _quartileNumber };
    return {
      value: centile([data], percent, false, this.locale),
      format: inferFormat(data),
    };
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// QUARTILE.INC
// -----------------------------------------------------------------------------
export const QUARTILE_INC = {
  description: _t("Value nearest to a specific quartile of a dataset."),
  args: [
    arg("data (any, range)", _t("The array or range containing the dataset to consider.")),
    arg("quartile_number (number)", _t("Which quartile value to return."), QUARTILE_NUMBER_OPTIONS),
  ],
  compute: function (data: Arg, quartileNumber: Maybe<FunctionResultObject>): FunctionResultNumber {
    const percent = { value: 0.25 * Math.trunc(toNumber(quartileNumber, this.locale)) };
    return {
      value: centile([data], percent, true, this.locale),
      format: inferFormat(data),
    };
  },
  isExported: true,
} satisfies Functions;

// RANK
// -----------------------------------------------------------------------------
export const RANK: Functions = {
  description: _t("Returns the rank of a specified value in a dataset."),
  args: [
    arg("value (number)", _t("The value whose rank will be determined.")),
    arg("data (range)", _t("The range containing the dataset to consider.")),
    arg(
      "is_ascending (boolean, default=FALSE)",
      _t("Whether to consider the values in data in descending or ascending order."),
      [
        { value: false, label: _t("Descending") },
        { value: true, label: _t("Ascending") },
      ]
    ),
  ],
  compute: function (
    value: Maybe<FunctionResultObject>,
    data: Matrix<FunctionResultObject>,
    isAscending: Maybe<FunctionResultObject> = { value: false }
  ) {
    const _isAscending = toBoolean(isAscending);
    const _value = toNumber(value, this.locale);
    let rank = 1;
    let found = false;
    for (const row of data) {
      for (const cell of row) {
        if (typeof cell.value !== "number") {
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
      return new NotAvailableError(_t("Value not found in the given data."));
    }
    return rank;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// RSQ
// -----------------------------------------------------------------------------
export const RSQ: Functions = {
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
  compute: function (
    dataY: Matrix<FunctionResultObject>,
    dataX: Matrix<FunctionResultObject>
  ): number {
    const value = pearson(dataY, dataX);
    if (value instanceof Error) {
      throw value;
    }
    return Math.pow(value as number, 2.0);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SLOPE
// -----------------------------------------------------------------------------
export const SLOPE: Functions = {
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
  compute: function (dataY: Matrix<FunctionResultObject>, dataX: Matrix<FunctionResultObject>) {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    if (flatDataX.length === 0 || flatDataY.length === 0) {
      return new NotAvailableError(noValidInputErrorMessage);
    }
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
  compute: function (data: Arg, n: Maybe<FunctionResultObject>): FunctionResultObject {
    const _n = Math.trunc(toNumber(n?.value, this.locale));
    const largests: FunctionResultObject[] = [];
    let index: number;
    let count = 0;
    visitAny([data], (d) => {
      if (typeof d?.value === "number") {
        index = dichotomicSearch(
          largests,
          d,
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
    });
    const result = largests.pop();
    if (result === undefined) {
      return new EvaluationError(noValidInputErrorMessage);
    }
    if (count < _n) {
      return new EvaluationError(
        _t("Function [[FUNCTION_NAME]] parameter 2 value (%s) is out of range.", _n)
      );
    }
    return result!;
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// SPEARMAN
// -----------------------------------------------------------------------------
export const SPEARMAN: Functions = {
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
  compute: function (dataX: Matrix<FunctionResultObject>, dataY: Matrix<FunctionResultObject>) {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    if (flatDataX.length === 0 || flatDataY.length === 0) {
      return new NotAvailableError(noValidInputErrorMessage);
    }
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
  compute: function (...args: Arg[]): number {
    return Math.sqrt(VAR.compute.bind(this)(...args));
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return Math.sqrt(VAR_P.compute.bind(this)(...args));
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return Math.sqrt(VAR_S.compute.bind(this)(...args));
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return Math.sqrt(VARA.compute.bind(this)(...args));
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return Math.sqrt(VARP.compute.bind(this)(...args));
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return Math.sqrt(VARPA.compute.bind(this)(...args));
  },
  isExported: true,
} satisfies Functions;

// -----------------------------------------------------------------------------
// STEYX
// -----------------------------------------------------------------------------
export const STEYX: Functions = {
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
  compute: function (dataY: Matrix<FunctionResultObject>, dataX: Matrix<FunctionResultObject>) {
    const { flatDataX, flatDataY } = filterAndFlatData(dataY, dataX);
    if (flatDataX.length === 0 || flatDataY.length === 0) {
      return new NotAvailableError(noValidInputErrorMessage);
    }
    const data = fullLinearRegression([flatDataX], [flatDataY], true, true);
    return data[1][2] as number;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TREND
// -----------------------------------------------------------------------------
export const TREND: Functions = {
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
      ),
      CALCULATE_B_OPTIONS
    ),
  ],
  compute: function (
    knownDataY: Matrix<FunctionResultObject>,
    knownDataX: Matrix<FunctionResultObject> = [[]],
    newDataX: Matrix<FunctionResultObject> = [[]],
    b: Maybe<FunctionResultObject> = { value: true }
  ) {
    if (knownDataY.length === 0 || knownDataY[0].length === 0) {
      return new EvaluationError(emptyDataErrorMessage("known_data_y"));
    }
    return predictLinearValues(
      toNumberMatrix(knownDataY, "the first argument (known_data_y)"),
      toNumberMatrix(knownDataX, "the second argument (known_data_x)"),
      toNumberMatrix(newDataX, "the third argument (new_data_y)"),
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
  compute: function (...args: Arg[]): number {
    return variance(args, true, false, this.locale);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return variance(args, false, false, this.locale);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return variance(args, true, false, this.locale);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return variance(args, true, true, this.locale);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return variance(args, false, false, this.locale);
  },
  isExported: true,
} satisfies Functions;

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
  compute: function (...args: Arg[]): number {
    return variance(args, false, true, this.locale);
  },
  isExported: true,
} satisfies Functions;
