import { args } from "./arguments";
import { FunctionDescription } from "./index";
import {
  toNumber,
  reduceNumbers,
  visitAny,
  reduceArgs,
  dichotomicPredecessorSearch
} from "./helpers";
import { isNumber } from "../helpers/index";

// -----------------------------------------------------------------------------
// AVEDEV
// -----------------------------------------------------------------------------
export const AVEDEV: FunctionDescription = {
  description: "Average magnitude of deviations from mean.",
  args: args`
    value1 (number, range<number>) The first value or range of the sample.
    value2 (number, range<number>, optional, repeating) Additional values or ranges to include in the sample.
  `,
  returns: ["NUMBER"],
  compute: function(): number {
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
      throw new Error(`
        Evaluation of function AVEDEV caused a divide by zero error.`);
    }
    const average = sum / count;
    return reduceNumbers(arguments, (acc, a) => acc + Math.abs(average - a), 0) / count;
  }
};

// -----------------------------------------------------------------------------
// AVERAGE
// -----------------------------------------------------------------------------
export const AVERAGE: FunctionDescription = {
  description: `Numerical average value in a dataset, ignoring text.`,
  args: args`
      value1 (number, range<number>) The first value or range to consider when calculating the average value.
      value2 (number, range<number>, optional, repeating) Additional values or ranges to consider when calculating the average value.
    `,
  returns: ["NUMBER"],
  compute: function(): number {
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
      throw new Error(`
        Evaluation of function AVEDEV caused a divide by zero error.`);
    }
    return sum / count;
  }
};

// -----------------------------------------------------------------------------
// AVERAGE.WEIGHTED
// -----------------------------------------------------------------------------
const rangeError = `
  AVERAGE.WEIGHTED has mismatched range sizes.
`;
const negativeWeightError = `
  AVERAGE.WEIGHTED expects the weight to be positive or equal to 0.
`;

export const AVERAGE_WEIGHTED: FunctionDescription = {
  description: `Weighted average.`,
  args: args`
      values (number, range<number>) Values to average.
      weights (number, range<number>) Weights for each corresponding value.
      additional_values (number, range<number>, optional, repeating) Additional values to average with weights.
    `,
  // @compatibility: on google sheets, args difinitions are next:
  // additional_values (number, range<number>, optional, repeating) Additional values to average.
  // additional_weights (number, range<number>, optional, repeating) Additional weights.
  returns: ["NUMBER"],
  compute: function(): number {
    let sum = 0;
    let count = 0;
    let value;
    let weight;
    if (arguments.length % 2 === 1) {
      throw new Error(`
          Wrong number of arguments. Expected an even number of arguments.
      `);
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
              throw new Error(`
                  AVERAGE.WEIGHTED expects number values.
                `);
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
      throw new Error(`
          Evaluation of function AVERAGE.WEIGHTED caused a divide by zero error.
        `);
    }
    return sum / count;
  }
};

// -----------------------------------------------------------------------------
// AVERAGEA
// -----------------------------------------------------------------------------
export const AVERAGEA: FunctionDescription = {
  description: `Numerical average value in a dataset.`,
  args: args`
      value1 (number, range<number>) The first value or range to consider when calculating the average value.
      value2 (number, range<number>, optional, repeating) Additional values or ranges to consider when calculating the average value.
    `,
  returns: ["NUMBER"],
  compute: function(): number {
    let sum = 0;
    let count = 0;
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (j !== undefined && j !== null) {
              if (typeof j === "number") {
                sum += j;
              } else if (typeof j === "boolean") {
                sum += toNumber(j);
              }
              count++;
            }
          }
        }
      } else {
        sum += toNumber(n);
        count++;
      }
    }
    if (count === 0) {
      throw new Error(`
        Evaluation of function AVERAGEA caused a divide by zero error.`);
    }
    return sum / count;
  }
};

// -----------------------------------------------------------------------------
// COUNT
// -----------------------------------------------------------------------------
export const COUNT: FunctionDescription = {
  description: `The number of numeric values in dataset.`,
  args: args`
    value1 (number, range<number>) The first value or range to consider when counting.
    value2 (number, range<number>, optional, repeating) Additional values or ranges to consider when counting.
  `,
  returns: ["NUMBER"],
  compute: function(): number {
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
      } else if (isNumber(n)) {
        count += 1;
      }
    }
    return count;
  }
};

// -----------------------------------------------------------------------------
// COUNTA
// -----------------------------------------------------------------------------
export const COUNTA: FunctionDescription = {
  description: `The number of values in a dataset.`,
  args: args`
    value1 (any, range) The first value or range to consider when counting.
    value2 (any, range, optional, repeating) Additional values or ranges to consider when counting.
  `,
  returns: ["NUMBER"],
  compute: function(): number {
    return reduceArgs(arguments, (acc, a) => (a !== undefined && a !== null ? acc + 1 : acc), 0);
  }
};

// -----------------------------------------------------------------------------
// LARGE
// -----------------------------------------------------------------------------
export const LARGE: FunctionDescription = {
  description: "Nth largest element from a data set.",
  args: args`
      data (any, range) Array or range containing the dataset to consider.
      n (number) The rank from largest to smallest of the element to return.
    `,
  returns: ["NUMBER"],
  compute: function(data: any, n: any): number {
    n = Math.trunc(toNumber(n));
    let largests: number[] = [];
    let index: number;
    let count = 0;
    visitAny(data, d => {
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
      throw new Error(`LARGE has no valid input data.`);
    }
    if (count < n) {
      throw new Error(`Function LARGE parameter 2 value ${n} is out of range.`);
    }
    return result;
  }
};

// -----------------------------------------------------------------------------
// MAX
// -----------------------------------------------------------------------------
export const MAX: FunctionDescription = {
  description: "Maximum value in a numeric dataset.",
  args: args`
      value1 (number, range<number>) The first value or range to consider when calculating the maximum value.
      value2 (number, range<number>, optional, repeating) Additional values or ranges to consider when calculating the maximum value.
    `,
  returns: ["NUMBER"],
  compute: function(): number {
    const result = reduceNumbers(arguments, (acc, a) => (acc < a ? a : acc), -Infinity);
    return result === -Infinity ? 0 : result;
  }
};

// -----------------------------------------------------------------------------
// MAXA
// -----------------------------------------------------------------------------
export const MAXA: FunctionDescription = {
  description: "Maximum numeric value in a dataset.",
  args: args`
      value1 (any, range) The first value or range to consider when calculating the maximum value.
      value2 (ant, range, optional, repeating) Additional values or ranges to consider when calculating the maximum value.
    `,
  returns: ["NUMBER"],
  compute: function(): number {
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
  }
};

// -----------------------------------------------------------------------------
// MIN
// -----------------------------------------------------------------------------
export const MIN: FunctionDescription = {
  description: "Minimum value in a numeric dataset.",
  args: args`
      value1 (number, range<number>) The first value or range to consider when calculating the minimum value.
      value2 (number, range<number>, optional, repeating) Additional values or ranges to consider when calculating the minimum value.
    `,
  returns: ["NUMBER"],
  compute: function(): number {
    const result = reduceNumbers(arguments, (acc, a) => (a < acc ? a : acc), Infinity);
    return result === Infinity ? 0 : result;
  }
};

// -----------------------------------------------------------------------------
// MINA
// -----------------------------------------------------------------------------
export const MINA: FunctionDescription = {
  description: "Minimum numeric value in a dataset.",
  args: args`
      value1 (number, range<number>) The first value or range to consider when calculating the minimum value.
      value2 (number, range<number>, optional, repeating) Additional values or ranges to consider when calculating the minimum value.
    `,
  returns: ["NUMBER"],
  compute: function(): number {
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
  }
};

// -----------------------------------------------------------------------------
// SMALL
// -----------------------------------------------------------------------------
export const SMALL: FunctionDescription = {
  description: "Nth smallest element in a data set.",
  args: args`
      data (any, range) The array or range containing the dataset to consider.
      n (number) The rank from smallest to largest of the element to return.
    `,
  returns: ["NUMBER"],
  compute: function(data: any, n: any): number {
    n = Math.trunc(toNumber(n));
    let largests: number[] = [];
    let index: number;
    let count = 0;
    visitAny(data, d => {
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
      throw new Error(`SMALL has no valid input data.`);
    }
    if (count < n) {
      throw new Error(`Function SMALL parameter 2 value ${n} is out of range.`);
    }
    return result;
  }
};
