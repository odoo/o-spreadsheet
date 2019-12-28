// -----------------------------------------------------------------------------
// Tokenizer
// -----------------------------------------------------------------------------
const OPERATORS = "+,-,*,/,:".split(",");
const FUNCTION_NAMES = ["SUM"];

function tokenize(str) {
  const chars = str
    .replace(/ /g, "")
    .toUpperCase()
    .split("");
  const result = [];
  while (chars.length) {
    let token =
      tokenizeMisc(chars) ||
      tokenizeOperator(chars) ||
      tokenizeNumber(chars) ||
      tokenizeSymbol(chars);
    if (!token) {
      throw new Error("Tokenizer error");
    }
    result.push(token);
  }
  return result;
}

function tokenizeMisc(chars) {
  const misc = {
    ",": "COMMA",
    "(": "LEFT_PAREN",
    ")": "RIGHT_PAREN"
  };
  if (chars[0] in misc) {
    return { type: misc[chars.shift()] };
  }
}

function tokenizeOperator(chars) {
  if (OPERATORS.includes(chars[0])) {
    return { type: "OPERATOR", value: chars.shift() };
  }
}

function tokenizeNumber(chars) {
  const digits = [];
  while (chars[0] && chars[0].match(/\d|\./)) {
    digits.push(chars.shift());
  }
  if (digits.length) {
    return { type: "NUMBER", value: parseFloat(digits.join("")) };
  }
}

function tokenizeSymbol(chars) {
  const result = [];
  while (chars[0] && chars[0].match(/\w/)) {
    result.push(chars.shift());
  }
  if (result.length) {
    const value = result.join("");
    const isFunction = FUNCTION_NAMES.includes(value);
    const type = isFunction ? "FUNCTION" : "VARIABLE";
    return { type, value };
  }
}

// -----------------------------------------------------------------------------
// PARSER
// -----------------------------------------------------------------------------
function bindingPower(token) {
  switch (token.type) {
    case "NUMBER":
    case "VARIABLE":
      return 0;
    case "COMMA":
      return 3;
    case "LEFT_PAREN":
      return 5;
    case "RIGHT_PAREN":
      return 5;
    case "OPERATOR":
      return token.value === "*" || token.value === "/" ? 20 : 15;
  }
  throw new Error("?");
}

function parsePrefix(current, tokens) {
  if (current.type === "NUMBER" || current.type === "VARIABLE") {
    return { type: current.type, value: current.value };
  }
  if (current.type === "NUMBER") {
    return { type: "NUMBER", value: current.value };
  }
  if (current.type === "LEFT_PAREN") {
    const result = parseExpression(tokens, 5);
    if (!tokens.length || tokens[0].type !== "RIGHT_PAREN") {
      throw new Error("unmatched left paren");
    }
    tokens.shift();
    return result;
  }
  if (current.type === "OPERATOR" && current.value === "-") {
    return {
      type: "OPERATION",
      value: current.value,
      left: { type: "NUMBER", value: 0 },
      right: parseExpression(tokens, 15)
    };
  }
  if (current.type === "FUNCTION") {
    if (tokens.shift().type !== "LEFT_PAREN") {
      throw new Error("wrong function call");
    }
    const args = [parseExpression(tokens, 10)];
    while (tokens[0].type === "COMMA") {
      tokens.shift();
      args.push(parseExpression(tokens, 10));
    }
    if (tokens.shift().type !== "RIGHT_PAREN") {
      throw new Error("wrong function call");
    }
    return { type: "FUNCALL", value: current.value, args };
  }
  throw new Error("nope");
}

function parseInfix(left, current, tokens) {
  if (current.type === "OPERATOR") {
    const bp = bindingPower(current);
    const right = parseExpression(tokens, bp);
    return {
      type: "OPERATION",
      value: current.value,
      left,
      right
    };
  }
  throw new Error("nope");
}

function parseExpression(tokens, bp) {
  const token = tokens.shift();
  let expr = parsePrefix(token, tokens);
  while (tokens[0] && bindingPower(tokens[0]) > bp) {
    expr = parseInfix(expr, tokens.shift(), tokens);
  }
  return expr;
}

export function parse(str) {
  const tokens = tokenize(str);
  const result = parseExpression(tokens, 0);
  if (tokens.length) {
    throw new Error("invalid expression");
  }
  return result;
}

// -----------------------------------------------------------------------------
// EVALUATOR
// -----------------------------------------------------------------------------
export function compileExpression(str) {
  const ast = parse(str);
  let nextId = 1;
  const code = [`// ${str}`];

  function compileAST(ast) {
    let id, left, right;
    switch (ast.type) {
      case "NUMBER":
        return ast.value;
      case "VARIABLE":
        return `getValue('${ast.value}')`;
      case "OPERATION":
        id = nextId++;
        left = compileAST(ast.left);
        right = compileAST(ast.right);
        code.push(`let _${id} = ${left} ${ast.value} ${right};`);
        break;
    }
    return `_${id}`;
  }
  code.push(`return ${compileAST(ast)};`);
  console.log(code.join("\n"));
  return new Function("getValue", code.join("\n"));
}
