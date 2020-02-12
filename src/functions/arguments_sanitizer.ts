import { Arg } from "./arguments";

//------------------------------------------------------------------------------
// Wrapping functions for arguments sanitization
//------------------------------------------------------------------------------
export function protectFunction(fn: Function, argList: Arg[]): Function {
  if (argList.length === 0) {
    return fn;
  }
  return function(this: any, ...args: any[]) {
    args = sanitizeArgs(args, argList);
    return fn.call(this, ...args);
  };
}

/**
 * If you read this, and are horrified by the code, worry not, dear friend.
 * This code is here only for a while, to solidify the test suite and prepare
 * the future. It will be replaced by a shiny argument sanitizer compiler soon.
 *
 * Note: this function modifies args in place!
 */
export function sanitizeArgs(args: any[], argList: Arg[]): any[] {
  for (let i = 0; i < argList.length; i++) {
    const descr = argList[i];
    if (!(i in args) && !descr.optional) {
      throw new Error("Wrong number of arguments. Expected 1, but got 0 argument instead.");
    }
    let arg = args[i];
    if (arg === undefined && descr.optional) {
      if (descr.default !== undefined) {
        arg = descr.default;
        args[i] = arg;
      } else {
        args = args.slice(0, i);
        break;
      }
    }
    if (descr.repeating) {
      for (let j = i; j < args.length; j++) {
        sanitizeArg(args, j, args[j], descr);
      }
      return args;
    }
    sanitizeArg(args, i, arg, descr);
  }
  if (args.length > argList.length) {
    throw new Error(
      `Wrong number of arguments. Expected ${argList.length}, but got ${args.length} arguments instead.`
    );
  }
  return args;
}

function sanitizeArg(args: any[], i: number, arg: any, descr: Arg) {
  if (arg === undefined) {
    if (descr.type.includes("NUMBER")) {
      args[i] = 0;
    }
    if (descr.type.includes("BOOLEAN")) {
      args[i] = false;
    }
  } else if (typeof arg === "boolean" && !descr.type.includes("BOOLEAN")) {
    const nIndex = descr.type.indexOf("NUMBER");
    const sIndex = descr.type.indexOf("STRING");
    if (nIndex > -1 && sIndex < 0) {
      args[i] = arg ? 1 : 0;
    }
    if (nIndex < 0 && sIndex > -1) {
      args[i] = arg ? "TRUE" : "FALSE";
    }
    if (nIndex > -1 && sIndex > -1) {
      if (nIndex < sIndex) {
        args[i] = arg ? 1 : 0;
      } else {
        args[i] = arg ? "TRUE" : "FALSE";
      }
    }
  } else if (typeof arg === "string") {
    if (descr.type.includes("NUMBER") && !descr.type.includes("STRING")) {
      if (arg) {
        const n = Number(arg);
        if (isNaN(n)) {
          throw new Error(
            `Argument "${descr.name}" should be a number, but "${arg}" is a text, and cannot be coerced to a number.`
          );
        }
      } else {
        args[i] = 0;
      }
      args[i] = arg ? parseFloat(arg) : 0;
    } else if (descr.type.includes("BOOLEAN")) {
      if (arg === "") {
        /**
         * @compatibility Note: this is not the way Google Sheets behave:
         *
         * =if("", 1, 2) is evaluated to 2
         * =or("", 1) throws an error
         *
         * It is not clear (to me) why in the first expression it looks like it
         * is accepted, but not in the second.
         */
        args[i] = false;
      } else if (arg.toUpperCase() === "TRUE") {
        args[i] = true;
      } else if (arg.toUpperCase() === "FALSE") {
        args[i] = false;
      } else {
        throw new Error(
          `Argument "${descr.name}" should be a boolean, but "${arg}" is a text, and cannot be coerced to a boolean.`
        );
      }
    }
  } else if (typeof arg === "number") {
    if (descr.type.includes("BOOLEAN")) {
      args[i] = arg ? true : false;
    } else if (descr.type.includes("STRING") && !descr.type.includes("NUMBER")) {
      args[i] = arg.toString();
    } else if (!descr.type.includes("NUMBER") && !descr.type.includes("ANY")) {
      throw new Error(`Argument "${descr.name}" has the wrong type`);
    }
  } else if (arg instanceof Array) {
    if (descr.type.includes("RANGE<NUMBER>")) {
      for (let col of arg) {
        for (let i = 0; i < col.length; i++) {
          const val = col[i];
          if (typeof val !== "number") {
            col[i] = undefined;
          }
        }
      }
    }
    if (descr.type.includes("RANGE<BOOLEAN>")) {
      for (let col of arg) {
        for (let i = 0; i < col.length; i++) {
          const val = col[i];
          if (typeof val !== "boolean") {
            col[i] = undefined;
          }
        }
      }
    }
    if (descr.type.includes("RANGE<STRING>")) {
      for (let col of arg) {
        for (let i = 0; i < col.length; i++) {
          const val = col[i];
          if (typeof val !== "string") {
            col[i] = undefined;
          }
        }
      }
    }
  }
}
