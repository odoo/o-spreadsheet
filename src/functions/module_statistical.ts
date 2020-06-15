import { args } from "./arguments";
import { FunctionDescription } from "../types";
import {
  toNumber,
  reduceNumbers,
  visitAny,
  reduceArgs,
  dichotomicPredecessorSearch,
  reduceNumbersTextAs0,
  visitMatchingRanges,
  typeNumber,
  numberValue,
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
    if (typeNumber(valueY) && typeNumber(valueX)) {
      count += 1;
      sumY += numberValue(valueY);
      sumX += numberValue(valueX);
    }
  }

  if (count === 0 || (isSample && count === 1)) {
    throw new Error(_lt(`Evaluation of function [[FUNCTION_NAME]] caused a divide by zero error.`));
  }

  const averageY = sumY / count;
  const averageX = sumX / count;

  let acc = 0;
  for (let i = 0; i < lenY; i++) {
    let valueY = flatDataY[i];
    let valueX = flatDataX[i];
    if (typeNumber(valueY) && typeNumber(valueX)) {
      acc += (numberValue(valueY) - averageY) * (numberValue(valueX) - averageX);
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

// -----------------------------------------------------------------------------
// AVEDEV
// -----------------------------------------------------------------------------
export const AVEDEV: FunctionDescription = {
  description: _lt("Average magnitude of deviations from mean."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
    value2 (number, range<number>, optional, repeating) ${_lt(
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
      throw new Error(_lt(`Evaluation of function AVEDEV caused a divide by zero error.`));
    }
    const average = sum / count;
    return reduceNumbers(arguments, (acc, a) => acc + Math.abs(average - a), 0) / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGE
// -----------------------------------------------------------------------------
export const AVERAGE: FunctionDescription = {
  description: _lt(`Numerical average value in a dataset, ignoring text.`),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the average value."
      )}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
      throw new Error(_lt(`Evaluation of function AVERAGE caused a divide by zero error.`));
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGE.WEIGHTED
// -----------------------------------------------------------------------------
const rangeError = _lt(`AVERAGE.WEIGHTED has mismatched range sizes.`);
const negativeWeightError = _lt(
  `AVERAGE.WEIGHTED expects the weight to be positive or equal to 0.`
);

export const AVERAGE_WEIGHTED: FunctionDescription = {
  description: _lt(`Weighted average.`),
  args: args(`
      values (number, range<number>) ${_lt("Values to average.")}
      weights (number, range<number>) ${_lt("Weights for each corresponding value.")}
      additional_values (number, range<number>, optional, repeating) ${_lt(
        "Additional values to average with weights."
      )}
    `),
  // @compatibility: on google sheets, args difinitions are next:
  // additional_values (number, range<number>, optional, repeating) Additional values to average.
  // additional_weights (number, range<number>, optional, repeating) Additional weights.
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
            let subValueIsNumber = typeNumber(subValue);
            let subWeightIsNumber = typeNumber(subWeight);
            // typeof subValue or subWeight can be 'number' or 'undefined'
            if (subValueIsNumber !== subWeightIsNumber) {
              throw new Error(_lt(`AVERAGE.WEIGHTED expects number values.`));
            }
            if (subWeightIsNumber) {
              const subWeightValue = numberValue(subWeight);
              if (subWeightValue < 0) {
                throw new Error(negativeWeightError);
              }
              sum += numberValue(subValue) * subWeightValue;
              count += subWeightValue;
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
        _lt(`Evaluation of function AVERAGE.WEIGHTED caused a divide by zero error.`)
      );
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGEA
// -----------------------------------------------------------------------------
export const AVERAGEA: FunctionDescription = {
  description: _lt(`Numerical average value in a dataset.`),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the average value."
      )}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
      throw new Error(_lt(`Evaluation of function AVERAGEA caused a divide by zero error.`));
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGEIF
// -----------------------------------------------------------------------------
export const AVERAGEIF: FunctionDescription = {
  description: _lt(`Average of values depending on criteria.`),
  args: args(`
      criteria_range (any, range) ${_lt("The range to check against criterion.")}
      criterion (string) ${_lt("The pattern or test to apply to criteria_range.")}
      average_range (any, range, optional, default=criteria_range) ${_lt(
        "The range to average. If not included, criteria_range is used for the average instead."
      )}
    `),
  returns: ["NUMBER"],
  compute: function (criteria_range: any, criterion: any, average_range: any = undefined): number {
    if (average_range === undefined) {
      average_range = criteria_range;
    }

    let count = 0;
    let sum = 0;

    visitMatchingRanges([criteria_range, criterion], (i, j) => {
      const value = average_range[i][j];
      if (typeNumber(value)) {
        count += 1;
        sum += numberValue(value);
      }
    });

    if (count === 0) {
      throw new Error(_lt(`Evaluation of function AVERAGEIF caused a divide by zero error.`));
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// AVERAGEIFS
// -----------------------------------------------------------------------------
export const AVERAGEIFS: FunctionDescription = {
  description: _lt(`Average of values depending on multiple criteria.`),
  args: args(`
      average_range (any, range) ${_lt("The range to average.")}
      criteria_range1 (any, range) ${_lt("The range to check against criterion1.")}
      criterion1 (string) ${_lt("The pattern or test to apply to criteria_range1.")}
      additional_values (any, optional, repeating) ${_lt(
        "Additional criteria_range and criterion to check."
      )}
    `),
  // @compatibility: on google sheets, args definitions are next:
  // average_range (any, range) The range to average.
  // criteria_range1 (any, range) The range to check against criterion1.
  // criterion1 (string) The pattern or test to apply to criteria_range1.
  // criteria_range2 (any, range, optional, repeating) Additional ranges to check.
  // criterion2 (string, optional, repeating) Additional criteria to check.
  returns: ["NUMBER"],
  compute: function (average_range, ...args): number {
    let count = 0;
    let sum = 0;
    visitMatchingRanges(args, (i, j) => {
      const value = average_range[i][j];
      if (typeNumber(value)) {
        count += 1;
        sum += numberValue(value);
      }
    });
    if (count === 0) {
      throw new Error(_lt(`Evaluation of function AVERAGEIFS caused a divide by zero error.`));
    }
    return sum / count;
  },
};

// -----------------------------------------------------------------------------
// COUNT
// -----------------------------------------------------------------------------
export const COUNT: FunctionDescription = {
  description: _lt(`The number of numeric values in dataset.`),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range to consider when counting.")}
    value2 (number, range<number>, optional, repeating) ${_lt(
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
            if (typeNumber(j)) {
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
export const COUNTA: FunctionDescription = {
  description: _lt(`The number of values in a dataset.`),
  args: args(`
    value1 (any, range) ${_lt("The first value or range to consider when counting.")}
    value2 (any, range, optional, repeating) ${_lt(
      "Additional values or ranges to consider when counting."
    )}
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
export const COVAR: FunctionDescription = {
  description: _lt(`The covariance of a dataset.`),
  args: args(`
    data_y (any, range) ${_lt("The range representing the array or matrix of dependent data.")}
    data_x (any, range) ${_lt("The range representing the array or matrix of independent data.")}
  `),
  returns: ["NUMBER"],
  compute: function (data_y: any[], data_x: any[]): number {
    return covariance(data_y, data_x, false);
  },
};

// -----------------------------------------------------------------------------
// COVARIANCE.P
// -----------------------------------------------------------------------------
export const COVARIANCE_P: FunctionDescription = {
  description: _lt(`The covariance of a dataset.`),
  args: args(`
    data_y (any, range) ${_lt("The range representing the array or matrix of dependent data.")}
    data_x (any, range) ${_lt("The range representing the array or matrix of independent data.")}
  `),
  returns: ["NUMBER"],
  compute: function (data_y: any[], data_x: any[]): number {
    return covariance(data_y, data_x, false);
  },
};

// -----------------------------------------------------------------------------
// COVARIANCE.S
// -----------------------------------------------------------------------------
export const COVARIANCE_S: FunctionDescription = {
  description: _lt(`The sample covariance of a dataset.`),
  args: args(`
    data_y (any, range) ${_lt("The range representing the array or matrix of dependent data.")}
    data_x (any, range) ${_lt("The range representing the array or matrix of independent data.")}
  `),
  returns: ["NUMBER"],
  compute: function (data_y: any[], data_x: any[]): number {
    return covariance(data_y, data_x, true);
  },
};

// -----------------------------------------------------------------------------
// LARGE
// -----------------------------------------------------------------------------
export const LARGE: FunctionDescription = {
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
      if (typeNumber(d)) {
        const dValue = numberValue(d);
        index = dichotomicPredecessorSearch(largests, dValue);
        largests.splice(index + 1, 0, dValue);
        count++;
        if (count > n) {
          largests.shift();
          count--;
        }
      }
    });
    const result = largests.shift();
    if (result === undefined) {
      throw new Error(_lt(`LARGE has no valid input data.`));
    }
    if (count < n) {
      throw new Error(_lt(`Function LARGE parameter 2 value ${n} is out of range.`));
    }
    return result;
  },
};

// -----------------------------------------------------------------------------
// MAX
// -----------------------------------------------------------------------------
export const MAX: FunctionDescription = {
  description: _lt("Maximum value in a numeric dataset."),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the maximum value."
      )}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
export const MAXA: FunctionDescription = {
  description: _lt("Maximum numeric value in a dataset."),
  args: args(`
      value1 (any, range) ${_lt(
        "The first value or range to consider when calculating the maximum value."
      )}
      value2 (ant, range, optional, repeating) ${_lt(
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
              j = typeNumber(j) ? numberValue(j) : 0;
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
export const MAXIFS: FunctionDescription = {
  description: _lt("Returns the maximum value in a range of cells, filtered by a set of criteria."),
  args: args(`
      range (any, range) ${_lt("The range of cells from which the maximum will be determined.")}
      criteria_range1 (any, range) ${_lt("The range of cells over which to evaluate criterion1.")}
      criterion1 (string) ${_lt(
        "The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set."
      )}
      additional_values (any, optional, repeating) ${_lt(
        "Additional criteria_range and criterion to check."
      )}
    `),
  // @compatibility: on google sheets, args definitions are next:
  // range (any, range) The range of cells from which the maximum will be determined.
  // criteria_range1 (any, range) The range of cells over which to evaluate criterion1.
  // criterion1 (string) The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set.
  // criteria_range2 (any, range, optional, repeating) Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair.
  // criterion2 (string, optional, repeating) The pattern or test to apply to criteria_range2.
  returns: ["NUMBER"],
  compute: function (range, ...args): number {
    let result = -Infinity;
    visitMatchingRanges(args, (i, j) => {
      let value = range[i][j];
      if (typeNumber(value)) {
        value = numberValue(value);
        result = result < value ? value : result;
      }
    });
    return result === -Infinity ? 0 : result;
  },
};

// -----------------------------------------------------------------------------
// MIN
// -----------------------------------------------------------------------------
export const MIN: FunctionDescription = {
  description: _lt("Minimum value in a numeric dataset."),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the minimum value."
      )}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
export const MINA: FunctionDescription = {
  description: _lt("Minimum numeric value in a dataset."),
  args: args(`
      value1 (number, range<number>) ${_lt(
        "The first value or range to consider when calculating the minimum value."
      )}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
              j = typeNumber(j) ? numberValue(j) : 0;
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
export const MINIFS: FunctionDescription = {
  description: _lt("Returns the minimum value in a range of cells, filtered by a set of criteria."),
  args: args(`
      range (any, range) ${_lt("The range of cells from which the minimum will be determined.")}
      criteria_range1 (any, range) ${_lt("The range of cells over which to evaluate criterion1.")}
      criterion1 (string) ${_lt(
        "The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set."
      )}
      additional_values (any, optional, repeating) ${_lt(
        "Additional criteria_range and criterion to check."
      )}
    `),
  // @compatibility: on google sheets, args definitions are next:
  // range (any, range) The range of cells from which the minimum will be determined.
  // criteria_range1 (any, range) The range of cells over which to evaluate criterion1.
  // criterion1 (string) The pattern or test to apply to criteria_range1, such that each cell that evaluates to TRUE will be included in the filtered set.
  // criteria_range2 (any, range, optional, repeating) Additional ranges over which to evaluate the additional criteria. The filtered set will be the intersection of the sets produced by each criterion-range pair.
  // criterion2 (string, optional, repeating) The pattern or test to apply to criteria_range2.
  returns: ["NUMBER"],
  compute: function (range, ...args): number {
    let result = Infinity;
    visitMatchingRanges(args, (i, j) => {
      let value = range[i][j];
      if (typeNumber(value)) {
        value = numberValue(value);
        result = result > value ? value : result;
      }
    });
    return result === Infinity ? 0 : result;
  },
};

// -----------------------------------------------------------------------------
// SMALL
// -----------------------------------------------------------------------------
export const SMALL: FunctionDescription = {
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
      if (typeNumber(d)) {
        const dValue = numberValue(d);
        index = dichotomicPredecessorSearch(largests, dValue);
        largests.splice(index + 1, 0, dValue);
        count++;
        if (count > n) {
          largests.pop();
          count--;
        }
      }
    });
    const result = largests.pop();
    if (result === undefined) {
      throw new Error(_lt(`SMALL has no valid input data.`));
    }
    if (count < n) {
      throw new Error(_lt(`Function SMALL parameter 2 value ${n} is out of range.`));
    }
    return result;
  },
};

// -----------------------------------------------------------------------------
// STDEV
// -----------------------------------------------------------------------------
export const STDEV: FunctionDescription = {
  description: _lt("Standard deviation."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
export const STDEV_P: FunctionDescription = {
  description: _lt("Standard deviation of entire population."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the population.")}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
export const STDEV_S: FunctionDescription = {
  description: _lt("Standard deviation."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
export const STDEVA: FunctionDescription = {
  description: _lt("Standard deviation of sample (text as 0)."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
    value2 (number, range<number>, optional, repeating) ${_lt(
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
export const STDEVP: FunctionDescription = {
  description: _lt("Standard deviation of entire population."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the population.")}
    value2 (number, range<number>, optional, repeating) ${_lt(
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
export const STDEVPA: FunctionDescription = {
  description: _lt("Standard deviation of entire population (text as 0)."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the population.")}
    value2 (number, range<number>, optional, repeating) ${_lt(
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
export const VAR: FunctionDescription = {
  description: _lt("Variance."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
export const VAR_P: FunctionDescription = {
  description: _lt("Variance of entire population."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the population.")}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
export const VAR_S: FunctionDescription = {
  description: _lt("Variance."),
  args: args(`
      value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
      value2 (number, range<number>, optional, repeating) ${_lt(
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
export const VARA: FunctionDescription = {
  description: _lt("Variance of sample (text as 0)."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the sample.")}
    value2 (number, range<number>, optional, repeating) ${_lt(
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
export const VARP: FunctionDescription = {
  description: _lt("Variance of entire population."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the population.")}
    value2 (number, range<number>, optional, repeating) ${_lt(
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
export const VARPA: FunctionDescription = {
  description: _lt("Variance of entire population (text as 0)."),
  args: args(`
    value1 (number, range<number>) ${_lt("The first value or range of the population.")}
    value2 (number, range<number>, optional, repeating) ${_lt(
      "Additional values or ranges to include in the population."
    )}
  `),
  returns: ["NUMBER"],
  compute: function (): number {
    return variance(arguments, false, true);
  },
};
