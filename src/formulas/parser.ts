import { DEFAULT_ERROR_MESSAGE } from "../constants";
import { cellReference, parseNumber } from "../helpers/index";
import { _lt } from "../translation";
import { Dependencies, NormalizedFormulaString } from "../types";
import { Token, tokenize } from "./tokenizer";

const UNARY_OPERATORS = ["-", "+"];

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

interface ASTNormalizedNumber extends ASTBase {
  type: "NORMALIZED_NUMBER";
  value: number;
}

interface ASTReference extends ASTBase {
  type: "REFERENCE";
  value: string;
}

interface ASTNormalizedReference extends ASTBase {
  type: "NORMALIZED_REFERENCE";
  value: number;
}

export interface ASTString extends ASTBase {
  type: "STRING";
  value: string;
}

interface ASTNormalizedString extends ASTBase {
  type: "NORMALIZED_STRING";
  value: number;
}

interface ASTBoolean extends ASTBase {
  type: "BOOLEAN";
  value: boolean;
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
  | ASTNormalizedReference
  | ASTNormalizedNumber
  | ASTNormalizedString
  | ASTUnknown;

const OP_PRIORITY = {
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

const FUNCTION_BP = 6;

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
    case "NORMALIZED_NUMBER":
      return { type: "NORMALIZED_NUMBER", value: parseInt(current.value, 10) };
    case "STRING":
      return { type: "STRING", value: current.value };
    case "NORMALIZED_STRING":
      return { type: "NORMALIZED_STRING", value: parseInt(current.value, 10) };
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
    case "REFERENCE":
      return {
        type: "NORMALIZED_REFERENCE",
        value: parseInt(current.value, 10),
      };
    case "INVALID_REFERENCE":
      throw new Error(_lt("Invalid reference"));
    case "SYMBOL":
      if (cellReference.test(current.value)) {
        return {
          type: "REFERENCE",
          value: current.value,
        };
      } else {
        if (["TRUE", "FALSE"].includes(current.value.toUpperCase())) {
          return { type: "BOOLEAN", value: current.value.toUpperCase() === "TRUE" } as AST;
        } else {
          if (current.value) {
            throw new Error(_lt("Invalid formula"));
          }
          return { type: "STRING", value: current.value };
        }
      }
    case "LEFT_PAREN":
      const result = parseExpression(tokens, 5);
      if (!tokens.length || tokens[0].type !== "RIGHT_PAREN") {
        throw new Error(_lt("Unmatched left parenthesis"));
      }
      tokens.shift();
      return result;
    default:
      if (current.type === "OPERATOR" && UNARY_OPERATORS.includes(current.value)) {
        return {
          type: "UNARY_OPERATION",
          value: current.value,
          right: parseExpression(tokens, OP_PRIORITY[current.value]),
        };
      }
      throw new Error(_lt("Unexpected token: %s", current.value));
  }
}

function parseInfix(left: AST, current: Token, tokens: Token[]): AST {
  if (current.type === "OPERATOR") {
    const bp = bindingPower(current);
    const right = parseExpression(tokens, bp);

    return {
      type: "BIN_OPERATION",
      value: current.value,
      left,
      right,
    };
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
export function parse(str: NormalizedFormulaString): AST {
  const tokens = tokenize(str).filter((x) => x.type !== "SPACE");
  if (tokens[0] && tokens[0].type === "OPERATOR" && tokens[0].value === "=") {
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
        right: convertAstNodes(ast.right, type, fn),
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
export function astToFormula(
  ast: AST,
  dependencies: Dependencies = { references: [], numbers: [], strings: [] }
): string {
  switch (ast.type) {
    case "FUNCALL":
      const args = ast.args.map((arg) => astToFormula(arg, dependencies));
      return `${ast.value}(${args.join(",")})`;
    case "NUMBER":
      return ast.value.toString();
    case "NORMALIZED_STRING":
      return `"${dependencies.strings[ast.value]}"`;
    case "NORMALIZED_NUMBER":
      return dependencies.numbers[ast.value].toString();
    case "NORMALIZED_REFERENCE":
      return dependencies.references[ast.value].toString();
    case "REFERENCE":
    case "STRING":
      return ast.value;
    case "BOOLEAN":
      return ast.value ? "TRUE" : "FALSE";
    case "UNARY_OPERATION":
      return ast.value + rightOperandToFormula(ast, dependencies);
    case "BIN_OPERATION":
      return (
        leftOperandToFormula(ast, dependencies) +
        ast.value +
        rightOperandToFormula(ast, dependencies)
      );
    default:
      return ast.value;
  }
}

/**
 * Convert the left operand of a binary operation to the corresponding string
 * and enclose the result inside parenthesis if necessary.
 */
function leftOperandToFormula(
  binaryOperationAST: ASTOperation,
  dependencies: Dependencies
): string {
  const mainOperator = binaryOperationAST.value;
  const leftOperation = binaryOperationAST.left;
  const leftOperator = leftOperation.value;
  const needParenthesis =
    leftOperation.type === "BIN_OPERATION" && OP_PRIORITY[leftOperator] < OP_PRIORITY[mainOperator];
  return needParenthesis
    ? `(${astToFormula(leftOperation, dependencies)})`
    : astToFormula(leftOperation, dependencies);
}

/**
 * Convert the right operand of a binary or unary operation to the corresponding string
 * and enclose the result inside parenthesis if necessary.
 */
function rightOperandToFormula(
  binaryOperationAST: ASTOperation | ASTUnaryOperation,
  dependencies: Dependencies
): string {
  const mainOperator = binaryOperationAST.value;
  const rightOperation = binaryOperationAST.right;
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
  return needParenthesis
    ? `(${astToFormula(rightOperation, dependencies)})`
    : astToFormula(rightOperation, dependencies);
}
