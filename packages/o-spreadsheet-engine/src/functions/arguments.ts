import {
  AddFunctionDescription,
  ArgDefinition,
  ArgProposal,
  ArgType,
  FunctionDescription,
} from "../types/functions";

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
];

export function arg(
  definition: string,
  description: string = "",
  proposals?: ArgProposal[]
): ArgDefinition {
  return makeArg(definition, description, proposals);
}

function makeArg(str: string, description: string, proposals?: ArgProposal[]): ArgDefinition {
  const parts = str.match(ARG_REGEXP)!;
  const name = parts[1].trim();
  if (!name) {
    throw new Error(`Function argument definition is missing a name: '${str}'.`);
  }
  const types: ArgType[] = [];
  let isOptional = false;
  let isRepeating = false;
  let defaultValue;

  for (const param of parts[2].split(",")) {
    const key = param.trim().toUpperCase();
    const type = ARG_TYPES.find((t) => key === t);
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
  const acceptErrors = types.includes("ANY") || types.includes("RANGE");
  if (acceptErrors) {
    result.acceptErrors = true;
  }
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
  if (types.some((t) => t.startsWith("RANGE"))) {
    result.acceptMatrix = true;
  }
  if (types.every((t) => t.startsWith("RANGE"))) {
    result.acceptMatrixOnly = true;
  }
  if (proposals && proposals.length > 0) {
    result.proposalValues = proposals;
  }
  return result;
}

/**
 * This function adds on description more general information derived from the
 * arguments.
 *
 * This information is useful during compilation.
 */
export function addMetaInfoFromArg(
  name: string,
  addDescr: AddFunctionDescription
): FunctionDescription {
  let countArg = 0;
  let minArg = 0;
  let repeatingArg = 0;
  let optionalArg = 0;
  for (const arg of addDescr.args) {
    countArg++;
    if (!arg.optional && !arg.default) {
      minArg++;
    }
    if (arg.repeating) {
      repeatingArg++;
    }
    if ((arg.optional || arg.default) && !arg.repeating) {
      optionalArg++;
    }
  }
  const descr = addDescr as FunctionDescription;
  descr.minArgRequired = minArg;
  descr.maxArgPossible = repeatingArg ? Infinity : countArg;
  descr.nbrArgRepeating = repeatingArg;
  descr.nbrOptionalNonRepeatingArgs = optionalArg;
  descr.hidden = addDescr.hidden || false;
  descr.name = name;

  return descr;
}

type ArgToFocus = (argPosition: number) => {
  index: number | undefined;
  repeatingGroupIndex?: number;
};
const cacheArgTargeting: Record<string, Record<number, ArgToFocus>> = {};

/**
 * Returns a function that maps the position of a value in a function to its corresponding argument index.
 *
 * In most cases, the task is straightforward:
 *
 * In the formula "=SUM(11, 55, 66)" which is defined like this "SUM(value1, [value2, ...])":
 * - 11 corresponds to the value1 argument => position will be 0
 * - 55 and 66 correspond to the [value2, ...] argument => position will be 1
 *
 * In other cases, optional arguments could be defined after repeatable arguments,
 * or even optional and required arguments could be mixed in unconventional ways.
 *
 * The next function has been designed to handle all possible configurations.
 * The only restriction is if repeatable arguments are present in the function definition:
 * - they must be defined consecutively
 * - they must be in a quantity greater than the optional arguments.
 *
 * The markdown tables below illustrate how values are mapped to positions based on the number of values supplied.
 * Each table represents a different function configuration, with columns representing the number of values supplied as arguments
 * and rows representing the correspondence with the argument index.
 *
 * The tables are built based on the following conventions:
 * - `m`: Mandatory argument (count as one argument)
 * - `o`: Optional argument (count as zero or one argument)
 * - `r`: Repeating argument (count as one or more arguments)
 *
 *
 * Configuration 1: (m, o) like the CEILING function
 *
 * |   | 1 | 2 |
 * |---|---|---|
 * | m | 0 | 0 |
 * | o |   | 1 |
 *
 *
 * Configuration 2: (m, m, m, r, r) like the SUMIFS function
 *
 * |   | 5 | 7    | 3 + 2n     |
 * |---|---|------|------------|
 * | m | 0 | 0    | 0          |
 * | m | 1 | 1    | 1          |
 * | m | 2 | 2    | 2          |
 * | r | 3 | 3, 5 | 3 + 2n     |
 * | r | 4 | 4, 6 | 3 + 2n + 1 |
 *
 *
 * Configuration 3: (m, m, m, r, r, o) like the SWITCH function
 *
 * |   | 5 | 6 | 7    | 8    | 3 + 2n     | 3 + 2n + 1     |
 * |---|---|---|------|------|------------|----------------|
 * | m | 0 | 0 | 0    | 0    | 0          | 0              |
 * | m | 1 | 1 | 1    | 1    | 1          | 1              |
 * | m | 2 | 2 | 2    | 2    | 2          | 2              |
 * | r | 3 | 3 | 3, 5 | 3, 5 | 3 + 2n     | 3 + 2n         |
 * | r | 4 | 4 | 4, 6 | 4, 6 | 3 + 2n + 1 | 3 + 2n + 1     |
 * | o |   | 5 |      | 7    |            | 3 + 2N + 2     |
 *
 *
 * Configuration 4: (m, o, m, o, r, r, r, m) a complex case to understand subtleties
 *
 * |   | 6 | 7 | 8 | 9    | 10   | 11   | ... |
 * |---|---|---|---|------|------|------|-----|
 * | m | 0 | 0 | 0 | 0    | 0    | 0    | ... |
 * | o |   | 1 | 1 |      | 1    | 1    | ... |
 * | m | 1 | 2 | 2 | 1    | 2    | 2    | ... |
 * | o |   |   | 3 |      |      | 3    | ... |
 * | r | 2 | 3 | 4 | 2, 5 | 3, 6 | 4, 7 | ... |
 * | r | 3 | 4 | 5 | 3, 6 | 4, 7 | 5, 8 | ... |
 * | r | 4 | 5 | 6 | 4, 7 | 5, 8 | 6, 9 | ... |
 * | m | 5 | 6 | 7 | 8    | 9    | 10   | ... |
 *
 */
export function argTargeting(
  functionDescription: FunctionDescription,
  nbrArgSupplied: number
): ArgToFocus {
  const functionName = functionDescription.name;
  const result = cacheArgTargeting[functionName]?.[nbrArgSupplied];
  if (result) {
    return result;
  }
  if (!cacheArgTargeting[functionName]) {
    cacheArgTargeting[functionName] = {};
  }
  if (!cacheArgTargeting[functionName][nbrArgSupplied]) {
    cacheArgTargeting[functionName][nbrArgSupplied] = _argTargeting(
      functionDescription,
      nbrArgSupplied
    );
  }
  return cacheArgTargeting[functionName][nbrArgSupplied];
}

export function _argTargeting(
  functionDescription: FunctionDescription,
  nbrArgSupplied: number
): ArgToFocus {
  const valueIndexToArgPosition: Record<
    number,
    { index: number | undefined; repeatingGroupIndex?: number }
  > = {};
  const groupsOfOptionalRepeatingValues = functionDescription.nbrArgRepeating
    ? Math.floor(
        (nbrArgSupplied - functionDescription.minArgRequired) / functionDescription.nbrArgRepeating
      )
    : 0;
  const nbrValueOptionalRepeating =
    functionDescription.nbrArgRepeating * groupsOfOptionalRepeatingValues;
  const nbrValueOptional =
    nbrArgSupplied - functionDescription.minArgRequired - nbrValueOptionalRepeating;

  let countValueSupplied = 0;
  let countValueOptional = 0;

  for (let i = 0; i < functionDescription.args.length; i++) {
    const arg = functionDescription.args[i];

    if ((arg.optional || arg.default) && !arg.repeating) {
      if (countValueOptional < nbrValueOptional) {
        valueIndexToArgPosition[countValueSupplied] = { index: i };
        countValueSupplied++;
      }
      countValueOptional++;
      continue;
    }

    if (arg.repeating) {
      const groupOfMandatoryRepeatingValues = arg.optional ? 0 : 1;
      // As we know all repeating arguments are consecutive,
      // --> we will treat all repeating arguments in one go
      // --> the index i will be incremented by the number of repeating values at the end of the loop
      for (let j = 0; j < groupsOfOptionalRepeatingValues + groupOfMandatoryRepeatingValues; j++) {
        for (let k = 0; k < functionDescription.nbrArgRepeating; k++) {
          valueIndexToArgPosition[countValueSupplied] = { index: i + k, repeatingGroupIndex: j };
          countValueSupplied++;
        }
      }
      i += functionDescription.nbrArgRepeating - 1;
      continue;
    }

    // End case: it's a required argument
    valueIndexToArgPosition[countValueSupplied] = { index: i };
    countValueSupplied++;
  }

  return (argPosition: number) => {
    return valueIndexToArgPosition[argPosition];
  };
}

//------------------------------------------------------------------------------
// Argument validation
//------------------------------------------------------------------------------

export function validateArguments(descr: FunctionDescription) {
  if (descr.nbrArgRepeating && descr.nbrOptionalNonRepeatingArgs >= descr.nbrArgRepeating) {
    throw new Error(`Function ${descr.name} has more optional arguments than repeatable ones.`);
  }

  let foundRepeating = false;
  let consecutiveRepeating = false;
  for (const current of descr.args) {
    if (current.repeating) {
      if (!consecutiveRepeating && foundRepeating) {
        throw new Error(
          `Function ${descr.name} has non-consecutive repeating arguments. All repeating arguments must be declared consecutively.`
        );
      }
      foundRepeating = true;
      consecutiveRepeating = true;
    } else {
      consecutiveRepeating = false;
    }
  }
}
