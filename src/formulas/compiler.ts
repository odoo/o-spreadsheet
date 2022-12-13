import { Token } from ".";
import { functionRegistry } from "../functions/index";
import { concat, parseNumber, removeStringQuotes } from "../helpers";
import { _lt } from "../translation";
import { CompiledFormula } from "../types";
import { BadExpressionError } from "../types/errors";
import { Code, CodeBuilder } from "./code_builder";
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
export const functionCache: { [key: string]: Omit<CompiledFormula, "dependencies" | "tokens"> } =
  {};

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------

export function compile(formula: string): CompiledFormula {
  const tokens = rangeTokenize(formula);
  const { dependencies, constantValues } = formulaArguments(tokens);
  const cacheKey = compilationCacheKey(tokens, dependencies, constantValues);
  if (!functionCache[cacheKey]) {
    const ast = parseTokens([...tokens]);
    let nextId = 1;

    if (ast.type === "BIN_OPERATION" && ast.value === ":") {
      throw new BadExpressionError(_lt("Invalid formula"));
    }
    if (ast.type === "UNKNOWN") {
      throw new BadExpressionError(_lt("Invalid formula"));
    }
    const compiledAST = compileAST(ast);
    const code = new CodeBuilder();
    code.addLines([`// ${cacheKey}`, compiledAST, `return ${compiledAST.returnExpression};`]);
    let baseFunction = new Function(
      "deps", // the dependencies in the current formula
      "ref", // a function to access a certain dependency at a given index
      "range", // same as above, but guarantee that the result is in the form of a range
      "ctx",
      code.toString()
    );

    functionCache[cacheKey] = {
      // @ts-ignore
      execute: baseFunction,
    };
    /**
     * This function compile the function arguments. It is mostly straightforward,
     * except that there is a non trivial transformation in one situation:
     *
     * If a function argument is asking for a range, and get a cell, we transform
     * the cell value into a range. This allow the grid model to differentiate
     * between a cell value and a non cell value.
     */
    function compileFunctionArgs(ast: ASTFuncall): Code[] {
      const functionDefinition = functions[ast.value.toUpperCase()];
      const currentFunctionArguments = ast.args;

      // check if arguments are supplied in the correct quantities

      const nbrArg = currentFunctionArguments.length;

      if (nbrArg < functionDefinition.minArgRequired) {
        throw new BadExpressionError(
          _lt(
            "Invalid number of arguments for the %s function. Expected %s minimum, but got %s instead.",
            ast.value.toUpperCase(),
            functionDefinition.minArgRequired.toString(),
            nbrArg.toString()
          )
        );
      }

      if (nbrArg > functionDefinition.maxArgPossible) {
        throw new BadExpressionError(
          _lt(
            "Invalid number of arguments for the %s function. Expected %s maximum, but got %s instead.",
            ast.value.toUpperCase(),
            functionDefinition.maxArgPossible.toString(),
            nbrArg.toString()
          )
        );
      }

      const repeatingArg = functionDefinition.nbrArgRepeating;
      if (repeatingArg > 1) {
        const argBeforeRepeat = functionDefinition.args.length - repeatingArg;
        const nbrRepeatingArg = nbrArg - argBeforeRepeat;
        if (nbrRepeatingArg % repeatingArg !== 0) {
          throw new BadExpressionError(
            _lt(
              "Invalid number of arguments for the %s function. Expected all arguments after position %s to be supplied by groups of %s arguments",
              ast.value.toUpperCase(),
              argBeforeRepeat.toString(),
              repeatingArg.toString()
            )
          );
        }
      }

      let listArgs: Code[] = [];
      for (let i = 0; i < nbrArg; i++) {
        const argPosition = functionDefinition.getArgToFocus(i + 1) - 1;
        if (0 <= argPosition && argPosition < functionDefinition.args.length) {
          const currentArg = currentFunctionArguments[i];
          const argDefinition = functionDefinition.args[argPosition];
          const argTypes = argDefinition.type || [];

          // detect when an argument need to be evaluated as a meta argument
          const isMeta = argTypes.includes("META");
          // detect when an argument need to be evaluated as a lazy argument
          const isLazy = argDefinition.lazy;

          const hasRange = argTypes.some(
            (t) =>
              t === "RANGE" ||
              t === "RANGE<BOOLEAN>" ||
              t === "RANGE<DATE>" ||
              t === "RANGE<NUMBER>" ||
              t === "RANGE<STRING>"
          );
          const isRangeOnly = argTypes.every(
            (t) =>
              t === "RANGE" ||
              t === "RANGE<BOOLEAN>" ||
              t === "RANGE<DATE>" ||
              t === "RANGE<NUMBER>" ||
              t === "RANGE<STRING>"
          );
          if (isRangeOnly) {
            if (currentArg.type !== "REFERENCE") {
              throw new BadExpressionError(
                _lt(
                  "Function %s expects the parameter %s to be reference to a cell or range, not a %s.",
                  ast.value.toUpperCase(),
                  (i + 1).toString(),
                  currentArg.type.toLowerCase()
                )
              );
            }
          }

          const compiledAST = compileAST(currentArg, isLazy, isMeta, hasRange, {
            functionName: ast.value.toUpperCase(),
            paramIndex: i + 1,
          });
          listArgs.push(compiledAST);
        }
      }

      return listArgs;
    }

    /**
     * This function compiles all the information extracted by the parser into an
     * executable code for the evaluation of the cells content. It uses a cash to
     * not reevaluate identical code structures.
     *
     * The function is sensitive to two parameters “isLazy” and “isMeta”. These
     * parameters may vary when compiling function arguments:
     *
     * - isLazy: In some cases the function arguments does not need to be
     * evaluated before entering the functions. For example the IF function might
     * take invalid arguments that do not need to be evaluate and thus should not
     * create an error. For this we have lazy arguments.
     *
     * - isMeta: In some cases the function arguments expects information on the
     * cell/range other than the associated value(s). For example the COLUMN
     * function needs to receive as argument the coordinates of a cell rather
     * than its value. For this we have meta arguments.
     */

    function compileAST(
      ast: AST,
      isLazy = false,
      isMeta = false,
      hasRange = false,
      referenceVerification: {
        functionName?: string;
        paramIndex?: number;
      } = {}
    ): Code {
      const code = new CodeBuilder();
      let id;
      if (ast.type !== "REFERENCE" && !(ast.type === "BIN_OPERATION" && ast.value === ":")) {
        if (isMeta) {
          throw new BadExpressionError(_lt(`Argument must be a reference to a cell or range.`));
        }
      }
      if (ast.debug) {
        code.addLine("debugger;");
      }
      switch (ast.type) {
        case "BOOLEAN":
          code.returnExpression = `{ value: ${ast.value} }`;
          if (!isLazy) {
            return code;
          }
          id = nextId++;
          break;
        case "NUMBER":
          id = nextId++;
          const statement = `{ value: this.constantValues.numbers[${constantValues.numbers.indexOf(
            ast.value
          )}] }`;
          code.returnExpression = statement;
          break;
        case "STRING":
          id = nextId++;
          code.returnExpression = `{ value: this.constantValues.strings[${constantValues.strings.indexOf(
            ast.value
          )}] }`;
          break;
        case "REFERENCE":
          const referenceIndex = dependencies.indexOf(ast.value);
          id = nextId++;
          if (hasRange) {
            code.returnExpression = `range(deps[${referenceIndex}])`;
          } else {
            const statement = `ref(deps[${referenceIndex}], ${isMeta ? "true" : "false"}, "${
              referenceVerification.functionName || OPERATOR_MAP["="]
            }",  ${referenceVerification.paramIndex})`;
            code.returnExpression = statement;
          }
          break;
        case "FUNCALL":
          id = nextId++;
          const args = compileFunctionArgs(ast);
          code.addLines(args);
          const fnName = ast.value.toUpperCase();
          code.addLine(`ctx.__lastFnCalled = '${fnName}';`);
          code.returnExpression = `ctx['${fnName}'](${args.map((arg) => arg.returnExpression)})`;
          break;
        case "UNARY_OPERATION": {
          id = nextId++;
          const fnName = UNARY_OPERATOR_MAP[ast.value];
          const operand = compileAST(ast.operand, false, false, false, {
            functionName: fnName,
          });
          code.addLines([operand, `ctx.__lastFnCalled = '${fnName}';`]);
          code.returnExpression = `ctx['${fnName}'](${operand.returnExpression})`;
          break;
        }
        case "BIN_OPERATION": {
          id = nextId++;
          const fnName = OPERATOR_MAP[ast.value];
          const left = compileAST(ast.left, false, false, false, {
            functionName: fnName,
          });
          const right = compileAST(ast.right, false, false, false, {
            functionName: fnName,
          });
          code.addLines([left, right, `ctx.__lastFnCalled = '${fnName}';`]);
          code.returnExpression = `ctx['${fnName}'](${left.returnExpression}, ${right.returnExpression})`;
          break;
        }
        case "UNKNOWN":
          code.returnExpression = "undefined";
          if (!isLazy) {
            return code;
          }
          id = nextId++;
          break;
      }
      if (isLazy) {
        code.wrapInClosure(`_${id}`);
      } else {
        code.assignResultTo(`_${id}`);
      }
      return code;
    }
  }
  const compiledFormula: InternalCompiledFormula = {
    execute: functionCache[cacheKey].execute,
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
          return `|N${constantValues.numbers.indexOf(parseNumber(token.value))}|`;
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
        const value = parseNumber(token.value);
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
