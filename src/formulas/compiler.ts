import { AST, parse, ASTFuncall, ASTAsyncFuncall } from "./parser";
import { functions } from "../functions/index";
import { Arg } from "../functions/arguments";

const OPERATOR_MAP = {
  "=": "EQ",
  "+": "ADD",
  "-": "MINUS",
  "*": "MULTIPLY",
  "/": "DIVIDE",
  ">=": "GTE",
  ">": "GT",
  "<=": "LTE",
  "<": "LT"
};

const UNARY_OPERATOR_MAP = {
  "-": "UMINUS"
};

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------
export const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

export function compile(str: string): Function {
  const ast = parse(str);
  let nextId = 1;
  const code = [`// ${str}`];
  let isAsync = false;

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
        code.push(`let _${id} = getValue('${ast.value}')`);
        break;
      case "FUNCALL":
        id = nextId++;
        args = compileFunctionArgs(ast);
        code.push(`let _${id} = fns['${ast.value.toUpperCase()}'](${args})`);
        break;
      case "ASYNC_FUNCALL":
        id = nextId++;
        isAsync = true;
        args = compileFunctionArgs(ast);
        code.push(`let _${id} = await fns['${ast.value.toUpperCase()}'](${args})`);
        break;
      case "UNARY_OPERATION":
        id = nextId++;
        right = compileAST(ast.right);
        code.push(`let _${id} = fns['${UNARY_OPERATOR_MAP[ast.value]}']( ${right})`);
        break;
      case "BIN_OPERATION":
        id = nextId++;
        if (ast.value === ":") {
          code.push(`let _${id} = fns.range('${ast.left.value}', '${ast.right.value}');`);
        } else {
          left = compileAST(ast.left);
          right = compileAST(ast.right);
          code.push(`let _${id} = fns['${OPERATOR_MAP[ast.value]}'](${left}, ${right})`);
        }
        break;
    }
    return `_${id}`;
  }

  code.push(`return ${compileAST(ast)};`);
  const Constructor = isAsync ? AsyncFunction : Function;
  return new Constructor("getValue", "fns", code.join("\n"));
}
