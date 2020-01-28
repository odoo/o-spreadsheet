import { args } from "./arguments";
import { FunctionMap } from "./index";

export const functions: FunctionMap = {
  CONCAT: {
    description: "",
    args: args`
        number (string)
        numbers (string,optional,repeating)
    `,
    returns: ["STRING"],
    compute: function(...args) {
      return args.map(x => x.toString()).join("");
    }
  }
};
