import { parseNumber, unquote } from "../helpers";
import { _t } from "../translation";
import { BadExpressionError, CellErrorType } from "../types/errors";
import { DEFAULT_LOCALE } from "../types/locale";
import { rangeTokenize } from "./range_tokenizer";
import { Token } from "./tokenizer";

const functionRegex = /[a-zA-Z0-9\_]+(\.[a-zA-Z0-9\_]+)*/;

const UNARY_OPERATORS_PREFIX = ["-", "+"];
const UNARY_OPERATORS_POSTFIX = ["%", "#"];

interface RichToken extends Token {
  tokenIndex: number;
}

export class TokenList {
  private tokens: RichToken[];
  currentIndex: number = 0;
  current: RichToken | undefined;
  length: number;

  constructor(tokens: RichToken[]) {
    this.tokens = tokens;
    this.current = tokens[0];
    this.length = tokens.length;
  }

  shift() {
    const current = this.tokens[this.currentIndex];
    this.current = this.tokens[++this.currentIndex];
    return current;
  }

  get next(): RichToken | undefined {
    return this.tokens[this.currentIndex + 1];
  }
}

// -----------------------------------------------------------------------------
// PARSER
// -----------------------------------------------------------------------------
interface ASTBase {
  debug?: boolean;
  tokenStartIndex: number;
  tokenEndIndex: number;
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

export interface ASTUnaryOperation extends ASTBase {
  type: "UNARY_OPERATION";
  value: any;
  operand: AST;
  postfix?: boolean; // needed to rebuild string from ast
}

export interface ASTOperation extends ASTBase {
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

export interface ASTSymbol extends ASTBase {
  type: "SYMBOL";
  value: string;
}

export interface ASTArray extends ASTBase {
  type: "ARRAY";
  value: AST[][];
}

interface ASTEmpty extends ASTBase {
  type: "EMPTY";
  value: "";
}

export type AST =
  | ASTOperation
  | ASTUnaryOperation
  | ASTFuncall
  | ASTSymbol
  | ASTArray
  | ASTNumber
  | ASTBoolean
  | ASTString
  | ASTReference
  | ASTEmpty;

export const OP_PRIORITY = {
  "#": 40,
  "%": 40,
  "^": 30,
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
function parseOperand(tokens: TokenList): AST {
  const current = tokens.shift();
  if (!current) {
    throw new BadExpressionError();
  }
  switch (current.type) {
    case "DEBUGGER":
      const next = parseExpression(tokens, 1000);
      next.debug = true;
      return next;
    case "NUMBER":
      return {
        type: "NUMBER",
        value: parseNumber(current.value, DEFAULT_LOCALE),
        tokenStartIndex: current.tokenIndex,
        tokenEndIndex: current.tokenIndex,
      };
    case "STRING":
      return {
        type: "STRING",
        value: unquote(current.value),
        tokenStartIndex: current.tokenIndex,
        tokenEndIndex: current.tokenIndex,
      };
    case "INVALID_REFERENCE":
      return {
        type: "REFERENCE",
        value: CellErrorType.InvalidReference,
        tokenStartIndex: current.tokenIndex,
        tokenEndIndex: current.tokenIndex,
      };

    case "REFERENCE":
      if (tokens.current?.value === ":" && tokens.next?.type === "REFERENCE") {
        tokens.shift();
        const rightReference = tokens.shift();
        return {
          type: "REFERENCE",
          value: `${current.value}:${rightReference?.value}`,
          tokenStartIndex: current.tokenIndex,
          tokenEndIndex: rightReference.tokenIndex,
        };
      }
      return {
        type: "REFERENCE",
        value: current.value,
        tokenStartIndex: current.tokenIndex,
        tokenEndIndex: current.tokenIndex,
      };
    case "SYMBOL":
      const value = current.value;
      const nextToken = tokens.current;
      if (
        nextToken?.type === "LEFT_PAREN" &&
        functionRegex.test(current.value) &&
        value === unquote(value, "'")
      ) {
        const { args, rightParen } = parseFunctionArgs(tokens);
        return {
          type: "FUNCALL",
          value: value,
          args,
          tokenStartIndex: current.tokenIndex,
          tokenEndIndex: rightParen.tokenIndex,
        };
      }
      const upperCaseValue = value.toUpperCase();
      if (upperCaseValue === "TRUE" || upperCaseValue === "FALSE") {
        return {
          type: "BOOLEAN",
          value: upperCaseValue === "TRUE",
          tokenStartIndex: current.tokenIndex,
          tokenEndIndex: current.tokenIndex,
        };
      }
      return {
        type: "SYMBOL",
        value: unquote(current.value, "'"),
        tokenStartIndex: current.tokenIndex,
        tokenEndIndex: current.tokenIndex,
      };
    case "LEFT_PAREN":
      const result = parseExpression(tokens);
      const rightParen = consumeOrThrow(tokens, "RIGHT_PAREN", _t("Missing closing parenthesis"));
      return {
        ...result,
        tokenStartIndex: current.tokenIndex,
        tokenEndIndex: rightParen.tokenIndex,
      };
    case "LEFT_BRACE":
      return parseArrayLiteral(tokens, current);
    case "OPERATOR":
      const operator = current.value;
      if (UNARY_OPERATORS_PREFIX.includes(operator)) {
        const operand = parseExpression(tokens, OP_PRIORITY[operator]);
        return {
          type: "UNARY_OPERATION",
          value: operator,
          operand,
          tokenStartIndex: current.tokenIndex,
          tokenEndIndex: operand.tokenEndIndex,
        };
      }
      throw new BadExpressionError(_t("Unexpected token: %s", current.value));
    default:
      throw new BadExpressionError(_t("Unexpected token: %s", current.value));
  }
}

function parseFunctionArgs(tokens: TokenList) {
  consumeOrThrow(tokens, "LEFT_PAREN", _t("Missing opening parenthesis"));
  const nextToken = tokens.current;
  if (nextToken?.type === "RIGHT_PAREN") {
    const rightParen = consumeOrThrow(tokens, "RIGHT_PAREN");
    return { args: [], rightParen };
  }
  const args: AST[] = [];
  args.push(parseOneFunctionArg(tokens));
  while (tokens.current?.type !== "RIGHT_PAREN") {
    consumeOrThrow(tokens, "ARG_SEPARATOR", _t("Wrong function call"));
    args.push(parseOneFunctionArg(tokens));
  }
  const rightParen = consumeOrThrow(tokens, "RIGHT_PAREN");
  return { args, rightParen };
}

function parseOneFunctionArg(tokens: TokenList): AST {
  const nextToken = tokens.current;
  if (nextToken?.type === "ARG_SEPARATOR" || nextToken?.type === "RIGHT_PAREN") {
    // arg is empty: "sum(1,,2)" "sum(,1)" "sum(1,)"
    return {
      type: "EMPTY",
      value: "",
      tokenStartIndex: nextToken.tokenIndex,
      tokenEndIndex: nextToken.tokenIndex,
    };
  }
  return parseExpression(tokens);
}

function consumeOrThrow(tokens: TokenList, type, message?: string) {
  const token = tokens.shift();
  if (!token || token.type !== type) {
    throw new BadExpressionError(message);
  }
  return token;
}

function parseArrayLiteral(tokens: TokenList, leftBrace: RichToken): ASTArray {
  const rows: AST[][] = [];
  let currentRow: AST[] = [parseExpression(tokens)]; // there must be at least one element

  while (tokens.current?.type !== "RIGHT_BRACE") {
    const nextToken = tokens.shift();
    if (!nextToken) {
      throw new BadExpressionError(_t("Missing closing brace"));
    } else if (nextToken.type === "ARG_SEPARATOR") {
      currentRow.push(parseExpression(tokens));
    } else if (nextToken.type === "ARRAY_ROW_SEPARATOR") {
      rows.push(currentRow);
      currentRow = [parseExpression(tokens)];
    } else {
      throw new BadExpressionError(_t("Unexpected token: %s", nextToken.value));
    }
  }
  const rightBrace = consumeOrThrow(tokens, "RIGHT_BRACE", _t("Missing closing brace"));
  rows.push(currentRow);
  return {
    type: "ARRAY",
    value: rows,
    tokenStartIndex: leftBrace.tokenIndex,
    tokenEndIndex: rightBrace.tokenIndex,
  };
}

function parseExpression(tokens: TokenList, parent_priority: number = 0): AST {
  if (tokens.length === 0) {
    throw new BadExpressionError();
  }
  let left = parseOperand(tokens);
  // as long as we have operators with higher priority than the parent one,
  // continue parsing the expression because it is a child sub-expression
  while (
    tokens.current?.type === "OPERATOR" &&
    OP_PRIORITY[tokens.current.value] > parent_priority
  ) {
    const operatorToken = tokens.shift();
    const operator = operatorToken.value;
    if (UNARY_OPERATORS_POSTFIX.includes(operator)) {
      left = {
        type: "UNARY_OPERATION",
        value: operator,
        operand: left,
        postfix: true,
        tokenStartIndex: left.tokenStartIndex,
        tokenEndIndex: operatorToken.tokenIndex,
      };
    } else {
      const right = parseExpression(tokens, OP_PRIORITY[operator]);
      left = {
        type: "BIN_OPERATION",
        value: operator,
        left,
        right,
        tokenStartIndex: left.tokenStartIndex,
        tokenEndIndex: right.tokenEndIndex,
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

export function parseTokens(tokens: readonly Token[]): AST {
  const richTokens = tokens.map((token, index) => ({
    type: token.type,
    value: token.value,
    tokenIndex: index,
  }));
  const tokensToParse = richTokens.filter((x) => x.type !== "SPACE");
  const tokenList = new TokenList(tokensToParse);
  if (tokenList.current?.value === "=") {
    tokenList.shift();
  }
  const result = parseExpression(tokenList);
  if (tokenList.current) {
    throw new BadExpressionError();
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
    case "ARRAY":
      for (const row of ast.value) {
        for (const cell of row) {
          yield* astIterator(cell);
        }
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
    case "ARRAY":
      return {
        ...ast,
        value: ast.value.map((row) => row.map((cell) => mapAst(cell, fn))),
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
