import { DEFAULT_ERROR_MESSAGE } from "../constants";
import { parseNumber, removeStringQuotes } from "../helpers/index";
import { _lt } from "../translation";
import { BadExpressionError, InvalidReferenceError, UnknownFunctionError } from "../types/errors";
import { Token, tokenize } from "./tokenizer";

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

/**
 * Parse the next operand in an arithmetic expression.
 * e.g.
 *  for 1+2*3, the next operand is 1
 *  for (1+2)*3, the next operand is (1+2)
 *  for SUM(1,2)+3, the next operand is SUM(1,2)
 */
function parseOperand(tokens: Token[]): AST {
  const current = tokens.shift();
  if (!current) {
    throw new BadExpressionError(DEFAULT_ERROR_MESSAGE);
  }
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
      const args = parseFunctionArgs(tokens);
      return { type: "FUNCALL", value: current.value, args };
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
      }
      if (current.value) {
        if (functionRegex.test(current.value) && tokens[0]?.type === "LEFT_PAREN") {
          throw new UnknownFunctionError(current.value);
        }
      }
      throw new BadExpressionError(_lt("Invalid formula"));

    case "LEFT_PAREN":
      const result = parseExpression(tokens);
      consumeOrThrow(tokens, "RIGHT_PAREN", _lt("Unmatched left parenthesis"));
      return result;
    case "OPERATOR":
      const operator = current.value;
      if (UNARY_OPERATORS_PREFIX.includes(operator)) {
        return {
          type: "UNARY_OPERATION",
          value: operator,
          operand: parseExpression(tokens, OP_PRIORITY[operator]),
        };
      }
      throw new BadExpressionError(_lt("Unexpected token: %s", current.value));
    default:
      throw new BadExpressionError(_lt("Unexpected token: %s", current.value));
  }
}

function parseFunctionArgs(tokens: Token[]): AST[] {
  consumeOrThrow(tokens, "LEFT_PAREN", _lt("Wrong function call"));
  const nextToken = tokens[0];
  if (nextToken?.type === "RIGHT_PAREN") {
    consumeOrThrow(tokens, "RIGHT_PAREN");
    return [];
  }
  const args: AST[] = [];
  args.push(parseOneFunctionArg(tokens));
  while (tokens[0]?.type !== "RIGHT_PAREN") {
    consumeOrThrow(tokens, "COMMA", _lt("Wrong function call"));
    args.push(parseOneFunctionArg(tokens));
  }
  consumeOrThrow(tokens, "RIGHT_PAREN", _lt("Wrong function call"));
  return args;
}

function parseOneFunctionArg(tokens: Token[]): AST {
  const nextToken = tokens[0];
  if (nextToken?.type === "COMMA" || nextToken?.type === "RIGHT_PAREN") {
    // arg is empty: "sum(1,,2)" "sum(,1)" "sum(1,)"
    return { type: "UNKNOWN", value: "" };
  }
  return parseExpression(tokens);
}

function consumeOrThrow(tokens, type, message = DEFAULT_ERROR_MESSAGE) {
  const token = tokens.shift();
  if (!token || token.type !== type) {
    throw new BadExpressionError(message);
  }
}

function parseExpression(tokens: Token[], parent_priority: number = 0): AST {
  if (tokens.length === 0) {
    throw new BadExpressionError(DEFAULT_ERROR_MESSAGE);
  }
  let left = parseOperand(tokens);
  // as long as we have operators with higher priority than the parent one,
  // continue parsing the expression because it is a child sub-expression
  while (tokens[0]?.type === "OPERATOR" && OP_PRIORITY[tokens[0].value] > parent_priority) {
    const operator = tokens.shift()!.value;
    if (UNARY_OPERATORS_POSTFIX.includes(operator)) {
      left = {
        type: "UNARY_OPERATION",
        value: operator,
        operand: left,
        postfix: true,
      };
    } else {
      const right = parseExpression(tokens, OP_PRIORITY[operator]);
      left = {
        type: "BIN_OPERATION",
        value: operator,
        left,
        right,
      };
    }
  }
  return left;
}

/**
 * Parse an expression (as a string) into an AST.
 */
export function parse(str: string): AST {
  return parseTokens(tokenize(str));
}

export function parseTokens(tokens: Token[]): AST {
  tokens = tokens.filter((x) => x.type !== "SPACE");
  if (tokens[0].value === "=") {
    tokens.splice(0, 1);
  }
  const result = parseExpression(tokens);
  if (tokens.length) {
    throw new BadExpressionError(DEFAULT_ERROR_MESSAGE);
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
