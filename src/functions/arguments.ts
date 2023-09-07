import { _t } from "../translation";
import { AddFunctionDescription, ArgDefinition, ArgType, FunctionDescription } from "../types";

//------------------------------------------------------------------------------
// Arg description DSL
//------------------------------------------------------------------------------

const ARG_REGEXP = /(.*?)\((.*?)\)(.*)/;
const ARG_TYPES: ArgType[] = [
  "ANY",
  "BOOLEAN",
  "DATE",
  "NUMBER",
  "STRING",
  "RANGE",
  "RANGE<BOOLEAN>",
  "RANGE<DATE>",
  "RANGE<NUMBER>",
  "RANGE<STRING>",
  "META",
];

export function arg(definition: string, description: string = ""): ArgDefinition {
  return makeArg(definition, description);
}

function makeArg(str: string, description: string): ArgDefinition {
  let parts = str.match(ARG_REGEXP)!;
  let name = parts[1].trim();
  if (!name) {
    throw new Error(`Function argument definition is missing a name: '${str}'.`);
  }
  let types: ArgType[] = [];
  let isOptional = false;
  let isRepeating = false;
  let defaultValue;

  for (let param of parts[2].split(",")) {
    const key = param.trim().toUpperCase();
    let type = ARG_TYPES.find((t) => key === t);
    if (type) {
      types.push(type);
    } else if (key === "RANGE<ANY>") {
      types.push("RANGE");
    } else if (key === "OPTIONAL") {
      isOptional = true;
    } else if (key === "REPEATING") {
      isRepeating = true;
    } else if (key.startsWith("DEFAULT=")) {
      defaultValue = param.trim().slice(8);
    }
  }
  const result: ArgDefinition = {
    name,
    description,
    type: types,
  };
  if (isOptional) {
    result.optional = true;
  }
  if (isRepeating) {
    result.repeating = true;
  }
  if (defaultValue !== undefined) {
    result.default = true;
    result.defaultValue = defaultValue;
  }
  return result;
}

/**
 * This function adds on description more general information derived from the
 * arguments.
 *
 * This information is useful during compilation.
 */
export function addMetaInfoFromArg(addDescr: AddFunctionDescription): FunctionDescription {
  let countArg = 0;
  let minArg = 0;
  let repeatingArg = 0;
  for (let arg of addDescr.args) {
    countArg++;
    if (!arg.optional && !arg.repeating && !arg.default) {
      minArg++;
    }
    if (arg.repeating) {
      repeatingArg++;
    }
  }
  const descr = addDescr as FunctionDescription;
  descr.minArgRequired = minArg;
  descr.maxArgPossible = repeatingArg ? Infinity : countArg;
  descr.nbrArgRepeating = repeatingArg;
  descr.getArgToFocus = argTargeting(countArg, repeatingArg);
  descr.hidden = addDescr.hidden || false;

  return descr;
}

/**
 * Returns a function allowing finding which argument corresponds a position
 * in a function. This is particularly useful for functions with repeatable
 * arguments.
 *
 * Indeed the function makes it possible to etablish corespondance between
 * arguments when the number of arguments supplied is greater than the number of
 * arguments defined by the function.
 *
 * Ex:
 *
 * in the formula "=SUM(11, 55, 66)" which is defined like this "SUM(value1, [value2, ...])"
 * - 11 corresponds to the value1 argument => position will be 1
 * - 55 corresponds to the [value2, ...] argument => position will be 2
 * - 66 corresponds to the [value2, ...] argument => position will be 2
 *
 * in the formula "=AVERAGE.WEIGHTED(1, 2, 3, 4, 5, 6)" which is defined like this
 * "AVERAGE.WEIGHTED(values, weights, [additional_values, ...], [additional_weights, ...])"
 * - 1 corresponds to the values argument => position will be 1
 * - 2 corresponds to the weights argument => position will be 2
 * - 3 corresponds to the [additional_values, ...] argument => position will be 3
 * - 4 corresponds to the [additional_weights, ...] argument => position will be 4
 * - 5 corresponds to the [additional_values, ...] argument => position will be 3
 * - 6 corresponds to the [additional_weights, ...] argument => position will be 4
 */
function argTargeting(countArg, repeatingArg): (argPosition: number) => number {
  if (!repeatingArg) {
    return (argPosition) => argPosition;
  }
  if (repeatingArg === 1) {
    return (argPosition) => Math.min(argPosition, countArg);
  }
  const argBeforeRepeat = countArg - repeatingArg;
  return (argPosition) => {
    if (argPosition <= argBeforeRepeat) {
      return argPosition;
    }
    const argAfterRepeat = (argPosition - argBeforeRepeat) % repeatingArg || repeatingArg;
    return argBeforeRepeat + argAfterRepeat;
  };
}

//------------------------------------------------------------------------------
// Argument validation
//------------------------------------------------------------------------------

export function validateArguments(args: ArgDefinition[]) {
  let previousArgRepeating: boolean | undefined = false;
  let previousArgOptional: boolean | undefined = false;
  let previousArgDefault: boolean | undefined = false;
  for (let current of args) {
    if (current.type.includes("META") && current.type.length > 1) {
      throw new Error(
        _t(
          "Function ${name} has an argument that has been declared with more than one type whose type 'META'. The 'META' type can only be declared alone."
        )
      );
    }

    if (previousArgRepeating && !current.repeating) {
      throw new Error(
        _t(
          "Function ${name} has no-repeatable arguments declared after repeatable ones. All repeatable arguments must be declared last."
        )
      );
    }
    const previousIsOptional = previousArgOptional || previousArgRepeating || previousArgDefault;
    const currentIsntOptional = !(current.optional || current.repeating || current.default);
    if (previousIsOptional && currentIsntOptional) {
      throw new Error(
        _t(
          "Function ${name} has at mandatory arguments declared after optional ones. All optional arguments must be after all mandatory arguments."
        )
      );
    }
    previousArgRepeating = current.repeating;
    previousArgOptional = current.optional;
    previousArgDefault = current.default;
  }
}
