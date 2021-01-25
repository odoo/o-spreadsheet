import { functionRegistry } from "../functions/index";
import { _lt } from "../translation";
import { Arg, CompiledFormula } from "../types/index";
import { AST, ASTAsyncFuncall, ASTFuncall, parse } from "./parser";

const functions = functionRegistry.content;

const OPERATOR_MAP = {
  "=": "EQ",
  "+": "ADD",
  "-": "MINUS",
  "*": "MULTIPLY",
  "/": "DIVIDE",
  ">=": "GTE",
  "<>": "NE",
  ">": "GT",
  "<=": "LTE",
  "<": "LT",
  "^": "POWER",
  "&": "CONCATENATE",
};

const UNARY_OPERATOR_MAP = {
  "-": "UMINUS",
  "+": "UPLUS",
};

// this cache contains all compiled function code, grouped by "structure". For
// example, "=2*sum(A1:A4)" and "=2*sum(B1:B4)" are compiled into the same
// structural function.
//
// It is only exported for testing purposes
export const functionCache: { [key: string]: CompiledFormula } = {};

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export function compile(
  str: string,
  sheet: string,
  sheets: { [name: string]: string }
): CompiledFormula {
  const ast = parse(str);
  let nextId = 1;
  const code = [`// ${str}`];
  let isAsync = false;
  let cacheKey = "";
  let cellRefs: [string, string][] = [];
  let rangeRefs: [string, string, string][] = [];

  if (ast.type === "BIN_OPERATION" && ast.value === ":") {
    throw new Error(_lt("Invalid formula"));
  }
  if (ast.type === "UNKNOWN") {
    throw new Error(_lt("Invalid formula"));
  }

  /**
   * This function compile the function arguments. It is mostly straightforward,
   * except that there is a non trivial transformation in one situation:
   *
   * If a function argument is asking for a range, and get a cell, we transform
   * the cell value into a range. This allow the grid model to differentiate
   * between a cell value and a non cell value.
   */
  function compileFunctionArgs(ast: ASTAsyncFuncall | ASTFuncall): string[] {
    const fn = functions[ast.value.toUpperCase()];
    const result: string[] = [];
    const args = ast.args;
    let argDescr: Arg;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      argDescr = fn.args[i] || argDescr!;
      const isLazy = argDescr && argDescr.lazy;
      let argValue = compileAST(arg, isLazy);
      if (arg.type === "REFERENCE") {
        const types = argDescr.type;
        const hasRange = types.find(
          (t) =>
            t === "RANGE" ||
            t === "RANGE<BOOLEAN>" ||
            t === "RANGE<NUMBER>" ||
            t === "RANGE<STRING>"
        );
        if (hasRange) {
          argValue = `[[${argValue}]]`;
        }
      }
      result.push(argValue);
    }
    const isRepeating = fn.args.length ? fn.args[fn.args.length - 1].repeating : false;
    let minArg = 0;
    let maxArg = isRepeating ? Infinity : fn.args.length;
    for (let arg of fn.args) {
      if (!arg.optional) {
        minArg++;
      }
    }
    if (result.length < minArg || result.length > maxArg) {
      throw new Error(
        _lt(
          "Invalid number of arguments for the %s function. Expected %s, but got %s instead.",
          ast.value.toUpperCase(),
          fn.args.length.toString(),
          result.length.toString()
        )
      );
    }
    return result;
  }
  function compileAST(ast: AST, isLazy = false): any {
    let id, left, right, args, fnName, statement;
    if (ast.type !== "REFERENCE" && !(ast.type === "BIN_OPERATION" && ast.value === ":")) {
      cacheKey += "_" + ast.value;
    }
    if (ast.debug) {
      cacheKey += "?";
      code.push("debugger;");
    }
    switch (ast.type) {
      case "BOOLEAN":
      case "NUMBER":
      case "STRING":
        if (!isLazy) {
          return ast.value;
        }
        id = nextId++;
        statement = `${ast.value}`;
        break;
      case "REFERENCE":
        id = nextId++;
        cacheKey += "__REF";
        const sheetId = ast.sheet ? sheets[ast.sheet] : sheet;
        const refIdx = cellRefs.push([ast.value, sheetId]) - 1;
        statement = `cell(${refIdx})`;
        break;
      case "FUNCALL":
        id = nextId++;
        args = compileFunctionArgs(ast);
        fnName = ast.value.toUpperCase();
        code.push(`ctx.__lastFnCalled = '${fnName}'`);
        statement = `ctx['${fnName}'](${args})`;
        break;
      case "ASYNC_FUNCALL":
        id = nextId++;
        isAsync = true;
        args = compileFunctionArgs(ast);
        fnName = ast.value.toUpperCase();
        code.push(`ctx.__lastFnCalled = '${fnName}'`);
        statement = `await ctx['${fnName}'](${args})`;
        break;
      case "UNARY_OPERATION":
        id = nextId++;
        right = compileAST(ast.right);
        fnName = UNARY_OPERATOR_MAP[ast.value];
        code.push(`ctx.__lastFnCalled = '${fnName}'`);
        statement = `ctx['${fnName}']( ${right})`;
        break;
      case "BIN_OPERATION":
        id = nextId++;
        if (ast.value === ":") {
          cacheKey += "__RANGE";
          const sheetName = ast.left.type === "REFERENCE" && ast.left.sheet;
          const sheetId = sheetName ? sheets[sheetName] : sheet;
          const rangeIdx = rangeRefs.push([ast.left.value, ast.right.value, sheetId]) - 1;
          statement = `range(${rangeIdx});`;
        } else {
          left = compileAST(ast.left);
          right = compileAST(ast.right);
          fnName = OPERATOR_MAP[ast.value];
          code.push(`ctx.__lastFnCalled = '${fnName}'`);
          statement = `ctx['${fnName}'](${left}, ${right})`;
        }
        break;
      case "UNKNOWN":
        if (!isLazy) {
          return "null";
        }
        id = nextId++;
        statement = `null`;
        break;
    }
    code.push(`let _${id} = ` + (isLazy ? `()=> ` : ``) + statement);
    return `_${id}`;
  }

  code.push(`return ${compileAST(ast)};`);
  let baseFunction = functionCache[cacheKey];
  if (!baseFunction) {
    const Constructor = isAsync ? AsyncFunction : Function;
    baseFunction = new Constructor("cell", "range", "ctx", code.join("\n"));
    functionCache[cacheKey] = baseFunction;
  }
  const resultFn = (cell, range, ctx) => {
    const cellFn = (idx) => {
      const [xc, sheetId] = cellRefs[idx];
      return cell(xc, sheetId);
    };
    const rangeFn = (idx) => {
      const [xc1, xc2, sheetId] = rangeRefs[idx];
      return range(xc1, xc2, sheetId);
    };
    return baseFunction(cellFn, rangeFn, ctx);
  };
  resultFn.async = isAsync;
  return resultFn;
}
