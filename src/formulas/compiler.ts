import { functionRegistry } from "../functions/index";
import { CompiledFormula, Arg } from "../types/index";
import { AST, ASTAsyncFuncall, ASTFuncall, parse } from "./parser";
import { _lt } from "../translation";

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

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------
export const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export function compile(
  str: string,
  sheet: string,
  sheets: { [name: string]: string }
): CompiledFormula {
  const ast = parse(str);
  let nextId = 1;
  const code = [`// ${str}`];
  let isAsync = false;

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
      let argValue = compileAST(arg);
      argDescr = fn.args[i] || argDescr!;
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
      result.push(argValue === "" ? `""` : argValue);
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
        _lt(`
          Invalid number of arguments for the ${ast.value.toUpperCase()} function.
          Expected ${fn.args.length}, but got ${result.length} instead.`)
      );
    }
    return result;
  }
  function compileAST(ast: AST): any {
    let id, left, right, args, fnName;
    if (ast.debug) {
      code.push("debugger;");
    }
    switch (ast.type) {
      case "BOOLEAN":
      case "NUMBER":
      case "STRING":
        return ast.value;
      case "REFERENCE":
        id = nextId++;
        const sheetId = ast.sheet ? sheets[ast.sheet] : sheet;
        code.push(`let _${id} = cell('${ast.value}', \`${sheetId}\`)`);
        break;
      case "FUNCALL":
        id = nextId++;
        args = compileFunctionArgs(ast);
        fnName = ast.value.toUpperCase();
        code.push(`ctx.__lastFnCalled = '${fnName}'`);
        code.push(`let _${id} = ctx['${fnName}'](${args})`);
        break;
      case "ASYNC_FUNCALL":
        id = nextId++;
        isAsync = true;
        args = compileFunctionArgs(ast);
        fnName = ast.value.toUpperCase();
        code.push(`ctx.__lastFnCalled = '${fnName}'`);
        code.push(`let _${id} = await ctx['${fnName}'](${args})`);
        break;
      case "UNARY_OPERATION":
        id = nextId++;
        right = compileAST(ast.right);
        fnName = UNARY_OPERATOR_MAP[ast.value];
        code.push(`ctx.__lastFnCalled = '${fnName}'`);
        code.push(`let _${id} = ctx['${fnName}']( ${right})`);
        break;
      case "BIN_OPERATION":
        id = nextId++;
        if (ast.value === ":") {
          const sheetName = ast.left.type === "REFERENCE" && ast.left.sheet;
          const sheetId = sheetName ? sheets[sheetName] : sheet;
          code.push(
            `let _${id} = range('${ast.left.value}', '${ast.right.value}', \`${sheetId}\`);`
          );
        } else {
          left = compileAST(ast.left);
          right = compileAST(ast.right);
          fnName = OPERATOR_MAP[ast.value];
          code.push(`ctx.__lastFnCalled = '${fnName}'`);
          code.push(`let _${id} = ctx['${fnName}'](${left}, ${right})`);
        }
        break;
      case "UNKNOWN":
        return "null";
    }
    return `_${id}`;
  }

  code.push(`return ${compileAST(ast)};`);
  const Constructor = isAsync ? AsyncFunction : Function;
  return new Constructor("cell", "range", "ctx", code.join("\n"));
}
