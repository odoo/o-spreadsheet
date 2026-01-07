import { Registry } from "../registries/registry";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  CellValue,
  ComputeFunction,
  EvalContext,
  FunctionDescription,
  FunctionResultObject,
  Matrix,
  isMatrix,
} from "../types";
import { BadExpressionError, EvaluationError } from "../types/errors";
import { addMetaInfoFromArg, argTargeting, validateArguments } from "./arguments";
import { applyVectorization, isEvaluationError, matrixForEach, matrixMap } from "./helpers";
import * as array from "./module_array";
import * as misc from "./module_custom";
import * as database from "./module_database";
import * as date from "./module_date";
import * as engineering from "./module_engineering";
import * as filter from "./module_filter";
import * as financial from "./module_financial";
import * as info from "./module_info";
import * as logical from "./module_logical";
import * as lookup from "./module_lookup";
import * as math from "./module_math";
import * as operators from "./module_operators";
import * as parser from "./module_parser";
import * as statistical from "./module_statistical";
import * as text from "./module_text";
import * as web from "./module_web";

export { arg } from "./arguments";

type Functions = { [functionName: string]: AddFunctionDescription };
type Category = { name: string; functions: Functions };
const categories: Category[] = [
  { name: _t("Array"), functions: array },
  { name: _t("Database"), functions: database },
  { name: _t("Date"), functions: date },
  { name: _t("Filter"), functions: filter },
  { name: _t("Financial"), functions: financial },
  { name: _t("Info"), functions: info },
  { name: _t("Lookup"), functions: lookup },
  { name: _t("Logical"), functions: logical },
  { name: _t("Math"), functions: math },
  { name: _t("Misc"), functions: misc },
  { name: _t("Operator"), functions: operators },
  { name: _t("Statistical"), functions: statistical },
  { name: _t("Text"), functions: text },
  { name: _t("Engineering"), functions: engineering },
  { name: _t("Web"), functions: web },
  { name: _t("Parser"), functions: parser },
];

const functionNameRegex = /^[A-Z0-9\_\.]+$/;

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------

export class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: {
    [key: string]: ComputeFunction<Matrix<FunctionResultObject> | FunctionResultObject>;
  } = {};

  add(name: string, addDescr: AddFunctionDescription) {
    name = name.toUpperCase();
    if (name in this.content) {
      throw new Error(`${name} is already present in this registry!`);
    }
    return this.replace(name, addDescr);
  }

  replace(name: string, addDescr: AddFunctionDescription) {
    name = name.toUpperCase();
    if (!functionNameRegex.test(name)) {
      throw new Error(
        _t(
          "Invalid function name %s. Function names can exclusively contain alphanumerical values separated by dots (.) or underscore (_)",
          name
        )
      );
    }
    const descr = addMetaInfoFromArg(name, addDescr);
    validateArguments(descr);
    this.mapping[name] = createComputeFunction(descr);
    super.replace(name, descr);
    return this;
  }
}

export const functionRegistry: FunctionRegistry = new FunctionRegistry();

for (const category of categories) {
  const fns = category.functions;
  for (let name in fns) {
    const addDescr = fns[name];
    addDescr.category = addDescr.category || category.name;
    name = name.replace(/_/g, ".");
    functionRegistry.add(name, { isExported: false, ...addDescr });
  }
}

//------------------------------------------------------------------------------
// CREATE COMPUTE FUNCTION
//------------------------------------------------------------------------------

function createComputeFunction(
  descr: FunctionDescription
): ComputeFunction<Matrix<FunctionResultObject> | FunctionResultObject> {
  function vectorizedCompute(
    this: EvalContext,
    ...args: Arg[]
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    const acceptToVectorize: boolean[] = [];

    const getArgToFocus = argTargeting(descr, args.length);
    //#region Compute vectorisation limits
    for (let i = 0; i < args.length; i++) {
      const argIndex = getArgToFocus(i) ?? -1;
      const argDefinition = descr.args[argIndex];
      const arg = args[i];
      if (!isMatrix(arg) && argDefinition.acceptMatrixOnly) {
        throw new BadExpressionError(
          _t(
            "Function %s expects the parameter '%s' to be reference to a cell or range.",
            descr.name,
            (i + 1).toString()
          )
        );
      }
      acceptToVectorize.push(!argDefinition.acceptMatrix);
    }

    return replaceErrorPlaceholderInResult(
      applyVectorization(errorHandlingCompute.bind(this), args, acceptToVectorize)
    );
  }

  function replaceErrorPlaceholderInResult(
    result: FunctionResultObject | Matrix<FunctionResultObject>
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    if (!isMatrix(result)) {
      replaceFunctionNamePlaceholder(result, descr.name);
    } else {
      matrixForEach(result, (result) => replaceFunctionNamePlaceholder(result, descr.name));
    }
    return result;
  }

  function errorHandlingCompute(
    this: EvalContext,
    ...args: Arg[]
  ): Matrix<FunctionResultObject> | FunctionResultObject {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const getArgToFocus = argTargeting(descr, args.length);
      const argDefinition = descr.args[getArgToFocus(i) || i];

      // Early exit if the argument is an error and the function does not accept errors
      // We only check scalar arguments, not matrix arguments for performance reasons.
      // Casting helpers are responsible for handling errors in matrix arguments.
      if (!argDefinition.acceptErrors && !isMatrix(arg) && isEvaluationError(arg?.value)) {
        return arg;
      }
    }
    try {
      return computeFunctionToObject.apply(this, args);
    } catch (e) {
      return handleError(e, descr.name);
    }
  }

  function computeFunctionToObject(
    this: EvalContext,
    ...args: Arg[]
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    if (this.debug) {
      // eslint-disable-next-line no-debugger
      debugger;
    }
    const result = descr.compute.apply(this, args);

    if (!isMatrix(result)) {
      if (typeof result === "object" && result !== null && "value" in result) {
        return result;
      }
      descr.name;
      return { value: result };
    }

    if (typeof result[0][0] === "object" && result[0][0] !== null && "value" in result[0][0]) {
      return result as Matrix<FunctionResultObject>;
    }

    return matrixMap(result as Matrix<CellValue>, (row) => ({ value: row }));
  }

  return vectorizedCompute;
}

export function handleError(e: unknown, functionName: string): FunctionResultObject {
  // the error could be an user error (instance of EvaluationError)
  // or a javascript error (instance of Error)
  // we don't want block the user with an implementation error
  // so we fallback to a generic error
  if (hasStringValue(e) && isEvaluationError(e.value)) {
    if (hasStringMessage(e)) {
      replaceFunctionNamePlaceholder(e, functionName);
    }
    return e;
  }
  console.error(e);
  return new EvaluationError(
    implementationErrorMessage + (hasStringMessage(e) ? " " + e.message : "")
  );
}

function hasStringValue(obj: unknown): obj is { value: string } {
  return (
    (obj as { value: string })?.value !== undefined &&
    typeof (obj as { value: string }).value === "string"
  );
}

function replaceFunctionNamePlaceholder(
  functionResult: FunctionResultObject,
  functionName: string
) {
  // for performance reasons: change in place and only if needed
  if (functionResult.message?.includes("[[FUNCTION_NAME]]")) {
    functionResult.message = functionResult.message.replace("[[FUNCTION_NAME]]", functionName);
  }
}

export const implementationErrorMessage = _t(
  "An unexpected error occurred. Submit a support ticket at odoo.com/help."
);

function hasStringMessage(obj: unknown): obj is { message: string } {
  return (
    (obj as { message: string })?.message !== undefined &&
    typeof (obj as { message: string }).message === "string"
  );
}
