import { AST, parse, ASTFuncall, ASTAsyncFuncall } from "./parser";
import { functions } from "../functions/index";
import { Arg } from "../functions/arguments";
import { CompiledFormula } from "../model";

const OPERATOR_MAP = {
  "=": "EQ",
  "+": "ADD",
  "-": "MINUS",
  "*": "MULTIPLY",
  "/": "DIVIDE",
  ">=": "GTE",
  ">": "GT",
  "<=": "LTE",
  "<": "LT",
  "^": "POWER"
};

const UNARY_OPERATOR_MAP = {
  "-": "UMINUS"
};

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------
export const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

export function compile(str: string, sheet: string = "Sheet1"): CompiledFormula {
  const ast = parse(str);
  let nextId = 1;
  const code = [`// ${str}`];
  let isAsync = false;

  if (ast.type === "BIN_OPERATION" && ast.value === ":") {
    throw new Error("Invalid formula");
  }
  if (ast.type === "UNKNOWN") {
    throw new Error("Invalid formula");
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
          t =>
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
      throw new Error(`
          Invalid number of arguments for the ${ast.value.toUpperCase()} function.
          Expected ${fn.args.length}, but got ${result.length} instead.`);
    }
    return result;
  }
  function compileAST(ast: AST): any {
    let id, left, right, args;
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
        code.push(`let _${id} = cell('${ast.value}', \`${ast.sheet || sheet}\`)`);
        break;
      case "FUNCALL":
        id = nextId++;
        args = compileFunctionArgs(ast);
        code.push(`let _${id} = ctx['${ast.value.toUpperCase()}'](${args})`);
        break;
      case "ASYNC_FUNCALL":
        id = nextId++;
        isAsync = true;
        args = compileFunctionArgs(ast);
        code.push(`let _${id} = await ctx['${ast.value.toUpperCase()}'](${args})`);
        break;
      case "UNARY_OPERATION":
        id = nextId++;
        right = compileAST(ast.right);
        code.push(`let _${id} = ctx['${UNARY_OPERATOR_MAP[ast.value]}']( ${right})`);
        break;
      case "BIN_OPERATION":
        id = nextId++;
        if (ast.value === ":") {
          const sheetName = (ast.left.type === "REFERENCE" && ast.left.sheet) || sheet;
          code.push(
            `let _${id} = range('${ast.left.value}', '${ast.right.value}', \`${sheetName}\`);`
          );
        } else {
          left = compileAST(ast.left);
          right = compileAST(ast.right);
          code.push(`let _${id} = ctx['${OPERATOR_MAP[ast.value]}'](${left}, ${right})`);
        }
        break;
      case "UNKNOWN":
        return "undefined";
    }
    return `_${id}`;
  }

  code.push(`return ${compileAST(ast)};`);
  const Constructor = isAsync ? AsyncFunction : Function;
  return new Constructor("cell", "range", "ctx", code.join("\n"));
}
