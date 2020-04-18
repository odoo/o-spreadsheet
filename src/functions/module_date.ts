import { args } from "./arguments";
import { FunctionDescription } from "../types";
import { toNativeDate } from "../helpers/index";

// -----------------------------------------------------------------------------
// MONTH
// -----------------------------------------------------------------------------
export const MONTH: FunctionDescription = {
  description: "Month of the year a specific date falls in",
  args: args`
      date (date) A date
    `,
  returns: ["NUMBER"],
  compute: function (date: any): number {
    if (typeof date === "object") {
      return toNativeDate(date).getMonth() + 1;
    }
    throw new Error(
      `Function MONTH parameter 1 expects date values. But ${date} is a text and cannot be coerced to a date.`
    );
  },
};
