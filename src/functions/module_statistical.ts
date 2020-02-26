import { args, NumberOrRange } from "./arguments";
import { FunctionMap } from "./index";

export const functions: FunctionMap = {
  AVERAGE: {
    description: `Numerical average value in a dataset, ignoring text.`,
    args: args`
      value1 (number, range<number>) The first value or range to consider when calculating the average value.
      value2 (number, range<number>, optional, repeating) Additional values or ranges to consider when calculating the average value.
    `,
    returns: ["NUMBER"],
    compute: function(...args: NumberOrRange[]): number {
      let sum = 0;
      let count = 0;
      for (let n of args) {
        if (Array.isArray(n)) {
          for (let i of n) {
            for (let j of i) {
              if (j !== undefined) {
                sum += j;
                count += 1;
              }
            }
          }
        } else {
          if (n !== undefined) {
            sum += n;
            count += 1;
          }
        }
      }
      if (count === 0) {
        throw new Error(`
          Evaluation of function AVERAGE caused a divide by zero error.`);
      }
      return sum / count;
    }
  },

  "AVERAGE.WEIGHTED": {
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
    compute: function(...args: NumberOrRange[]): number {
      let sum = 0;
      let count = 0;
      let value;
      let weight;
      const rangeError = `
          AVERAGE.WEIGHTED has mismatched range sizes.
      `;
      const negativeWeightError = `
          AVERAGE.WEIGHTED expects the weight to be positive or equal to 0.
      `;
      if (args.length % 2 === 1) {
        throw new Error(`
          Wrong number of arguments. Expected an even number of arguments.
      `);
      }
      for (let n = 0; n < args.length - 1; n += 2) {
        value = args[n];
        weight = args[n + 1];
        if (typeof value != typeof weight) {
          throw new Error(rangeError);
        }
        if (Array.isArray(value)) {
          let dimColValue = value.length;
          let dimLinValue = value[0].length;
          if (dimColValue !== weight.length || dimLinValue != weight[0].length) {
            throw new Error(rangeError);
          }
          for (let i = 0; i < dimColValue; i++) {
            for (let j = 0; j < dimLinValue; j++) {
              let subValue = value[i][j];
              let subWeight = weight[i][j];
              // typeof subValue or subWeight can be 'number' or 'undefined'
              if (typeof subValue !== typeof subWeight) {
                throw new Error(`
                  AVERAGE.WEIGHTED expects number values.
                `);
              }
              if (typeof subValue !== "undefined") {
                if (subWeight < 0) {
                  throw new Error(negativeWeightError);
                }
                sum += subValue * subWeight;
                count += subWeight;
              }
            }
          }
        } else {
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
  }
};
