import { AST, parse } from "./parser";

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

  function compileAST(ast: AST) {
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
        args = ast.args.map(compileAST);
        code.push(`let _${id} = fns['${ast.value.toUpperCase()}'](${args})`);
        break;
      case "ASYNC_FUNCALL":
        args = ast.args.map(compileAST);
        id = nextId++;
        isAsync = true;
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
