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
  }
};
