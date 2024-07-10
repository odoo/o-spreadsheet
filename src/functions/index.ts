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
import { BadExpressionError, EvaluationError, NotAvailableError } from "../types/errors";
import { addMetaInfoFromArg, validateArguments } from "./arguments";
import { generateMatrix, isEvaluationError, matrixForEach, matrixMap } from "./helpers";
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

export interface FunctionRegistry extends Registry<FunctionDescription> {
  add(functionName: string, addDescr: AddFunctionDescription): FunctionRegistry;
  get(functionName: string): FunctionDescription;
  mapping: {
    [functionName: string]: ComputeFunction<Matrix<FunctionResultObject> | FunctionResultObject>;
  };
}

export class FunctionRegistry extends Registry<FunctionDescription> {
  mapping: {
    [key: string]: ComputeFunction<Matrix<FunctionResultObject> | FunctionResultObject>;
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
    this.mapping[name] = createComputeFunction(descr, name);
    super.add(name, descr);
    return this;
  }
}

export const functionRegistry: FunctionRegistry = new FunctionRegistry();

for (let category of categories) {
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

type VectorArgType = "horizontal" | "vertical" | "matrix";

const notAvailableError = new NotAvailableError(
  _t("Array arguments to [[FUNCTION_NAME]] are of different size.")
);

function createComputeFunction(
  descr: FunctionDescription,
  functionName: string
): ComputeFunction<Matrix<FunctionResultObject> | FunctionResultObject> {
  function runtimeCompute(
    this: EvalContext,
    ...args: Arg[]
  ): Matrix<FunctionResultObject> | FunctionResultObject {
    try {
      return vectorizedCompute.apply(this, args);
    } catch (e) {
      return handleError(e, functionName);
    }
  }

  function vectorizedCompute(
    this: EvalContext,
    ...args: Arg[]
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    let countVectorizableCol = 1;
    let countVectorizableRow = 1;
    let vectorizableColLimit = Infinity;
    let vectorizableRowLimit = Infinity;

    let vectorArgsType: VectorArgType[] | undefined = undefined;

    //#region Compute vectorisation limits
    for (let i = 0; i < args.length; i++) {
      const argDefinition = descr.args[descr.getArgToFocus(i + 1) - 1];
      const arg = args[i];

      if (isMatrix(arg) && !argDefinition.acceptMatrix) {
        // if argDefinition does not accept a matrix but arg is still a matrix
        // --> triggers the arguments vectorization
        const nColumns = arg.length;
        const nRows = arg[0].length;
        if (nColumns !== 1 || nRows !== 1) {
          vectorArgsType ??= new Array(args.length);
          if (nColumns !== 1 && nRows !== 1) {
            vectorArgsType[i] = "matrix";
            countVectorizableCol = Math.max(countVectorizableCol, nColumns);
            countVectorizableRow = Math.max(countVectorizableRow, nRows);
            vectorizableColLimit = Math.min(vectorizableColLimit, nColumns);
            vectorizableRowLimit = Math.min(vectorizableRowLimit, nRows);
          } else if (nColumns !== 1) {
            vectorArgsType[i] = "horizontal";
            countVectorizableCol = Math.max(countVectorizableCol, nColumns);
            vectorizableColLimit = Math.min(vectorizableColLimit, nColumns);
          } else if (nRows !== 1) {
            vectorArgsType[i] = "vertical";
            countVectorizableRow = Math.max(countVectorizableRow, nRows);
            vectorizableRowLimit = Math.min(vectorizableRowLimit, nRows);
          }
        } else {
          args[i] = arg[0][0];
        }
      }

      if (!isMatrix(arg) && argDefinition.acceptMatrixOnly) {
        throw new BadExpressionError(
          _t(
            "Function [[FUNCTION_NAME]] expects the parameter '%s' to be reference to a cell or range.",
            (i + 1).toString()
          )
        );
      }
    }
    //#endregion

    if (countVectorizableCol === 1 && countVectorizableRow === 1) {
      // either this function is not vectorized or it ends up with a 1x1 dimension
      return computeFunctionToObject.apply(this, args);
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

    return generateMatrix(countVectorizableCol, countVectorizableRow, (col, row) => {
      if (col > vectorizableColLimit - 1 || row > vectorizableRowLimit - 1) {
        return notAvailableError;
      }
      const singleCellComputeResult = computeFunctionToObject.apply(this, getArgOffset(col, row));
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

  function computeFunctionToObject(
    this: EvalContext,
    ...args: Arg[]
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    const result = descr.compute.apply(this, args);

    if (!isMatrix(result)) {
      if (typeof result === "object" && result !== null && "value" in result) {
        replaceFunctionNamePlaceholder(result, functionName);
        return result;
      }
      return { value: result };
    }

    if (typeof result[0][0] === "object" && result[0][0] !== null && "value" in result[0][0]) {
      matrixForEach(result as Matrix<FunctionResultObject>, (result) =>
        replaceFunctionNamePlaceholder(result, functionName)
      );
      return result as Matrix<FunctionResultObject>;
    }

    return matrixMap(result as Matrix<CellValue>, (row) => ({ value: row }));
  }

  return runtimeCompute;
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
