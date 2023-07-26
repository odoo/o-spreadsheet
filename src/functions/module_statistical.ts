import { parseDateTime } from "../helpers/dates";
import { isNumber, percentile } from "../helpers/numbers";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  ArgValue,
  Locale,
  MatrixArgValue,
  PrimitiveArgValue,
} from "../types";
import { arg } from "./arguments";
import {
  assert,
  dichotomicSearch,
  reduceAny,
  reduceNumbers,
  reduceNumbersTextAs0,
  toMatrix,
  toNumber,
  visitAny,
  visitMatchingRanges,
  visitNumbers,
} from "./helpers";

// Note: dataY and dataX may not have the same dimension
function covariance(dataY: ArgValue, dataX: ArgValue, isSample: boolean): number {
  let flatDataY: (PrimitiveArgValue | undefined)[] = [];
  let flatDataX: (PrimitiveArgValue | undefined)[] = [];
  let lenY = 0;
  let lenX = 0;

  visitAny([dataY], (y) => {
    flatDataY.push(y);
    lenY += 1;
  });

  visitAny([dataX], (x) => {
    flatDataX.push(x);
    lenX += 1;
  });

  assert(
    () => lenY === lenX,
    _t(
      "[[FUNCTION_NAME]] has mismatched argument count %s vs %s.",
      lenY.toString(),
      lenX.toString()
    )
  );

  let count = 0;
  let sumY = 0;
  let sumX = 0;
  for (let i = 0; i < lenY; i++) {
    const valueY = flatDataY[i];
    const valueX = flatDataX[i];
    if (typeof valueY === "number" && typeof valueX === "number") {
      count += 1;
      sumY += valueY;
      sumX += valueX;
    }
  }

  assert(
    () => count !== 0 && (!isSample || count !== 1),
    _t(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
  );

  const averageY = sumY / count;
  const averageX = sumX / count;

  let acc = 0;
  for (let i = 0; i < lenY; i++) {
    const valueY = flatDataY[i];
    const valueX = flatDataX[i];
    if (typeof valueY === "number" && typeof valueX === "number") {
      acc += (valueY - averageY) * (valueX - averageX);
    }
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
    _t(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
  );

  const average = sum / count;
  return (
    reduceFunction(args, (acc, a) => acc + Math.pow(a - average, 2), 0, locale) /
    (count - (isSample ? 1 : 0))
  );
}

function centile(
  data: ArgValue[],
  percent: PrimitiveArgValue,
  isInclusive: boolean,
  locale: Locale
): number {
  const _percent = toNumber(percent, locale);
  assert(
    () => (isInclusive ? 0 <= _percent && _percent <= 1 : 0 < _percent && _percent < 1),
    _t(`Function [[FUNCTION_NAME]] parameter 2 value is out of range.`)
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
  });
  assert(() => count !== 0, _t(`[[FUNCTION_NAME]] has no valid input data.`));

  if (!isInclusive) {
    // 2nd argument must be between 1/(n+1) and n/(n+1) with n the number of data
    assert(
      () => 1 / (count + 1) <= _percent && _percent <= count / (count + 1),
      _t(`Function [[FUNCTION_NAME]] parameter 2 value is out of range.`)
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
      _t(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
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
  description: _t(`Numerical average value in a dataset, ignoring text.`),
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
    return Array.isArray(value1) ? value1[0][0]?.format : value1?.format;
  },
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
      _t(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );
    return sum / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGE.WEIGHTED
// -----------------------------------------------------------------------------
const rangeError = _t(`[[FUNCTION_NAME]] has mismatched range sizes.`);
const negativeWeightError = _t(
  `[[FUNCTION_NAME]] expects the weight to be positive or equal to 0.`
);

export const AVERAGE_WEIGHTED = {
  description: _t(`Weighted average.`),
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
    return Array.isArray(values) ? values[0][0]?.format : values?.format;
  },
  compute: function (...values: ArgValue[]): number {
    let sum = 0;
    let count = 0;
    let value;
    let weight;
    assert(
      () => values.length % 2 === 0,
      _t(`Wrong number of Argument[]. Expected an even number of Argument[].`)
    );
    for (let n = 0; n < values.length - 1; n += 2) {
      value = values[n];
      weight = values[n + 1];
      // if (typeof value != typeof weight) {
      //   throw new Error(rangeError);
      // }
      if (Array.isArray(value)) {
        assert(() => Array.isArray(weight), rangeError);

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
              _t(`[[FUNCTION_NAME]] expects number values.`)
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
      _t(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );

    return sum / count;
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGEA
// -----------------------------------------------------------------------------
export const AVERAGEA = {
  description: _t(`Numerical average value in a dataset.`),
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
    return Array.isArray(value1) ? value1[0][0]?.format : value1?.format;
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
      _t(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );
    return sum / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGEIF
// -----------------------------------------------------------------------------
export const AVERAGEIF = {
  description: _t(`Average of values depending on criteria.`),
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
    criterion: PrimitiveArgValue,
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
      _t(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );

    return sum / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// AVERAGEIFS
// -----------------------------------------------------------------------------
export const AVERAGEIFS = {
  description: _t(`Average of values depending on multiple criteria.`),
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
  compute: function (averageRange: MatrixArgValue, ...values: ArgValue[]): number {
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
      _t(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
    );
    return sum / count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNT
// -----------------------------------------------------------------------------
export const COUNT = {
  description: _t(`The number of numeric values in dataset.`),
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
    let count = 0;
    for (let n of values) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (typeof j === "number") {
              count += 1;
            }
          }
        }
      } else if (
        typeof n !== "string" ||
        isNumber(n, this.locale) ||
        parseDateTime(n, this.locale)
      ) {
        count += 1;
      }
    }
    return count;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COUNTA
// -----------------------------------------------------------------------------
export const COUNTA = {
  description: _t(`The number of values in a dataset.`),
  args: [
    arg("value1 (any, range)", _t("The first value or range to consider when counting.")),
    arg(
      "value2 (any, range, repeating)",
      _t("Additional values or ranges to consider when counting.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (...values: ArgValue[]): number {
    return reduceAny(values, (acc, a) => (a !== undefined && a !== null ? acc + 1 : acc), 0);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// COVAR
// -----------------------------------------------------------------------------

// Note: Unlike the VAR function which corresponds to the variance over a sample (VAR.S),
// the COVAR function corresponds to the covariance over an entire population (COVAR.P)
export const COVAR = {
  description: _t(`The covariance of a dataset.`),
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
  description: _t(`The covariance of a dataset.`),
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
  description: _t(`The sample covariance of a dataset.`),
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
// LARGE
// -----------------------------------------------------------------------------
export const LARGE = {
  description: _t("Nth largest element from a data set."),
  args: [
    arg("data (any, range)", _t("Array or range containing the dataset to consider.")),
    arg("n (number)", _t("The rank from largest to smallest of the element to return.")),
  ],
  returns: ["NUMBER"],
  computeFormat: (data: Arg) => {
    return Array.isArray(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, n: PrimitiveArgValue): number {
    const _n = Math.trunc(toNumber(n, this.locale));
    let largests: number[] = [];
    let index: number;
    let count = 0;
    visitAny([data], (d) => {
      if (typeof d === "number") {
        index = dichotomicSearch(
          largests,
          d,
          "nextSmaller",
          "asc",
          largests.length,
          (array, i) => array[i]
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
    assert(() => result !== undefined, _t(`[[FUNCTION_NAME]] has no valid input data.`));
    assert(
      () => count >= _n,
      _t("Function [[FUNCTION_NAME]] parameter 2 value (%s) is out of range.", _n.toString())
    );
    return result!;
  },
  isExported: true,
} satisfies AddFunctionDescription;

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
    return Array.isArray(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    const result = reduceNumbers(values, (acc, a) => (acc < a ? a : acc), -Infinity, this.locale);
    return result === -Infinity ? 0 : result;
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
    return Array.isArray(value1) ? value1[0][0]?.format : value1?.format;
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
  compute: function (range: MatrixArgValue, ...args: ArgValue[]): number {
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
    return Array.isArray(value1) ? value1[0][0]?.format : value1?.format;
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
    return Array.isArray(value1) ? value1[0][0]?.format : value1?.format;
  },
  compute: function (...values: ArgValue[]): number {
    const result = reduceNumbers(values, (acc, a) => (a < acc ? a : acc), Infinity, this.locale);
    return result === Infinity ? 0 : result;
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
    return Array.isArray(value1) ? value1[0][0]?.format : value1?.format;
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
  compute: function (range: MatrixArgValue, ...args: ArgValue[]): number {
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
    return Array.isArray(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, percentile: PrimitiveArgValue): number {
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
    return Array.isArray(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, percentile: PrimitiveArgValue): number {
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
    return Array.isArray(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, percentile: PrimitiveArgValue): number {
    return centile([data], percentile, true, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

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
    return Array.isArray(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, quartileNumber: PrimitiveArgValue): number {
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
    return Array.isArray(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, quartileNumber: PrimitiveArgValue): number {
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
    return Array.isArray(data) ? data[0][0]?.format : data?.format;
  },
  compute: function (data: ArgValue, quartileNumber: PrimitiveArgValue): number {
    const _quartileNumber = Math.trunc(toNumber(quartileNumber, this.locale));
    return centile([data], 0.25 * _quartileNumber, true, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

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
  computeFormat: (data: Arg) => {
    return Array.isArray(data) ? data[0][0].format : data?.format;
  },
  compute: function (data: ArgValue, n: PrimitiveArgValue): number {
    const _n = Math.trunc(toNumber(n, this.locale));
    let largests: number[] = [];
    let index: number;
    let count = 0;
    visitAny([data], (d) => {
      if (typeof d === "number") {
        index = dichotomicSearch(
          largests,
          d,
          "nextSmaller",
          "asc",
          largests.length,
          (array, i) => array[i]
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
    assert(() => result !== undefined, _t(`[[FUNCTION_NAME]] has no valid input data.`));
    assert(
      () => count >= _n,
      _t("Function [[FUNCTION_NAME]] parameter 2 value (%s) is out of range.", _n.toString())
    );
    return result!;
  },
  isExported: true,
} satisfies AddFunctionDescription;

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
