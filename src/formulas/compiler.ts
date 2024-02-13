import { Token } from ".";
import { functionRegistry } from "../functions/index";
import { concat, parseNumber, removeStringQuotes } from "../helpers";
import { _t } from "../translation";
import { CompiledFormula, DEFAULT_LOCALE, FormulaToExecute } from "../types";
import { BadExpressionError, UnknownFunctionError } from "../types/errors";
import { FunctionCode, FunctionCodeBuilder, Scope } from "./code_builder";
import { AST, ASTFuncall, parseTokens } from "./parser";
import { rangeTokenize } from "./range_tokenizer";

const functions = functionRegistry.content;

const OPERATOR_MAP = {
  "=": "EQ",
  "+": "ADD",
  "-": "MINUS",
  "*": "MULTIPLY",
  "/": "DIVIDE",
  ">=": "GTE",
  "<>": "NE",
  ">": "GT",
  "<=": "LTE",
  "<": "LT",
  "^": "POWER",
  "&": "CONCATENATE",
};

const UNARY_OPERATOR_MAP = {
  "-": "UMINUS",
  "+": "UPLUS",
  "%": "UNARY.PERCENT",
};

interface ConstantValues {
  numbers: number[];
  strings: string[];
}

type InternalCompiledFormula = CompiledFormula & {
  constantValues: ConstantValues;
};

// this cache contains all compiled function code, grouped by "structure". For
// example, "=2*sum(A1:A4)" and "=2*sum(B1:B4)" are compiled into the same
// structural function.
// It is only exported for testing purposes
export const functionCache: { [key: string]: FormulaToExecute } = {};

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------

export function compile(formula: string): CompiledFormula {
  const tokens = rangeTokenize(formula);
  return compileTokens(tokens);
}

export function compileTokens(tokens: Token[]): CompiledFormula {
  const { dependencies, constantValues } = formulaArguments(tokens);
  const cacheKey = compilationCacheKey(tokens, dependencies, constantValues);
  if (!functionCache[cacheKey]) {
    const ast = parseTokens([...tokens]);
    const scope = new Scope();

    if (ast.type === "BIN_OPERATION" && ast.value === ":") {
      throw new BadExpressionError(_t("Invalid formula"));
    }
    if (ast.type === "EMPTY") {
      throw new BadExpressionError(_t("Invalid formula"));
    }
    const compiledAST = compileAST(ast);
    const code = new FunctionCodeBuilder();
    code.append(`// ${cacheKey}`);
    code.append(compiledAST);
    code.append(`return ${compiledAST.returnExpression};`);
    let baseFunction = new Function(
      "deps", // the dependencies in the current formula
      "access", // the compilation parameters containing functions to access the references and an evaluation context
      code.toString()
    );

    // @ts-ignore
    functionCache[cacheKey] = baseFunction;

    /**
     * This function compile the function arguments. It is mostly straightforward,
     * except that there is a non trivial transformation in one situation:
     *
     * If a function argument is asking for a range, and get a cell, we transform
     * the cell value into a range. This allow the grid model to differentiate
     * between a cell value and a non cell value.
     */
    function compileFunctionArgs(ast: ASTFuncall): FunctionCode[] {
      const { args } = ast;
      const functionName = ast.value.toUpperCase();
      const functionDefinition = functions[functionName];

      if (!functionDefinition) {
        throw new UnknownFunctionError(_t('Unknown function: "%s"', ast.value));
      }

      assertEnoughArgs(ast);

      const compiledArgs: FunctionCode[] = [];

      for (let i = 0; i < args.length; i++) {
        const argToFocus = functionDefinition.getArgToFocus(i + 1) - 1;
        const argDefinition = functionDefinition.args[argToFocus];
        const currentArg = args[i];
        const argTypes = argDefinition.type || [];

        // detect when an argument need to be evaluated as a meta argument
        const isMeta = argTypes.includes("META");

        const hasRange = argTypes.some((t) => isRangeType(t));
        const isRangeOnly = argTypes.every((t) => isRangeType(t));

        if (isRangeOnly) {
          if (!isRangeInput(currentArg)) {
            throw new BadExpressionError(
              _t(
                "Function %s expects the parameter %s to be reference to a cell or range, not a %s.",
                functionName,
                (i + 1).toString(),
                currentArg.type.toLowerCase()
              )
            );
          }
        }

        compiledArgs.push(
          compileAST(currentArg, isMeta, hasRange, {
            functionName,
            paramIndex: i + 1,
          })
        );
      }

      return compiledArgs;
    }

    /**
     * This function compiles all the information extracted by the parser into an
     * executable code for the evaluation of the cells content. It uses a cash to
     * not reevaluate identical code structures.
     *
     * The function is sensitive to parameter “isMeta”. This
     * parameter may vary when compiling function arguments:
     * isMeta: In some cases the function arguments expects information on the
     * cell/range other than the associated value(s). For example the COLUMN
     * function needs to receive as argument the coordinates of a cell rather
     * than its value. For this we have meta arguments.
     */
    function compileAST(
      ast: AST,
      isMeta = false,
      hasRange = false,
      referenceVerification: {
        functionName?: string;
        paramIndex?: number;
      } = {}
    ): FunctionCode {
      const code = new FunctionCodeBuilder(scope);
      if (ast.type !== "REFERENCE" && !(ast.type === "BIN_OPERATION" && ast.value === ":")) {
        if (isMeta) {
          throw new BadExpressionError(_t("Argument must be a reference to a cell or range."));
        }
      }
      if (ast.debug) {
        code.append("debugger;");
      }
      switch (ast.type) {
        case "BOOLEAN":
          return code.return(`{ value: ${ast.value} }`);
        case "NUMBER":
          return code.return(
            `{ value: this.constantValues.numbers[${constantValues.numbers.indexOf(ast.value)}] }`
          );
        case "STRING":
          return code.return(
            `{ value: this.constantValues.strings[${constantValues.strings.indexOf(ast.value)}] }`
          );
        case "REFERENCE":
          const referenceIndex = dependencies.indexOf(ast.value);
          if (hasRange) {
            return code.return(`access.range(deps[${referenceIndex}])`);
          } else {
            return code.return(
              `access.ref(deps[${referenceIndex}], ${isMeta ? "true" : "false"}, "${
                referenceVerification.functionName || OPERATOR_MAP["="]
              }",  ${referenceVerification.paramIndex})`
            );
          }
        case "FUNCALL":
          const args = compileFunctionArgs(ast).map((arg) => arg.assignResultToVariable());
          code.append(...args);
          const fnName = ast.value.toUpperCase();
          return code.return(`access.ctx['${fnName}'](${args.map((arg) => arg.returnExpression)})`);
        case "UNARY_OPERATION": {
          const fnName = UNARY_OPERATOR_MAP[ast.value];
          const operand = compileAST(ast.operand, false, false, {
            functionName: fnName,
          }).assignResultToVariable();
          code.append(operand);
          return code.return(`access.ctx['${fnName}'](${operand.returnExpression})`);
        }
        case "BIN_OPERATION": {
          const fnName = OPERATOR_MAP[ast.value];
          const left = compileAST(ast.left, false, false, {
            functionName: fnName,
          }).assignResultToVariable();
          const right = compileAST(ast.right, false, false, {
            functionName: fnName,
          }).assignResultToVariable();
          code.append(left);
          code.append(right);
          return code.return(
            `access.ctx['${fnName}'](${left.returnExpression}, ${right.returnExpression})`
          );
        }
        case "EMPTY":
          return code.return("undefined");
      }
    }
  }
  const compiledFormula: InternalCompiledFormula = {
    execute: functionCache[cacheKey],
    dependencies,
    constantValues,
    tokens,
  };
  return compiledFormula;
}

/**
 * Compute a cache key for the formula.
 * References, numbers and strings are replaced with placeholders because
 * the compiled formula does not depend on their actual value.
 * Both `=A1+1+"2"` and `=A2+2+"3"` are compiled to the exact same function.
 *
 * Spaces are also ignored to compute the cache key.
 *
 * A formula `=A1+A2+SUM(2, 2, "2")` have the cache key `=|0|+|1|+SUM(|N0|,|N0|,|S0|)`
 */
function compilationCacheKey(
  tokens: Token[],
  dependencies: string[],
  constantValues: ConstantValues
): string {
  return concat(
    tokens.map((token) => {
      switch (token.type) {
        case "STRING":
          const value = removeStringQuotes(token.value);
          return `|S${constantValues.strings.indexOf(value)}|`;
        case "NUMBER":
          return `|N${constantValues.numbers.indexOf(parseNumber(token.value, DEFAULT_LOCALE))}|`;
        case "REFERENCE":
        case "INVALID_REFERENCE":
          return `|${dependencies.indexOf(token.value)}|`;
        case "SPACE":
          return "";
        default:
          return token.value;
      }
    })
  );
}

/**
 * Return formula arguments which are references, strings and numbers.
 */
function formulaArguments(tokens: Token[]) {
  const constantValues: ConstantValues = {
    numbers: [],
    strings: [],
  };
  const dependencies: string[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "INVALID_REFERENCE":
      case "REFERENCE":
        dependencies.push(token.value);
        break;
      case "STRING":
        const value = removeStringQuotes(token.value);
        if (!constantValues.strings.includes(value)) {
          constantValues.strings.push(value);
        }
        break;
      case "NUMBER": {
        const value = parseNumber(token.value, DEFAULT_LOCALE);
        if (!constantValues.numbers.includes(value)) {
          constantValues.numbers.push(value);
        }
        break;
      }
    }
  }
  return {
    dependencies,
    constantValues,
  };
}

/**
 * Check if arguments are supplied in the correct quantities
 */
function assertEnoughArgs(ast: ASTFuncall) {
  const nbrArg = ast.args.length;
  const functionName = ast.value.toUpperCase();
  const functionDefinition = functions[functionName];

  if (nbrArg < functionDefinition.minArgRequired) {
    throw new BadExpressionError(
      _t(
        "Invalid number of arguments for the %s function. Expected %s minimum, but got %s instead.",
        functionName,
        functionDefinition.minArgRequired.toString(),
        nbrArg.toString()
      )
    );
  }

  if (nbrArg > functionDefinition.maxArgPossible) {
    throw new BadExpressionError(
      _t(
        "Invalid number of arguments for the %s function. Expected %s maximum, but got %s instead.",
        functionName,
        functionDefinition.maxArgPossible.toString(),
        nbrArg.toString()
      )
    );
  }

  const repeatableArgs = functionDefinition.nbrArgRepeating;
  if (repeatableArgs > 1) {
    const unrepeatableArgs = functionDefinition.args.length - repeatableArgs;
    const repeatingArgs = nbrArg - unrepeatableArgs;
    if (repeatingArgs % repeatableArgs !== 0) {
      throw new BadExpressionError(
        _t(
          "Invalid number of arguments for the %s function. Expected all arguments after position %s to be supplied by groups of %s arguments",
          functionName,
          unrepeatableArgs.toString(),
          repeatableArgs.toString()
        )
      );
    }
  }
}

function isRangeType(type: string) {
  return type.startsWith("RANGE");
}

function isRangeInput(arg: AST) {
  if (arg.type === "REFERENCE") {
    return true;
  }
  if (arg.type === "FUNCALL") {
    const fnDef = functions[arg.value.toUpperCase()];
    return fnDef && isRangeType(fnDef.returns[0]);
  }

  return false;
}
