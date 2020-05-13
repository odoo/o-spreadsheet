import { args } from "./arguments";
import { FunctionDescription } from "../types";
import { toNativeDate } from "../functions/dates";

// -----------------------------------------------------------------------------
// MONTH
// -----------------------------------------------------------------------------
export const MONTH: FunctionDescription = {
  description: "Month of the year a specific date falls in",
  args: args`
      date (date) The date from which to extract the month.
    `,
  returns: ["NUMBER"],
  compute: function (date: any): number {
    return toNativeDate(date).getMonth() + 1;
  },
};
