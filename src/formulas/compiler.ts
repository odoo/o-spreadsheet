import { parse, AST } from "./parser";
import { validateAST } from "./validation";

const OPERATOR_MAP = {
  "=": "==="
};

function IS_NUMBER(r: any): string {
  return `if (typeof ${r} !== 'number') { throw new Error('Invalid type');}`;
}
function BOTH_NUMBER(l: any, r: any): string {
  return `if (typeof ${l} !== 'number' || typeof ${r} !== 'number') { throw new Error('Invalid type');}`;
}

const UNARY_OPERATOR_TYPEGUARDS = {
  "-": IS_NUMBER
};

const OPERATOR_TYPEGUARDS = {
  "+": BOTH_NUMBER,
  "-": BOTH_NUMBER,
  "*": BOTH_NUMBER,
  "/": BOTH_NUMBER
};

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------
export const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

export function compile(str: string): Function {
  const ast = parse(str);
  const isValid = validateAST(ast, ["ANY"]);
  if (!isValid) {
    throw new Error("Invalid formula");
  }
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
        if (ast.value in UNARY_OPERATOR_TYPEGUARDS) {
          code.push(UNARY_OPERATOR_TYPEGUARDS[ast.value](right));
        }
        code.push(`let _${id} = ${ast.value} ${right};`);
        break;
      case "BIN_OPERATION":
        id = nextId++;
        left = compileAST(ast.left);
        right = compileAST(ast.right);
        if (ast.value === ":") {
          code.push(`let _${id} = fns.range('${ast.left.value}', '${ast.right.value}');`);
        } else {
          if (ast.value in OPERATOR_TYPEGUARDS) {
            code.push(OPERATOR_TYPEGUARDS[ast.value](left, right));
          }
          const op = OPERATOR_MAP[ast.value] || ast.value;
          code.push(`let _${id} = ${left} ${op} ${right};`);
        }
        break;
    }
    return `_${id}`;
  }

  code.push(`return ${compileAST(ast)};`);
  const Constructor = isAsync ? AsyncFunction : Function;
  return new Constructor("getValue", "fns", code.join("\n"));
}
