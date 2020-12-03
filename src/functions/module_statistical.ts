import { args } from "./arguments";
import { AddFunctionDescription } from "../types";
import {
  toNumber,
  reduceNumbers,
  visitAny,
  reduceArgs,
  dichotomicPredecessorSearch,
  reduceNumbersTextAs0,
  visitMatchingRanges,
  visitNumbers,
} from "./helpers";
import { isNumber } from "../helpers/index";
import { _lt } from "../translation";

// Note: dataY and dataX may not have the same dimension
function covariance(dataY: any[], dataX: any[], isSample: boolean): number {
  let flatDataY: any[] = [];
  let flatDataX: any[] = [];
  let lenY = 0;
  let lenX = 0;

  visitAny(dataY, (y) => {
    flatDataY.push(y);
    lenY += 1;
  });

  visitAny(dataX, (x) => {
    flatDataX.push(x);
    lenX += 1;
  });

  if (lenY !== lenX) {
    throw new Error(_lt(`[[FUNCTION_NAME]] has mismatched argument count ${lenY} vs ${lenX}.`));
  }

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

  if (count === 0 || (isSample && count === 1)) {
    throw new Error(_lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`));
  }

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

function variance(args: IArguments | any[], isSample: boolean, textAs0: boolean): number {
  let count = 0;
  let sum = 0;
  const reduceFuction = textAs0 ? reduceNumbersTextAs0 : reduceNumbers;

  sum = reduceFuction(
    args,
    (acc, a) => {
      count += 1;
      return acc + a;
    },
    0
  );

  if (count === 0 || (isSample && count === 1)) {
    throw new Error(_lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`));
  }

  const average = sum / count;
  return (
    reduceFuction(args, (acc, a) => acc + Math.pow(a - average, 2), 0) /
    (count - (isSample ? 1 : 0))
  );
}

function centile(data: any, percent: any, isInclusive: boolean): number {
  const _percent = toNumber(percent);
  if (_percent < 0 || 1 < _percent || (!isInclusive && (_percent === 0 || _percent === 1))) {
    throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 2 value is out of range.`));
  }
  let sortedArray: number[] = [];
  let index: number;
  let count = 0;
  visitAny(data, (d) => {
    if (typeof d === "number") {
      index = dichotomicPredecessorSearch(sortedArray, d);
      sortedArray.splice(index + 1, 0, d);
      count++;
    }
  });
  if (count === 0) {
    throw new Error(_lt(`[[FUNCTION_NAME]] has no valid input data.`));
  }
  let percentIndex = (count + (isInclusive ? -1 : 1)) * _percent;
  if (!isInclusive) {
    if (percentIndex < 1 || count < percentIndex) {
      throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 2 value is out of range.`));
    }
    percentIndex--;
  }
  if (Number.isInteger(percentIndex)) {
    return sortedArray[percentIndex];
  }
  const indexSup = Math.ceil(percentIndex);
  const indexLow = Math.floor(percentIndex);
  return (
    sortedArray[indexSup] * (percentIndex - indexLow) +
    sortedArray[indexLow] * (indexSup - percentIndex)
  );
}

// -----------------------------------------------------------------------------
// AVEDEV
// -----------------------------------------------------------------------------
export const AVEDEV: AddFunctionDescription = {
  description: _lt("Average magnitude of deviations from mean."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
    value2 (number, range<number>, repeating) ${_lt(
      "Additional values or ranges to include in the sample."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    let count = 0;
    const sum = reduceNumbers(
      arguments,
      (acc, a) => {
        count += 1;
        return acc + a;
      },
      0
    );
    if (count === 0) {
      throw new Error(
        _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
      );
    }
    const average = sum / count;
    return reduceNumbers(arguments, (acc, a) => acc + Math.abs(average - a), 0) / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGE
// -----------------------------------------------------------------------------
export const AVERAGE: AddFunctionDescription = {
  description: _lt(`Numerical average value in a dataset, ignoring text.`),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the average value."
      )}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to consider when calculating the average value."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    let count = 0;
    const sum = reduceNumbers(
      arguments,
      (acc, a) => {
        count += 1;
        return acc + a;
      },
      0
    );
    if (count === 0) {
      throw new Error(
        _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
      );
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGE.WEIGHTED
// -----------------------------------------------------------------------------
const rangeError = _lt(`[[FUNCTION_NAME]] has mismatched range sizes.`);
const negativeWeightError = _lt(
  `[[FUNCTION_NAME]] expects the weight to be positive or equal to 0.`
);

export const AVERAGE_WEIGHTED: AddFunctionDescription = {
  description: _lt(`Weighted average.`),
  args: args(`
      values (number, range<number>) ${_lt("Values to average.")}
      weights (number, range<number>) ${_lt("Weights for each corresponding value.")}
      additional_values (number, range<number>, repeating) ${_lt("Additional values to average.")}
      additional_weights (number, range<number>, repeating) ${_lt("Additional weights.")}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    let sum = 0;
    let count = 0;
    let value;
    let weight;
    if (arguments.length % 2 === 1) {
      throw new Error(_lt(`Wrong number of arguments. Expected an even number of arguments.`));
    }
    for (let n = 0; n < arguments.length - 1; n += 2) {
      value = arguments[n];
      weight = arguments[n + 1];
      // if (typeof value != typeof weight) {
      //   throw new Error(rangeError);
      // }
      if (Array.isArray(value)) {
        if (!Array.isArray(weight)) {
          throw new Error(rangeError);
        }
        let dimColValue = value.length;
        let dimLinValue = value[0].length;
        if (dimColValue !== weight.length || dimLinValue != weight[0].length) {
          throw new Error(rangeError);
        }
        for (let i = 0; i < dimColValue; i++) {
          for (let j = 0; j < dimLinValue; j++) {
            let subValue = value[i][j];
            let subWeight = weight[i][j];
            let subValueIsNumber = typeof subValue === "number";
            let subWeightIsNumber = typeof subWeight === "number";
            // typeof subValue or subWeight can be 'number' or 'undefined'
            if (subValueIsNumber !== subWeightIsNumber) {
              throw new Error(_lt(`[[FUNCTION_NAME]] expects number values.`));
            }
            if (subWeightIsNumber) {
              if (subWeight < 0) {
                throw new Error(negativeWeightError);
              }
              sum += subValue * subWeight;
              count += subWeight;
            }
          }
        }
      } else {
        weight = toNumber(weight);
        value = toNumber(value);
        if (weight < 0) {
          throw new Error(negativeWeightError);
        }
        sum += value * weight;
        count += weight;
      }
    }
    if (count === 0) {
      throw new Error(
        _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
      );
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGEA
// -----------------------------------------------------------------------------
export const AVERAGEA: AddFunctionDescription = {
  description: _lt(`Numerical average value in a dataset.`),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the average value."
      )}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to consider when calculating the average value."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    let count = 0;
    const sum = reduceNumbersTextAs0(
      arguments,
      (acc, a) => {
        count += 1;
        return acc + a;
      },
      0
    );
    if (count === 0) {
      throw new Error(
        _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
      );
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGEIF
// -----------------------------------------------------------------------------
export const AVERAGEIF: AddFunctionDescription = {
  description: _lt(`Average of values depending on criteria.`),
  args: args(`
      criteria_range (any, range) ${_lt("The range to check against criterion.")}
      criterion (string) ${_lt("The pattern or test to apply to criteria_range.")}
      average_range (any, range, default=${_lt("criteria_range")}) ${_lt(
    "The range to average. If not included, criteria_range is used for the average instead."
  )}
    `),
  returns: ["NUMBER"],
  compute: function (criteriaRange: any, criterion: any, averageRange: any = undefined): number {
    if (averageRange === undefined) {
      averageRange = criteriaRange;
    }

    let count = 0;
    let sum = 0;

    visitMatchingRanges([criteriaRange, criterion], (i, j) => {
      const value = averageRange[i][j];
      if (typeof value === "number") {
        count += 1;
        sum += value;
      }
    });

    if (count === 0) {
      throw new Error(
        _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
      );
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGEIFS
// -----------------------------------------------------------------------------
export const AVERAGEIFS: AddFunctionDescription = {
  description: _lt(`Average of values depending on multiple criteria.`),
  args: args(`
      average_range (any, range) ${_lt("The range to average.")}
      criteria_range1 (any, range) ${_lt("The range to check against criterion1.")}
      criterion1 (string) ${_lt("The pattern or test to apply to criteria_range1.")}
      criteria_range2 (any, range, repeating) ${_lt("Additional ranges to check.")}
      criterion2 (string, repeating) ${_lt("Additional criteria to check.")}
    `),
  returns: ["NUMBER"],
  compute: function (averageRange, ...args): number {
    let count = 0;
    let sum = 0;
    visitMatchingRanges(args, (i, j) => {
      const value = averageRange[i][j];
      if (typeof value === "number") {
        count += 1;
        sum += value;
      }
    });
    if (count === 0) {
      throw new Error(
        _lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`)
      );
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// COUNT
// -----------------------------------------------------------------------------
export const COUNT: AddFunctionDescription = {
  description: _lt(`The number of numeric values in dataset.`),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range to consider when counting.")}
    value2 (number, range<number>, repeating) ${_lt(
      "Additional values or ranges to consider when counting."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    let count = 0;
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (typeof j === "number") {
              count += 1;
            }
          }
        }
      } else if (typeof n !== "string" || isNumber(n)) {
        count += 1;
      }
    }
    return count;
  },
};

// -----------------------------------------------------------------------------
// COUNTA
// -----------------------------------------------------------------------------
export const COUNTA: AddFunctionDescription = {
  description: _lt(`The number of values in a dataset.`),
  args: args(`
    value1 (any, range) ${_lt("The first value or range to consider when counting.")}
    value2 (any, range, repeating) ${_lt("Additional values or ranges to consider when counting.")}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    return reduceArgs(arguments, (acc, a) => (a !== undefined && a !== null ? acc + 1 : acc), 0);
  },
};

// -----------------------------------------------------------------------------
// COVAR
// -----------------------------------------------------------------------------

// Note: Unlike the VAR function which corresponds to the variance over a sample (VAR.S),
// the COVAR function corresponds to the covariance over an entire population (COVAR.P)
export const COVAR: AddFunctionDescription = {
  description: _lt(`The covariance of a dataset.`),
  args: args(`
    data_y (any, range) ${_lt("The range representing the array or matrix of dependent data.")}
    data_x (any, range) ${_lt("The range representing the array or matrix of independent data.")}
  `),
  returns: ["NUMBER"],
  compute: function (dataY: any[], dataX: any[]): number {
    return covariance(dataY, dataX, false);
  },
};

// -----------------------------------------------------------------------------
// COVARIANCE.P
// -----------------------------------------------------------------------------
export const COVARIANCE_P: AddFunctionDescription = {
  description: _lt(`The covariance of a dataset.`),
  args: args(`
    data_y (any, range) ${_lt("The range representing the array or matrix of dependent data.")}
    data_x (any, range) ${_lt("The range representing the array or matrix of independent data.")}
  `),
  returns: ["NUMBER"],
  compute: function (dataY: any[], dataX: any[]): number {
    return covariance(dataY, dataX, false);
  },
};

// -----------------------------------------------------------------------------
// COVARIANCE.S
// -----------------------------------------------------------------------------
export const COVARIANCE_S: AddFunctionDescription = {
  description: _lt(`The sample covariance of a dataset.`),
  args: args(`
    data_y (any, range) ${_lt("The range representing the array or matrix of dependent data.")}
    data_x (any, range) ${_lt("The range representing the array or matrix of independent data.")}
  `),
  returns: ["NUMBER"],
  compute: function (dataY: any[], dataX: any[]): number {
    return covariance(dataY, dataX, true);
  },
};

// -----------------------------------------------------------------------------
// LARGE
// -----------------------------------------------------------------------------
export const LARGE: AddFunctionDescription = {
  description: _lt("Nth largest element from a data set."),
  args: args(`
      data (any, range) ${_lt("Array or range containing the dataset to consider.")}
      n (number) ${_lt("The rank from largest to smallest of the element to return.")}
    `),
  returns: ["NUMBER"],
  compute: function (data: any, n: any): number {
    n = Math.trunc(toNumber(n));
    let largests: number[] = [];
    let index: number;
    let count = 0;
    visitAny(data, (d) => {
      if (typeof d === "number") {
        index = dichotomicPredecessorSearch(largests, d);
        largests.splice(index + 1, 0, d);
        count++;
        if (count > n) {
          largests.shift();
          count--;
        }
      }
    });
    const result = largests.shift();
    if (result === undefined) {
      throw new Error(_lt(`[[FUNCTION_NAME]] has no valid input data.`));
    }
    if (count < n) {
      throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 2 value ${n} is out of range.`));
    }
    return result;
  },
};

// -----------------------------------------------------------------------------
// MAX
// -----------------------------------------------------------------------------
export const MAX: AddFunctionDescription = {
  description: _lt("Maximum value in a numeric dataset."),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the maximum value."
      )}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to consider when calculating the maximum value."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    const result = reduceNumbers(arguments, (acc, a) => (acc < a ? a : acc), -Infinity);
    return result === -Infinity ? 0 : result;
  },
};

// -----------------------------------------------------------------------------
// MAXA
// -----------------------------------------------------------------------------
export const MAXA: AddFunctionDescription = {
  description: _lt("Maximum numeric value in a dataset."),
  args: args(`
      value1 (any, range) ${_lt(
        "The first value or range to consider when calculating the maximum value."
      )}
      value2 (ant, range, repeating) ${_lt(
        "Additional values or ranges to consider when calculating the maximum value."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    let maxa = -Infinity;
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (j != undefined) {
              j = typeof j === "number" ? j : 0;
              if (maxa < j) {
                maxa = j;
              }
            }
          }
        }
      } else {
        n = toNumber(n);
        if (maxa < n) {
          maxa = n;
        }
      }
    }
    return maxa === -Infinity ? 0 : maxa;
  },
};

// -----------------------------------------------------------------------------
// MAXIFS
// -----------------------------------------------------------------------------
export const MAXIFS: AddFunctionDescription = {
  description: _lt("Returns the maximum value in a range of cells, filtered by a set of criteria."),
  args: args(`
      range (any, range) ${_lt("The range of cells from which the maximum will be determined.")}
      criteria_range1 (any, range) ${_lt("The range of cells over which to evaluate criterion1.")}
      criterion1 (string) ${_lt(
        "The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set."
      )}
      criteria_range2 (any, range, repeating) ${_lt(
        "Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair."
      )}
      criterion2 (string, repeating) ${_lt("The pattern or test to apply to criteria_range2.")}
    `),
  returns: ["NUMBER"],
  compute: function (range, ...args): number {
    let result = -Infinity;
    visitMatchingRanges(args, (i, j) => {
      const value = range[i][j];
      if (typeof value === "number") {
        result = result < value ? value : result;
      }
    });
    return result === -Infinity ? 0 : result;
  },
};

// -----------------------------------------------------------------------------
// MEDIAN
// -----------------------------------------------------------------------------
export const MEDIAN: AddFunctionDescription = {
  description: _lt("Median value in a numeric dataset."),
  args: args(`
      value1 (any, range) ${_lt(
        "The first value or range to consider when calculating the median value."
      )}
      value2 (any, range, repeating) ${_lt(
        "Additional values or ranges to consider when calculating the median value."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    let data: any[] = [];
    visitNumbers(arguments, (arg) => {
      data.push(arg);
    });
    return centile([data], 0.5, true);
  },
};

// -----------------------------------------------------------------------------
// MIN
// -----------------------------------------------------------------------------
export const MIN: AddFunctionDescription = {
  description: _lt("Minimum value in a numeric dataset."),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the minimum value."
      )}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to consider when calculating the minimum value."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    const result = reduceNumbers(arguments, (acc, a) => (a < acc ? a : acc), Infinity);
    return result === Infinity ? 0 : result;
  },
};

// -----------------------------------------------------------------------------
// MINA
// -----------------------------------------------------------------------------
export const MINA: AddFunctionDescription = {
  description: _lt("Minimum numeric value in a dataset."),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the minimum value."
      )}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to consider when calculating the minimum value."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    let mina = Infinity;
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (j != undefined) {
              j = typeof j === "number" ? j : 0;
              if (j < mina) {
                mina = j;
              }
            }
          }
        }
      } else {
        n = toNumber(n);
        if (n < mina) {
          mina = n;
        }
      }
    }
    return mina === Infinity ? 0 : mina;
  },
};

// -----------------------------------------------------------------------------
// MINIFS
// -----------------------------------------------------------------------------
export const MINIFS: AddFunctionDescription = {
  description: _lt("Returns the minimum value in a range of cells, filtered by a set of criteria."),
  args: args(`
      range (any, range) ${_lt("The range of cells from which the minimum will be determined.")}
      criteria_range1 (any, range) ${_lt("The range of cells over which to evaluate criterion1.")}
      criterion1 (string) ${_lt(
        "The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set."
      )}
      criteria_range2 (any, range, repeating) ${_lt(
        "Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair."
      )}
      criterion2 (string, repeating) ${_lt("The pattern or test to apply to criteria_range2.")}
    `),
  returns: ["NUMBER"],
  compute: function (range, ...args): number {
    let result = Infinity;
    visitMatchingRanges(args, (i, j) => {
      const value = range[i][j];
      if (typeof value === "number") {
        result = result > value ? value : result;
      }
    });
    return result === Infinity ? 0 : result;
  },
};

// -----------------------------------------------------------------------------
// PERCENTILE
// -----------------------------------------------------------------------------
export const PERCENTILE: AddFunctionDescription = {
  description: _lt("Value at a given percentile of a dataset."),
  args: args(`
      data (any, range) ${_lt("The array or range containing the dataset to consider.")}
      percentile (number) ${_lt(
        "The percentile whose value within data will be calculated and returned."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (data: any, percentile: any): number {
    return PERCENTILE_INC.compute(data, percentile);
  },
};

// -----------------------------------------------------------------------------
// PERCENTILE.EXC
// -----------------------------------------------------------------------------
export const PERCENTILE_EXC: AddFunctionDescription = {
  description: _lt("Value at a given percentile of a dataset exclusive of 0 and 1."),
  args: args(`
      data (any, range) ${_lt("The array or range containing the dataset to consider.")}
      percentile (number) ${_lt(
        "The percentile, exclusive of 0 and 1, whose value within 'data' will be calculated and returned."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (data: any, percentile: any): number {
    return centile(data, percentile, false);
  },
};

// -----------------------------------------------------------------------------
// PERCENTILE.INC
// -----------------------------------------------------------------------------
export const PERCENTILE_INC: AddFunctionDescription = {
  description: _lt("Value at a given percentile of a dataset."),
  args: args(`
      data (any, range) ${_lt("The array or range containing the dataset to consider.")}
      percentile (number) ${_lt(
        "The percentile whose value within data will be calculated and returned."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (data: any, percentile: any): number {
    return centile(data, percentile, true);
  },
};

// -----------------------------------------------------------------------------
// QUARTILE
// -----------------------------------------------------------------------------
export const QUARTILE: AddFunctionDescription = {
  description: _lt("Value nearest to a specific quartile of a dataset."),
  args: args(`
      data (any, range) ${_lt("The array or range containing the dataset to consider.")}
      quartile_number (number) ${_lt("Which quartile value to return.")}
    `),
  returns: ["NUMBER"],
  compute: function (data: any, quartileNumber: any): number {
    return QUARTILE_INC.compute(data, quartileNumber);
  },
};

// -----------------------------------------------------------------------------
// QUARTILE.EXC
// -----------------------------------------------------------------------------
export const QUARTILE_EXC: AddFunctionDescription = {
  description: _lt("Value nearest to a specific quartile of a dataset exclusive of 0 and 4."),
  args: args(`
      data (any, range) ${_lt("The array or range containing the dataset to consider.")}
      quartile_number (number) ${_lt("Which quartile value, exclusive of 0 and 4, to return.")}
    `),
  returns: ["NUMBER"],
  compute: function (data: any, quartileNumber: any): number {
    const _quartileNumber = Math.trunc(toNumber(quartileNumber));
    return centile(data, 0.25 * _quartileNumber, false);
  },
};

// -----------------------------------------------------------------------------
// QUARTILE.INC
// -----------------------------------------------------------------------------
export const QUARTILE_INC: AddFunctionDescription = {
  description: _lt("Value nearest to a specific quartile of a dataset."),
  args: args(`
      data (any, range) ${_lt("The array or range containing the dataset to consider.")}
      quartile_number (number) ${_lt("Which quartile value to return.")}
    `),
  returns: ["NUMBER"],
  compute: function (data: any, quartileNumber: any): number {
    const _quartileNumber = Math.trunc(toNumber(quartileNumber));
    return centile(data, 0.25 * _quartileNumber, true);
  },
};

// -----------------------------------------------------------------------------
// SMALL
// -----------------------------------------------------------------------------
export const SMALL: AddFunctionDescription = {
  description: _lt("Nth smallest element in a data set."),
  args: args(`
      data (any, range) ${_lt("The array or range containing the dataset to consider.")}
      n (number) ${_lt("The rank from smallest to largest of the element to return.")}
    `),
  returns: ["NUMBER"],
  compute: function (data: any, n: any): number {
    n = Math.trunc(toNumber(n));
    let largests: number[] = [];
    let index: number;
    let count = 0;
    visitAny(data, (d) => {
      if (typeof d === "number") {
        index = dichotomicPredecessorSearch(largests, d);
        largests.splice(index + 1, 0, d);
        count++;
        if (count > n) {
          largests.pop();
          count--;
        }
      }
    });
    const result = largests.pop();
    if (result === undefined) {
      throw new Error(_lt(`[[FUNCTION_NAME]] has no valid input data.`));
    }
    if (count < n) {
      throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 2 value ${n} is out of range.`));
    }
    return result;
  },
};

// -----------------------------------------------------------------------------
// STDEV
// -----------------------------------------------------------------------------
export const STDEV: AddFunctionDescription = {
  description: _lt("Standard deviation."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to include in the sample."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.sqrt(VAR.compute(...arguments));
  },
};

// -----------------------------------------------------------------------------
// STDEV.P
// -----------------------------------------------------------------------------
export const STDEV_P: AddFunctionDescription = {
  description: _lt("Standard deviation of entire population."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the population.")}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to include in the population."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.sqrt(VAR_P.compute(...arguments));
  },
};

// -----------------------------------------------------------------------------
// STDEV.S
// -----------------------------------------------------------------------------
export const STDEV_S: AddFunctionDescription = {
  description: _lt("Standard deviation."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to include in the sample."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.sqrt(VAR_S.compute(...arguments));
  },
};

// -----------------------------------------------------------------------------
// STDEVA
// -----------------------------------------------------------------------------
export const STDEVA: AddFunctionDescription = {
  description: _lt("Standard deviation of sample (text as 0)."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
    value2 (number, range<number>, repeating) ${_lt(
      "Additional values or ranges to include in the sample."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.sqrt(VARA.compute(...arguments));
  },
};

// -----------------------------------------------------------------------------
// STDEVP
// -----------------------------------------------------------------------------
export const STDEVP: AddFunctionDescription = {
  description: _lt("Standard deviation of entire population."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the population.")}
    value2 (number, range<number>, repeating) ${_lt(
      "Additional values or ranges to include in the population."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.sqrt(VARP.compute(...arguments));
  },
};

// -----------------------------------------------------------------------------
// STDEVPA
// -----------------------------------------------------------------------------
export const STDEVPA: AddFunctionDescription = {
  description: _lt("Standard deviation of entire population (text as 0)."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the population.")}
    value2 (number, range<number>, repeating) ${_lt(
      "Additional values or ranges to include in the population."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    return Math.sqrt(VARPA.compute(...arguments));
  },
};

// -----------------------------------------------------------------------------
// VAR
// -----------------------------------------------------------------------------
export const VAR: AddFunctionDescription = {
  description: _lt("Variance."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to include in the sample."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    return variance(arguments, true, false);
  },
};

// -----------------------------------------------------------------------------
// VAR.P
// -----------------------------------------------------------------------------
export const VAR_P: AddFunctionDescription = {
  description: _lt("Variance of entire population."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the population.")}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to include in the population."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    return variance(arguments, false, false);
  },
};

// -----------------------------------------------------------------------------
// VAR.S
// -----------------------------------------------------------------------------
export const VAR_S: AddFunctionDescription = {
  description: _lt("Variance."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
      value2 (number, range<number>, repeating) ${_lt(
        "Additional values or ranges to include in the sample."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (): number {
    return variance(arguments, true, false);
  },
};

// -----------------------------------------------------------------------------
// VARA
// -----------------------------------------------------------------------------
export const VARA: AddFunctionDescription = {
  description: _lt("Variance of sample (text as 0)."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
    value2 (number, range<number>, repeating) ${_lt(
      "Additional values or ranges to include in the sample."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    return variance(arguments, true, true);
  },
};

// -----------------------------------------------------------------------------
// VARP
// -----------------------------------------------------------------------------
export const VARP: AddFunctionDescription = {
  description: _lt("Variance of entire population."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the population.")}
    value2 (number, range<number>, repeating) ${_lt(
      "Additional values or ranges to include in the population."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    return variance(arguments, false, false);
  },
};

// -----------------------------------------------------------------------------
// VARPA
// -----------------------------------------------------------------------------
export const VARPA: AddFunctionDescription = {
  description: _lt("Variance of entire population (text as 0)."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the population.")}
    value2 (number, range<number>, repeating) ${_lt(
      "Additional values or ranges to include in the population."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    return variance(arguments, false, true);
  },
};
