import { CellValue } from "../types/cells";
import { BadExpressionError, EvaluationError } from "../types/errors";

import { _t } from "../translation";
import { ComputeFunction, EvalContext, FunctionDescription } from "../types/functions";
import { Arg, FunctionResultObject, isMatrix, Matrix } from "../types/misc";
import { argTargeting } from "./arguments";
import { applyVectorization, isEvaluationError, matrixForEach, matrixMap } from "./helpers";

export function createComputeFunction(
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

    return applyVectorization(errorHandlingCompute.bind(this), args, acceptToVectorize);
  }

  function errorHandlingCompute(
    this: EvalContext,
    ...args: Arg[]
  ): Matrix<FunctionResultObject> | FunctionResultObject {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const getArgToFocus = argTargeting(descr, args.length);
      const argDefinition = descr.args[getArgToFocus(i) ?? i];

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
        replaceFunctionNamePlaceholder(result, descr.name);
        return result;
      }
      return { value: result };
    }

    if (typeof result[0][0] === "object" && result[0][0] !== null && "value" in result[0][0]) {
      matrixForEach(result as Matrix<FunctionResultObject>, (result) =>
        replaceFunctionNamePlaceholder(result, descr.name)
      );
      return result as Matrix<FunctionResultObject>;
    }

    return matrixMap(result as Matrix<CellValue>, (row) => ({ value: row }));
  }

  return vectorizedCompute;
}

export function handleError(e: unknown, functionName: string): FunctionResultObject {
  // the error could be a user error (instance of EvaluationError)
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
