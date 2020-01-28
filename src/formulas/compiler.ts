import { parse, AST } from "./parser";

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------
export const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

const operatorMapping = {
  "+": "add",
  "*": "mul",
  "-": "sub",
  "=": "eq",
  ">": "gt",
  ">=": "gte",
  "<": "lt",
  "<=": "lte",
  "/": "div"
};

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
        return ast.value;
      case "NUMBER":
        return "this.fromNumber(" + ast.value + ")";
      case "STRING":
        return `'${ast.value}'`;
      case "REFERENCE":
        return `getValue('${ast.value}')`;
      case "FUNCALL":
        args = ast.args.map(compileAST);
        return `fns['${ast.value}'](${args})`;
      case "ASYNC_FUNCALL":
        args = ast.args.map(compileAST);
        id = nextId++;
        isAsync = true;
        code.push(`let _${id} = await fns['${ast.value}'](${args})`);
        break;
      case "BIN_OPERATION":
        id = nextId++;
        left = compileAST(ast.left);
        right = compileAST(ast.right);
        if (ast.value === ":") {
          code.push(`let _${id} = fns.range('${ast.left.value}', '${ast.right.value}');`);
        } else {
          const fn = operatorMapping[ast.value];
          code.push(`let _${id} = this.${fn}(${left}, ${right});`);
        }
        break;
    }
    return `_${id}`;
  }

  code.push(`return ${compileAST(ast)};`);
  const Constructor = isAsync ? AsyncFunction : Function;
  return new Constructor("getValue", "fns", code.join("\n"));
}
