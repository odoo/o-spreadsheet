import { Registry } from "../registries/registry";
import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  CellValue,
  ComputeFunction,
  EvalContext,
  FPayload,
  FunctionDescription,
  Matrix,
  isMatrix,
} from "../types";
import { EvaluationError } from "../types/errors";
import { addMetaInfoFromArg, validateArguments } from "./arguments";
import { isEvaluationError, matrixForEach, matrixMap } from "./helpers";
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
];

const functionNameRegex = /^[A-Z0-9\_\.]+$/;

//------------------------------------------------------------------------------
// Function registry
//------------------------------------------------------------------------------
class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: {
    [key: string]: ComputeFunction<Matrix<FPayload> | FPayload>;
  } = {};

  add(name: string, addDescr: AddFunctionDescription) {
    name = name.toUpperCase();
    if (!functionNameRegex.test(name)) {
      throw new Error(
        _t(
          "Invalid function name %s. Function names can exclusively contain alphanumerical values separated by dots (.) or underscore (_)",
          name
        )
      );
    }
    const descr = addMetaInfoFromArg(addDescr);
    validateArguments(descr.args);
    this.mapping[name] = addErrorHandling(addResultHandling(addInputHandling(descr), name), name);
    super.add(name, descr);
    return this;
  }
}

function addInputHandling(
  descr: FunctionDescription
): ComputeFunction<FPayload | Matrix<FPayload> | CellValue | Matrix<CellValue>> {
  function computeWithInputHandling(
    this: EvalContext,
    ...args: Arg[]
  ): FPayload | Matrix<FPayload> | CellValue | Matrix<CellValue> {
    for (let i = 0; i < args.length; i++) {
      const argDefinition = descr.args[descr.getArgToFocus(i + 1) - 1];
      const arg = args[i];
      if (isMatrix(arg) && !argDefinition.acceptMatrix) {
        if (arg.length !== 1 || arg[0].length !== 1) {
          throw new EvaluationError(
            _t(
              "Function [[FUNCTION_NAME]] expects the parameter '%s' to be a single value or a single cell reference, not a range.",
              argDefinition.name
            )
          );
        }
        args[i] = arg[0][0];
      }
    }
    return descr.compute.apply(this, args);
  }

  return computeWithInputHandling;
}

function addErrorHandling(
  compute: ComputeFunction<Matrix<FPayload> | FPayload>,
  functionName: string
): ComputeFunction<Matrix<FPayload> | FPayload> {
  return function (this: EvalContext, ...args: Arg[]): Matrix<FPayload> | FPayload {
    try {
      return compute.apply(this, args);
    } catch (e) {
      return handleError(e, functionName);
    }
  };
}

export const implementationErrorMessage = _t(
  "An unexpected error occurred. Submit a support ticket at odoo.com/help."
);

function handleError(e: unknown, functionName: string): FPayload {
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

function hasStringMessage(obj: unknown): obj is { message: string } {
  return (
    (obj as { message: string })?.message !== undefined &&
    typeof (obj as { message: string }).message === "string"
  );
}

function addResultHandling(
  compute: ComputeFunction<FPayload | Matrix<FPayload> | CellValue | Matrix<CellValue>>,
  functionName: string
): ComputeFunction<FPayload | Matrix<FPayload>> {
  return function computeWithResultHandling(
    this: EvalContext,
    ...args: Arg[]
  ): FPayload | Matrix<FPayload> {
    const result = compute.apply(this, args);

    if (!isMatrix(result)) {
      if (typeof result === "object" && result !== null && "value" in result) {
        replaceFunctionNamePlaceholder(result, functionName);
        return result;
      }
      return { value: result };
    }

    if (typeof result[0][0] === "object" && result[0][0] !== null && "value" in result[0][0]) {
      matrixForEach(result as Matrix<FPayload>, (result) =>
        replaceFunctionNamePlaceholder(result, functionName)
      );
      return result as Matrix<FPayload>;
    }

    return matrixMap(result as Matrix<CellValue>, (row) => ({ value: row }));
  };
}

function replaceFunctionNamePlaceholder(fPayload: FPayload, functionName: string) {
  // for performance reasons: change in place and only if needed
  if (fPayload.message?.includes("[[FUNCTION_NAME]]")) {
    fPayload.message = fPayload.message.replace("[[FUNCTION_NAME]]", functionName);
  }
}

export const functionRegistry = new FunctionRegistry();

for (let category of categories) {
  const fns = category.functions;
  for (let name in fns) {
    const addDescr = fns[name];
    addDescr.category = addDescr.category || category.name;
    name = name.replace(/_/g, ".");
    functionRegistry.add(name, { isExported: false, ...addDescr });
  }
}
