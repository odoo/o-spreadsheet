import { Token, tokenize } from "./tokenizer";
import { functions } from "../functions/index";
import { toCartesian, toXC } from "../helpers";

const UNARY_OPERATORS = ["-"];

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

interface ASTReference extends ASTBase {
  type: "REFERENCE";
  value: string;
}

interface ASTUnaryOperation extends ASTBase {
  type: "UNARY_OPERATION";
  value: any;
  right: AST;
}

interface ASTOperation extends ASTBase {
  type: "BIN_OPERATION";
  value: any;
  left: AST;
  right: AST;
}

export interface ASTFuncall extends ASTBase {
  type: "FUNCALL";
  value: string;
  args: AST[];
}

export interface ASTAsyncFuncall extends ASTBase {
  type: "ASYNC_FUNCALL";
  value: string;
  args: AST[];
}

interface ASTUnknown extends ASTBase {
  type: "UNKNOWN";
  value: string;
}

export type AST =
  | ASTOperation
  | ASTUnaryOperation
  | ASTFuncall
  | ASTAsyncFuncall
  | ASTNumber
  | ASTBoolean
  | ASTString
  | ASTReference
  | ASTUnknown;

const OP_PRIORITY = {
  "*": 20,
  "/": 20,
  ">": 10,
  ">=": 10,
  "<": 10,
  "<=": 10,
  "=": 10
};

function bindingPower(token: Token): number {
  switch (token.type) {
    case "NUMBER":
    case "SYMBOL":
      return 0;
    case "COMMA":
      return 3;
    case "LEFT_PAREN":
      return 5;
    case "RIGHT_PAREN":
      return 5;
    case "OPERATOR":
      return OP_PRIORITY[token.value] || 15;
  }
  throw new Error("?");
}

export const cellReference = new RegExp(/\$?[A-Z]+\$?[0-9]+/, "i");
export const rangeReference = new RegExp(
  /^\s*\$?[A-Z]+\$?[0-9]+\s*(\s*:\s*\$?[A-Z]+\$?[0-9]+\s*)?$/,
  "i"
);

function parsePrefix(current: Token, tokens: Token[]): AST {
  if (current.type === "DEBUGGER") {
    const next = parseExpression(tokens, 1000);
    next.debug = true;
    return next;
  }
  if (current.type === "NUMBER") {
    let value = parseFloat(current.value);
    if (tokens[0] && tokens[0].value === "%" && tokens[0].type === "OPERATOR") {
      value = value / 100;
      tokens.shift();
    }
    return { type: current.type, value } as AST;
  }
  if (current.type === "STRING") {
    return { type: current.type, value: current.value } as AST;
  }
  if (current.type === "SYMBOL") {
    if (cellReference.test(current.value)) {
      return { type: "REFERENCE", value: current.value.replace(/\$/g, "").toUpperCase() } as AST;
    } else {
      if (["TRUE", "FALSE"].includes(current.value.toUpperCase())) {
        return { type: "BOOLEAN", value: current.value.toUpperCase() === "TRUE" } as AST;
      } else {
        return { type: "UNKNOWN", value: current.value } as AST;
      }
    }
  }
  if (current.type === "LEFT_PAREN") {
    const result = parseExpression(tokens, 5);
    if (!tokens.length || tokens[0].type !== "RIGHT_PAREN") {
      throw new Error("unmatched left paren");
    }
    tokens.shift();
    return result;
  }
  if (current.type === "OPERATOR" && UNARY_OPERATORS.includes(current.value)) {
    return {
      type: "UNARY_OPERATION",
      value: current.value,
      right: parseExpression(tokens, 15)
    };
  }
  if (current.type === "FUNCTION") {
    if (tokens.shift()!.type !== "LEFT_PAREN") {
      throw new Error("wrong function call");
    }
    const args: AST[] = [];
    if (tokens[0].type !== "RIGHT_PAREN") {
      if (tokens[0].type === "COMMA") {
        args.push({ type: "STRING", value: "" });
      } else {
        args.push(parseExpression(tokens, 10));
      }
      while (tokens[0].type === "COMMA") {
        tokens.shift();
        if ((tokens as any)[0].type === "RIGHT_PAREN") {
          args.push({ type: "STRING", value: "" });
          break;
        }
        if ((tokens as any)[0].type === "COMMA") {
          args.push({ type: "STRING", value: "" });
        } else {
          args.push(parseExpression(tokens, 10));
        }
      }
    }
    if (tokens.shift()!.type !== "RIGHT_PAREN") {
      throw new Error("wrong function call");
    }
    const isAsync = functions[current.value.toUpperCase()].async;
    const type = isAsync ? "ASYNC_FUNCALL" : "FUNCALL";
    return { type, value: current.value, args };
  }
  throw new Error("nope");
}

function parseInfix(left: AST, current: Token, tokens: Token[]): AST {
  if (current.type === "OPERATOR") {
    const bp = bindingPower(current);
    const right = parseExpression(tokens, bp);
    if (current.value === ":") {
      if (left.type === "REFERENCE" && right.type === "REFERENCE") {
        const [x1, y1] = toCartesian(left.value);
        const [x2, y2] = toCartesian(right.value);
        left.value = toXC(Math.min(x1, x2), Math.min(y1, y2));
        right.value = toXC(Math.max(x1, x2), Math.max(y1, y2));
      }
    }
    return {
      type: "BIN_OPERATION",
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

/**
 * Parse an expression (as a string) into an AST.
 */
export function parse(str: string): AST {
  const tokens = tokenize(str).filter(x => x.type !== "SPACE");
  if (tokens[0].type === "OPERATOR" && tokens[0].value === "=") {
    tokens.splice(0, 1);
  }
  const result = parseExpression(tokens, 0);
  if (tokens.length) {
    throw new Error("invalid expression");
  }
  return result;
}
