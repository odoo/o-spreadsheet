import { TokenType, Token, tokenize } from "./tokenizer";

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

export type AST = ASTOperation | ASTFuncall | ASTNumber | ASTBoolean | ASTString | ASTVariable;

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
