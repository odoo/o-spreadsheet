import { DEFAULT_ERROR_MESSAGE } from "../constants";
import { parseNumber, removeStringQuotes } from "../helpers/index";
import { _lt } from "../translation";
import { InvalidReferenceError } from "../types/errors";
import { UnknownFunctionError } from "./../types/errors";
import { rangeTokenize } from "./range_tokenizer";
import { Token } from "./tokenizer";

const functionRegex = /[a-zA-Z0-9\_]+(\.[a-zA-Z0-9\_]+)*/;

const UNARY_OPERATORS_PREFIX = ["-", "+"];
const UNARY_OPERATORS_POSTFIX = ["%"];

const ASSOCIATIVE_OPERATORS = ["*", "+", "&"];

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

interface ASTReference extends ASTBase {
  type: "REFERENCE";
  value: string;
}

export interface ASTString extends ASTBase {
  type: "STRING";
  value: string;
}

interface ASTBoolean extends ASTBase {
  type: "BOOLEAN";
  value: boolean;
}

interface ASTUnaryOperation extends ASTBase {
  type: "UNARY_OPERATION";
  value: any;
  operand: AST;
  postfix?: boolean; // needed to rebuild string from ast
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

interface ASTUnknown extends ASTBase {
  type: "UNKNOWN";
  value: string;
}

export type AST =
  | ASTOperation
  | ASTUnaryOperation
  | ASTFuncall
  | ASTNumber
  | ASTBoolean
  | ASTString
  | ASTReference
  | ASTUnknown;

const OP_PRIORITY = {
  "^": 30,
  "%": 30,
  "*": 20,
  "/": 20,
  "+": 15,
  "-": 15,
  "&": 13,
  ">": 10,
  "<>": 10,
  ">=": 10,
  "<": 10,
  "<=": 10,
  "=": 10,
};

const FUNCTION_BP = 6;

function bindingPower(token: Token): number {
  switch (token.type) {
    case "NUMBER":
    case "SYMBOL":
    case "REFERENCE":
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
  throw new Error(_lt("Unknown token: %s", token.value));
}

function parsePrefix(current: Token, tokens: Token[]): AST {
  switch (current.type) {
    case "DEBUGGER":
      const next = parseExpression(tokens, 1000);
      next.debug = true;
      return next;
    case "NUMBER":
      return { type: "NUMBER", value: parseNumber(current.value) };
    case "STRING":
      return { type: "STRING", value: removeStringQuotes(current.value) };
    case "FUNCTION":
      if (tokens.shift()!.type !== "LEFT_PAREN") {
        throw new Error(_lt("Wrong function call"));
      } else {
        const args: AST[] = [];
        if (tokens[0] && tokens[0].type !== "RIGHT_PAREN") {
          if (tokens[0].type === "COMMA") {
            args.push({ type: "UNKNOWN", value: "" });
          } else {
            args.push(parseExpression(tokens, FUNCTION_BP));
          }
          while (tokens[0]?.type === "COMMA") {
            tokens.shift();
            const token = tokens[0] as Token | undefined;
            if (token?.type === "RIGHT_PAREN") {
              args.push({ type: "UNKNOWN", value: "" });
              break;
            } else if (token?.type === "COMMA") {
              args.push({ type: "UNKNOWN", value: "" });
            } else {
              args.push(parseExpression(tokens, FUNCTION_BP));
            }
          }
        }
        const closingToken = tokens.shift();
        if (!closingToken || closingToken.type !== "RIGHT_PAREN") {
          throw new Error(_lt("Wrong function call"));
        }
        return { type: "FUNCALL", value: current.value, args };
      }
    case "INVALID_REFERENCE":
      throw new InvalidReferenceError();
    case "REFERENCE":
      if (tokens[0]?.value === ":" && tokens[1]?.type === "REFERENCE") {
        tokens.shift();
        const rightReference = tokens.shift();
        return {
          type: "REFERENCE",
          value: `${current.value}:${rightReference?.value}`,
        };
      }
      return {
        type: "REFERENCE",
        value: current.value,
      };
    case "SYMBOL":
      if (["TRUE", "FALSE"].includes(current.value.toUpperCase())) {
        return { type: "BOOLEAN", value: current.value.toUpperCase() === "TRUE" } as AST;
      } else {
        if (current.value) {
          if (functionRegex.test(current.value) && tokens[0]?.type === "LEFT_PAREN") {
            throw new UnknownFunctionError(current.value);
          }
          throw new Error(_lt("Invalid formula"));
        }
        return { type: "STRING", value: current.value };
      }
    case "LEFT_PAREN":
      const result = parseExpression(tokens, 5);
      if (!tokens.length || tokens[0].type !== "RIGHT_PAREN") {
        throw new Error(_lt("Unmatched left parenthesis"));
      }
      tokens.shift();
      return result;
    default:
      if (current.type === "OPERATOR" && UNARY_OPERATORS_PREFIX.includes(current.value)) {
        return {
          type: "UNARY_OPERATION",
          value: current.value,
          operand: parseExpression(tokens, OP_PRIORITY[current.value]),
        };
      }
      throw new Error(_lt("Unexpected token: %s", current.value));
  }
}

function parseInfix(left: AST, current: Token, tokens: Token[]): AST {
  if (current.type === "OPERATOR") {
    const bp = bindingPower(current);
    if (UNARY_OPERATORS_POSTFIX.includes(current.value)) {
      return {
        type: "UNARY_OPERATION",
        value: current.value,
        operand: left,
        postfix: true,
      };
    } else {
      const right = parseExpression(tokens, bp);
      return {
        type: "BIN_OPERATION",
        value: current.value,
        left,
        right,
      };
    }
  }
  throw new Error(DEFAULT_ERROR_MESSAGE);
}

function parseExpression(tokens: Token[], bp: number): AST {
  const token = tokens.shift();
  if (!token) {
    throw new Error(DEFAULT_ERROR_MESSAGE);
  }
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
  return parseTokens(rangeTokenize(str));
}

export function parseTokens(tokens: Token[]): AST {
  tokens = tokens.filter((x) => x.type !== "SPACE");
  if (tokens[0].type === "OPERATOR" && tokens[0].value === "=") {
    tokens.splice(0, 1);
  }
  const result = parseExpression(tokens, 0);
  if (tokens.length) {
    throw new Error(DEFAULT_ERROR_MESSAGE);
  }
  return result;
}

/**
 * Allows to visit all nodes of an AST and apply a mapping function
 * to nodes of a specific type.
 * Useful if you want to convert some part of a formula.
 *
 * e.g.
 * ```ts
 * convertAstNodes(ast, "FUNCALL", convertFormulaToExcel)
 *
 * function convertFormulaToExcel(ast: ASTFuncall) {
 *   // ...
 *   return modifiedAst
 * }
 * ```
 */
export function convertAstNodes<T extends AST["type"]>(
  ast: AST,
  type: T,
  fn: (ast: Extract<AST, { type: T }>) => AST
) {
  if (type === ast.type) {
    ast = fn(ast as Extract<AST, { type: T }>);
  }
  switch (ast.type) {
    case "FUNCALL":
      return {
        ...ast,
        args: ast.args.map((child) => convertAstNodes(child, type, fn)),
      };
    case "UNARY_OPERATION":
      return {
        ...ast,
        operand: convertAstNodes(ast.operand, type, fn),
      };
    case "BIN_OPERATION":
      return {
        ...ast,
        right: convertAstNodes(ast.right, type, fn),
        left: convertAstNodes(ast.left, type, fn),
      };
    default:
      return ast;
  }
}

/**
 * Converts an ast formula to the corresponding string
 */
export function astToFormula(ast: AST): string {
  switch (ast.type) {
    case "FUNCALL":
      const args = ast.args.map((arg) => astToFormula(arg));
      return `${ast.value}(${args.join(",")})`;
    case "NUMBER":
      return ast.value.toString();
    case "REFERENCE":
      return ast.value;
    case "STRING":
      return `"${ast.value}"`;
    case "BOOLEAN":
      return ast.value ? "TRUE" : "FALSE";
    case "UNARY_OPERATION":
      return ast.postfix
        ? leftOperandToFormula(ast) + ast.value
        : ast.value + rightOperandToFormula(ast);
    case "BIN_OPERATION":
      return leftOperandToFormula(ast) + ast.value + rightOperandToFormula(ast);
    default:
      return ast.value;
  }
}

/**
 * Convert the left operand of a binary operation to the corresponding string
 * and enclose the result inside parenthesis if necessary.
 */
function leftOperandToFormula(operationAST: ASTOperation | ASTUnaryOperation): string {
  const mainOperator = operationAST.value;
  const leftOperation = "left" in operationAST ? operationAST.left : operationAST.operand;
  const leftOperator = leftOperation.value;
  const needParenthesis =
    leftOperation.type === "BIN_OPERATION" && OP_PRIORITY[leftOperator] < OP_PRIORITY[mainOperator];
  return needParenthesis ? `(${astToFormula(leftOperation)})` : astToFormula(leftOperation);
}

/**
 * Convert the right operand of a binary or unary operation to the corresponding string
 * and enclose the result inside parenthesis if necessary.
 */
function rightOperandToFormula(operationAST: ASTOperation | ASTUnaryOperation): string {
  const mainOperator = operationAST.value;
  const rightOperation = "right" in operationAST ? operationAST.right : operationAST.operand;
  const rightPriority = OP_PRIORITY[rightOperation.value];
  const mainPriority = OP_PRIORITY[mainOperator];
  let needParenthesis = false;
  if (rightOperation.type !== "BIN_OPERATION") {
    needParenthesis = false;
  } else if (rightPriority < mainPriority) {
    needParenthesis = true;
  } else if (rightPriority === mainPriority && !ASSOCIATIVE_OPERATORS.includes(mainOperator)) {
    needParenthesis = true;
  }
  return needParenthesis ? `(${astToFormula(rightOperation)})` : astToFormula(rightOperation);
}
