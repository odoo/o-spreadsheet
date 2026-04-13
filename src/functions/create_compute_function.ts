import { CellValue } from "../types/cells";
import { BadExpressionError, EvaluationError, NotAvailableError } from "../types/errors";

import { _t } from "../translation";
import {
  AddFunctionDescription,
  ComputeFunction,
  EvalContext,
  FunctionDescription,
} from "../types/functions";
import { Arg, FunctionResultObject, isMatrix, Matrix } from "../types/misc";
import { addMetaInfoFromArg, argTargeting } from "./arguments";
import { generateMatrix, isEvaluationError, matrixForEach, matrixMap } from "./helpers";

type VectorArgType = "horizontal" | "vertical" | "matrix";

/**
 * Enables a formula function to accept matrix or vector inputs instead of simple value, computing results across multiple dimensions.
 *
 * ```
 *                    /         |‾                 ‾| \        |‾                                                    ‾|
 *                   |          | [A]               |  |       | compute(A, D, E), compute(A, D, F), compute(A, D, G) |
 * applyVectorization| compute, | [B], D, [E, F, G] |  |  <=>  | compute(B, D, E), compute(B, D, F), compute(B, D, G) |
 *                   |          | [C]               |  |       | compute(C, D, E), compute(C, D, F), compute(C, D, G) |
 *                    \         |_                 _| /        |_                                                    _|
 * ```
 *
 * By default, all arguments are vectorized. To control which arguments are vectorized,
 * pass an `acceptToVectorize` boolean array of the same length as `args`:
 * - `true`  enables vectorization for that argument
 * - `false` disables vectorization for that argument
 *
 * For example, with `[true, true, false]` on previous example you get:
 *
 * ```
 * |‾                        ‾|
 * | compute(A, D, [E, F, G]) |
 * | compute(B, D, [E, F, G]) |
 * | compute(C, D, [E, F, G]) |
 * |_                        _|
 * ```
 *
 * @remarks
 * This helper is automatically applied (by default) to **all** `compute` functions
 * across the various spreadsheet formula modules:
 * - If an argument is declared **scalar** (not `"range"`), it is vectorized.
 * - If **all** arguments are declared **ranges**, no vectorization occurs.
 *   - e.g. `SUM(A1:B2)` returns a 1×1 sum over the range.
 *   - e.g. `COS(A1:B2)` over `A1:B2` returns a 2×2 element-wise result.
 * - For special behaviors (e.g. the `IF` function), you may declare all arguments
 *   as ranges and invoke this helper directly within your `compute` implementation.
 */
export function applyVectorization(
  context: EvalContext,
  descr: FunctionDescription,
  name: string,
  args: Arg[],
  acceptToVectorize: boolean[] | undefined = undefined
): FunctionResultObject | Matrix<FunctionResultObject> {
  const formula = createErrorHandlingCompute(descr, name).bind(context);
  let countVectorizedCol = 1;
  let countVectorizedRow = 1;
  let vectorizedColLimit = Infinity;
  let vectorizedRowLimit = Infinity;

  let vectorArgsType: VectorArgType[] | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (isMatrix(arg) && (acceptToVectorize === undefined || acceptToVectorize[i])) {
      const nColumns = arg.length;
      const nRows = arg[0].length;
      if (nColumns !== 1 || nRows !== 1) {
        vectorArgsType ??= new Array(args.length);
        if (nColumns !== 1 && nRows !== 1) {
          vectorArgsType[i] = "matrix";
          countVectorizedCol = Math.max(countVectorizedCol, nColumns);
          countVectorizedRow = Math.max(countVectorizedRow, nRows);
          vectorizedColLimit = Math.min(vectorizedColLimit, nColumns);
          vectorizedRowLimit = Math.min(vectorizedRowLimit, nRows);
        } else if (nColumns !== 1) {
          vectorArgsType[i] = "horizontal";
          countVectorizedCol = Math.max(countVectorizedCol, nColumns);
          vectorizedColLimit = Math.min(vectorizedColLimit, nColumns);
        } else if (nRows !== 1) {
          vectorArgsType[i] = "vertical";
          countVectorizedRow = Math.max(countVectorizedRow, nRows);
          vectorizedRowLimit = Math.min(vectorizedRowLimit, nRows);
        }
      } else {
        args[i] = arg[0][0];
      }
    }
  }

  if (countVectorizedCol === 1 && countVectorizedRow === 1) {
    // either this function is not vectorized or it ends up with a 1x1 dimension
    return formula(...args);
  }

  const getArgOffset: (i: number, j: number) => Arg[] = (i, j) =>
    args.map((arg, index) => {
      switch (vectorArgsType?.[index]) {
        case "matrix":
          return arg![i][j];
        case "horizontal":
          return arg![i][0];
        case "vertical":
          return arg![0][j];
        case undefined:
          return arg;
      }
    });

  return generateMatrix(countVectorizedCol, countVectorizedRow, (col, row) => {
    if (col > vectorizedColLimit - 1 || row > vectorizedRowLimit - 1) {
      return new NotAvailableError(
        _t("Array arguments to [[FUNCTION_NAME]] are of different size.")
      );
    }
    const singleCellComputeResult = formula(...getArgOffset(col, row));
    // In the case where the user tries to vectorize arguments of an array formula, we will get an
    // array for every combination of the vectorized arguments, which will lead to a 3D matrix and
    // we won't be able to return the values.
    // In this case, we keep the first element of each spreading part, just as Excel does, and
    // create an array with these parts.
    // For exemple, we have MUNIT(x) that return an unitary matrix of x*x. If we use it with a
    // range, like MUNIT(A1:A2), we will get two unitary matrices (one for the value in A1 and one
    // for the value in A2). In this case, we will simply take the first value of each matrix and
    // return the array [First value of MUNIT(A1), First value of MUNIT(A2)].
    return isMatrix(singleCellComputeResult)
      ? singleCellComputeResult[0][0]
      : singleCellComputeResult;
  });
}

function createErrorHandlingCompute(
  addDescr: AddFunctionDescription,
  name: string
): ComputeFunction<FunctionResultObject | Matrix<FunctionResultObject>> {
  const descr = addMetaInfoFromArg(name, { ...addDescr });

  function computeFunctionToObject(
    this: EvalContext,
    ...args: Arg[]
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    if (this.debug) {
      // eslint-disable-next-line no-debugger
      debugger;
      this.debug = false;
    }
    const result = descr.compute.apply(this, args);

    if (!isMatrix(result)) {
      return isFunctionResultObject(result) ? result : { value: result };
    }

    if (isFunctionResultObject(result[0][0])) {
      return result as Matrix<FunctionResultObject>;
    }

    return matrixMap(result as Matrix<CellValue>, (row) => ({ value: row }));
  }

  return function errorHandlingCompute(
    this: EvalContext,
    ...args: Arg[]
  ): Matrix<FunctionResultObject> | FunctionResultObject {
    const argsToFocus = argTargeting(descr, args.length);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const argDefinition = descr.args[argsToFocus[i].index];

      // Early exit if the argument is an error and the function does not accept errors.
      // We only check scalar arguments, not matrix arguments for performance reasons.
      // Casting helpers are responsible for handling errors in matrix arguments.
      if (!argDefinition.acceptErrors && !isMatrix(arg) && isEvaluationError(arg?.value)) {
        return arg;
      }
    }
    try {
      return computeFunctionToObject.apply(this, args);
    } catch (e) {
      return handleError(e, name);
    }
  };
}

function isFunctionResultObject(obj: unknown): obj is FunctionResultObject {
  return typeof obj === "object" && obj !== null && "value" in obj;
}

export function createComputeFunction(
  descr: FunctionDescription
): ComputeFunction<Matrix<FunctionResultObject> | FunctionResultObject> {
  function vectorizedCompute(
    this: EvalContext,
    ...args: Arg[]
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    const acceptToVectorize: boolean[] = [];

    const argsToFocus = argTargeting(descr, args.length);
    //#region Compute vectorisation limits
    for (let i = 0; i < args.length; i++) {
      const argIndex = argsToFocus[i].index;
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
      applyVectorization(this, descr, descr.name, args, acceptToVectorize)
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
