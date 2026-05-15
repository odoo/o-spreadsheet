import { EvaluationError } from "../types/errors";

import { _t } from "../translation";
import {
  ComputeArrayFunction,
  ComputeFunction,
  EvalContext,
  FunctionDescription,
} from "../types/functions";
import { Arg, FunctionResultObject, isMatrix, Matrix, UnboundedZone } from "../types/misc";
import { argTargeting } from "./arguments";
import { isEvaluationError, matrixForEach } from "./helpers";

export function createComputeFunction(
  descr: FunctionDescription
): ComputeFunction | ComputeArrayFunction {
  if (descr.computeArray !== undefined) {
    function errorHandlingComputeArray(
      this: EvalContext,
      zone: UnboundedZone,
      ...args: Arg[]
    ): Matrix<FunctionResultObject> | FunctionResultObject {
      const errorResult = argsError(args, descr);
      if (errorResult) {
        return errorResult;
      }
      try {
        if (this.debug) {
          // eslint-disable-next-line no-debugger
          debugger;
          this.debug = false;
        }
        const result = descr.computeArray!.apply(this, [zone, ...args]);
        return replaceErrorPlaceholderInResult(result, descr);
      } catch (e) {
        return handleError(e, descr.name);
      }
    }

    return errorHandlingComputeArray;
  }

  function errorHandlingCompute(this: EvalContext, ...args: Arg[]): FunctionResultObject {
    const errorResult = argsError(args, descr);
    if (errorResult) {
      return errorResult;
    }
    try {
      if (this.debug) {
        // eslint-disable-next-line no-debugger
        debugger;
        this.debug = false;
      }

      const result = descr.compute!.apply(this, args);
      return replaceErrorPlaceholderInResult(result, descr);
    } catch (e) {
      return handleError(e, descr.name);
    }
  }

  return errorHandlingCompute;
}

/**
 * Early exit if the argument is an error and the function does not accept errors
 * We only check scalar arguments, not matrix arguments for performance reasons.
 * Casting helpers are responsible for handling errors in matrix arguments.
 */
function argsError(args: Arg[], descr: FunctionDescription): FunctionResultObject | undefined {
  const argsToFocus = argTargeting(descr, args.length);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const argDefinition = descr.args[argsToFocus[i].index];
    if (!argDefinition.acceptErrors && !isMatrix(arg) && isEvaluationError(arg?.value)) {
      return arg;
    }
  }
  return undefined;
}

function replaceErrorPlaceholderInResult<
  T extends FunctionResultObject | Matrix<FunctionResultObject>
>(result: T, descr: FunctionDescription): T {
  if (!isMatrix(result)) {
    replaceFunctionNamePlaceholder(result, descr.name);
  } else {
    matrixForEach(result, (result) => replaceFunctionNamePlaceholder(result, descr.name));
  }
  return result;
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
