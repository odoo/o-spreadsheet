import { functions } from "./functions/index";
import { toCartesian, toXC } from "./helpers";

// -----------------------------------------------------------------------------
// Tokenizer
// -----------------------------------------------------------------------------
const OPERATORS = "+,-,*,/,:".split(",");

export type TokenType =
  | "OPERATOR"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "FUNCTION"
  | "VARIABLE"
  | "SPACE"
  | "FORMULA"
  | "DEBUGGER"
  | "COMMA"
  | "LEFT_PAREN"
  | "RIGHT_PAREN";

export interface Token {
  start: number;
  end: number;
  length: number;
  type: TokenType;
  value: any;
}

export function tokenize(str: string): Token[] {
  const chars = str.split("");
  const result: Token[] = [];
  let i = 0;

  while (chars.length) {
    let token =
      tokenizeFormula(chars) ||
      tokenizeDebugger(chars) ||
      tokenizeSpace(chars) ||
      tokenizeMisc(chars) ||
      tokenizeOperator(chars) ||
      tokenizeNumber(chars) ||
      tokenizeString(chars) ||
      tokenizeBoolean(chars) ||
      tokenizeSymbol(chars);
    if (!token) {
      throw new Error("Tokenizer error");
    }
    token.start = i;
    token.end = i + token.length;
    i += token.length;
    result.push(token);
  }
  return result;
}

function tokenizeFormula(chars: string[]): Token | null {
  if (chars[0] === "=") {
    chars.shift();
    return { start: 0, end: 1, length: 1, type: "FORMULA", value: "=" };
  }
  return null;
}

function tokenizeDebugger(chars: string[]): Token | null {
  if (chars[0] === "?") {
    chars.shift();
    return { start: 1, end: 2, length: 1, type: "DEBUGGER", value: "?" };
  }
  return null;
}

function tokenizeMisc(chars): Token | null {
  const misc = {
    ",": "COMMA",
    "(": "LEFT_PAREN",
    ")": "RIGHT_PAREN"
  } as const;
  if (chars[0] in misc) {
    const value = chars[0];
    const type = misc[chars.shift()] as "COMMA" | "LEFT_PAREN" | "RIGHT_PAREN";
    return { type, value, length: 1, start: 0, end: 0 };
  }
  return null;
}

function tokenizeOperator(chars): Token | null {
  if (OPERATORS.includes(chars[0])) {
    return { type: "OPERATOR", value: chars.shift(), length: 1, start: 0, end: 0 };
  }
  return null;
}

function tokenizeNumber(chars): Token | null {
  const digits: any[] = [];
  while (chars[0] && chars[0].match(/\d|\./)) {
    digits.push(chars.shift());
  }
  if (digits.length) {
    return {
      type: "NUMBER",
      value: parseFloat(digits.join("")),
      length: digits.length,
      start: 0,
      end: 0
    };
  }
  return null;
}

function tokenizeBoolean(chars): Token | null {
  if (["T", "F"].includes(chars[0].toUpperCase())) {
    for (let value of ["TRUE", "FALSE"]) {
      if (
        chars
          .slice(0, value.length)
          .join("")
          .toUpperCase() === value
      ) {
        chars.splice(0, value.length);
        return {
          type: "BOOLEAN",
          value: value === "TRUE",
          length: value.length,
          start: 0,
          end: 0
        };
      }
    }
  }
  return null;
}

function tokenizeString(chars): Token | null {
  const quotes = ["'", '"'];
  if (quotes.includes(chars[0])) {
    const startChar = chars.shift();
    const letters: any[] = [];
    while (chars[0] && (chars[0] !== startChar || letters[letters.length - 1] === "\\")) {
      letters.push(chars.shift());
    }
    chars.shift();
    return {
      type: "STRING",
      value: letters.join(""),
      length: letters.length + 2, //Takes the quotes
      start: 0,
      end: 0
    };
  }
  return null;
}

function tokenizeSymbol(chars): Token | null {
  const result: any[] = [];
  while (chars[0] && chars[0].match(/\w/)) {
    result.push(chars.shift());
  }
  if (result.length) {
    const value = result.join("").toUpperCase();
    const isFunction = value in functions;
    const type = isFunction ? "FUNCTION" : "VARIABLE";
    return { type, value, length: result.length, start: 0, end: 0 };
  }
  return null;
}

function tokenizeSpace(chars): Token | null {
  let length = 0;
  while (chars[0] && chars[0].match(/\s/)) {
    length++;
    chars.shift();
  }

  if (length) {
    return { type: "SPACE", value: " ".repeat(length), length, start: 0, end: 0 };
  }
  return null;
}

// -----------------------------------------------------------------------------
// PARSER
// -----------------------------------------------------------------------------
interface ASTBase {
  debug?: boolean;
}

interface ASTNumber extends ASTBase {
  type: "NUMBER";
  value: number;
}

interface ASTString extends ASTBase {
  type: "STRING";
  value: string;
}

interface ASTBoolean extends ASTBase {
  type: "BOOLEAN";
  value: boolean;
}

interface ASTVariable extends ASTBase {
  type: "VARIABLE";
  value: string;
}
interface ASTOperation extends ASTBase {
  type: "OPERATION";
  value: any;
  left: AST;
  right: AST;
}

interface ASTFuncall extends ASTBase {
  type: "FUNCALL";
  value: string;
  args: AST[];
}

type AST = ASTOperation | ASTFuncall | ASTNumber | ASTBoolean | ASTString | ASTVariable;

function bindingPower(token: Token): number {
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

const simpleTokens: TokenType[] = ["NUMBER", "VARIABLE", "STRING", "BOOLEAN"];
function parsePrefix(current: Token, tokens: Token[]): AST {
  if (simpleTokens.includes(current.type)) {
    return { type: current.type, value: current.value } as AST;
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
    if (tokens.shift()!.type !== "LEFT_PAREN") {
      throw new Error("wrong function call");
    }
    const args: AST[] = [];
    if (tokens[0].type !== "RIGHT_PAREN") {
      args.push(parseExpression(tokens, 10));
      while (tokens[0].type === "COMMA") {
        tokens.shift();
        args.push(parseExpression(tokens, 10));
      }
    }
    if (tokens.shift()!.type !== "RIGHT_PAREN") {
      throw new Error("wrong function call");
    }
    return { type: "FUNCALL", value: current.value, args };
  }
  throw new Error("nope");
}

function parseInfix(left: AST, current: Token, tokens: Token[]): AST {
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

function parseExpression(tokens: Token[], bp: number): AST {
  const token = tokens.shift()!;
  let expr = parsePrefix(token, tokens);
  while (tokens[0] && bindingPower(tokens[0]) > bp) {
    expr = parseInfix(expr, tokens.shift()!, tokens);
  }
  return expr;
}

export function parse(str: string): AST {
  const allTokens = tokenize(str);
  const debug = allTokens.some(t => t.type === "DEBUGGER");
  const tokens = allTokens.filter(
    x => x.type !== "SPACE" && x.type !== "FORMULA" && x.type !== "DEBUGGER"
  );
  const result = parseExpression(tokens, 0);
  if (tokens.length) {
    throw new Error("invalid expression");
  }
  result.debug = debug;
  return result;
}

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------

export function compileExpression(str: string): Function {
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

// -----------------------------------------------------------------------------
// Misc
// -----------------------------------------------------------------------------
export function applyOffset(formula: string, offsetX: number, offsetY: number): string {
  let tokens = tokenize(formula);
  tokens = tokens.map(t => {
    if (t.type === "VARIABLE") {
      const [x, y] = toCartesian(t.value);
      if (x + offsetX < 0 || y + offsetY < 0) {
        return "#REF";
      }
      t.value = toXC(x + offsetX, y + offsetY);
    }
    return t.value;
  });
  return tokens.join("");
}
