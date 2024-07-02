import { DEFAULT_ERROR_MESSAGE } from "../constants";
import { parseNumber, removeStringQuotes } from "../helpers/index";
import { _t } from "../translation";
import { DEFAULT_LOCALE } from "../types";
import { BadExpressionError, InvalidReferenceError } from "../types/errors";
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

interface ASTEmpty extends ASTBase {
  type: "EMPTY";
  value: "";
}

export type AST =
  | ASTOperation
  | ASTUnaryOperation
  | ASTFuncall
  | ASTNumber
  | ASTBoolean
  | ASTString
  | ASTReference
  | ASTEmpty;

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
      return { type: "NUMBER", value: parseNumber(current.value, DEFAULT_LOCALE) };
    case "STRING":
      return { type: "STRING", value: removeStringQuotes(current.value) };
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
      const value = current.value;
      const nextToken = tokens[0];
      if (nextToken?.type === "LEFT_PAREN" && functionRegex.test(current.value)) {
        const args = parseFunctionArgs(tokens);
        return { type: "FUNCALL", value: value, args };
      }
      const upperCaseValue = value.toUpperCase();
      if (upperCaseValue === "TRUE" || upperCaseValue === "FALSE") {
        return { type: "BOOLEAN", value: upperCaseValue === "TRUE" };
      }
      throw new BadExpressionError(_t("Invalid formula"));

    case "LEFT_PAREN":
      const result = parseExpression(tokens);
      consumeOrThrow(tokens, "RIGHT_PAREN", _t("Missing closing parenthesis"));
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
      throw new BadExpressionError(_t("Unexpected token: %s", current.value));
    default:
      throw new BadExpressionError(_t("Unexpected token: %s", current.value));
  }
}

function parseFunctionArgs(tokens: Token[]): AST[] {
  consumeOrThrow(tokens, "LEFT_PAREN", _t("Missing opening parenthesis"));
  const nextToken = tokens[0];
  if (nextToken?.type === "RIGHT_PAREN") {
    consumeOrThrow(tokens, "RIGHT_PAREN");
    return [];
  }
  const args: AST[] = [];
  args.push(parseOneFunctionArg(tokens));
  while (tokens[0]?.type !== "RIGHT_PAREN") {
    consumeOrThrow(tokens, "ARG_SEPARATOR", _t("Wrong function call"));
    args.push(parseOneFunctionArg(tokens));
  }
  consumeOrThrow(tokens, "RIGHT_PAREN");
  return args;
}

function parseOneFunctionArg(tokens: Token[]): AST {
  const nextToken = tokens[0];
  if (nextToken?.type === "ARG_SEPARATOR" || nextToken?.type === "RIGHT_PAREN") {
    // arg is empty: "sum(1,,2)" "sum(,1)" "sum(1,)"
    return { type: "EMPTY", value: "" };
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
  return parseTokens(rangeTokenize(str));
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
 * @example
 * convertAstNodes(ast, "FUNCALL", convertFormulaToExcel)
 *
 * function convertFormulaToExcel(ast: ASTFuncall) {
 *   // ...
 *   return modifiedAst
 * }
 */
export function convertAstNodes<T extends AST["type"]>(
  ast: AST,
  type: T,
  fn: (ast: Extract<AST, { type: T }>) => AST
): AST {
  return mapAst(ast, (ast) => {
    if (ast.type === type) {
      return fn(ast as Extract<AST, { type: T }>);
    }
    return ast;
  });
}

export function iterateAstNodes(ast: AST): AST[] {
  return Array.from(astIterator(ast));
}

function* astIterator(ast: AST): Iterable<AST> {
  yield ast;
  switch (ast.type) {
    case "FUNCALL":
      for (const arg of ast.args) {
        yield* astIterator(arg);
      }
      break;
    case "UNARY_OPERATION":
      yield* astIterator(ast.operand);
      break;
    case "BIN_OPERATION":
      yield* astIterator(ast.left);
      yield* astIterator(ast.right);
      break;
  }
}

export function mapAst<T extends AST["type"]>(
  ast: AST,
  fn: (ast: Extract<AST, { type: T }>) => AST
): AST {
  ast = fn(ast as Extract<AST, { type: T }>);
  switch (ast.type) {
    case "FUNCALL":
      return {
        ...ast,
        args: ast.args.map((child) => mapAst(child, fn)),
      };
    case "UNARY_OPERATION":
      return {
        ...ast,
        operand: mapAst(ast.operand, fn),
      };
    case "BIN_OPERATION":
      return {
        ...ast,
        right: mapAst(ast.right, fn),
        left: mapAst(ast.left, fn),
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
