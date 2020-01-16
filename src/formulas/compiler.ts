import { parse, AST } from "./parser";

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------

export function compile(str: string): Function {
  const ast = parse(str);
  let nextId = 1;
  const code = [`// ${str}`];

  function compileAST(ast: AST) {
    let id, left, right, args;
    if (ast.debug) {
      code.push("debugger;");
    }
    switch (ast.type) {
      case "BOOLEAN":
      case "NUMBER":
        return ast.value;
      case "STRING":
        return `'${ast.value}'`;
      case "VARIABLE":
        return `getValue('${ast.value}')`;
      case "FUNCALL":
        args = ast.args.map(compileAST);
        return `fns['${ast.value}'](${args})`;
      case "OPERATION":
        id = nextId++;
        left = compileAST(ast.left);
        right = compileAST(ast.right);
        if (ast.value === ":") {
          code.push(`let _${id} = fns.range('${ast.left.value}', '${ast.right.value}');`);
        } else {
          code.push(`let _${id} = ${left} ${ast.value} ${right};`);
        }
        break;
    }
    return `_${id}`;
  }

  code.push(`return ${compileAST(ast)};`);
  return new Function("getValue", "fns", code.join("\n"));
}
