import { args, toNumber, isNumber } from "./arguments";
import { FunctionDescription } from "./index";

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
    let sum = 0;
    let count = 0;
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (typeof j === "number") {
              sum += j;
              count += 1;
            }
          }
        }
      } else {
        n = toNumber(n);
        sum += n;
        count += 1;
      }
    }
    if (count === 0) {
      throw new Error(`
        Evaluation of function AVERAGE caused a divide by zero error.`);
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
    let max = -Infinity;
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (typeof j === "number") {
              if (max < j) {
                max = j;
              }
            }
          }
        }
      } else {
        n = toNumber(n);
        if (max < n) {
          max = n;
        }
      }
    }
    return max === -Infinity ? 0 : max;
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
    let min = Infinity;
    for (let n of arguments) {
      if (Array.isArray(n)) {
        for (let i of n) {
          for (let j of i) {
            if (typeof j === "number") {
              if (j < min) {
                min = j;
              }
            }
          }
        }
      } else {
        n = toNumber(n);
        if (n < min) {
          min = n;
        }
      }
    }
    return min === Infinity ? 0 : min;
  }
};
