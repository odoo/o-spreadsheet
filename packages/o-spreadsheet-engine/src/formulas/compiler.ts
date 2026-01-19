import { argTargeting } from "../functions/arguments";
import { functionRegistry } from "../functions/function_registry";
import { concat, parseNumber, unquote } from "../helpers";
import { _t } from "../translation";
import { CoreGetters } from "../types/core_getters";
import { BadExpressionError, UnknownFunctionError } from "../types/errors";
import { DEFAULT_LOCALE } from "../types/locale";
import { FormulaToExecute, LiteralValues, UID } from "../types/misc";
import { Range, RangeStringOptions } from "../types/range";
import { FunctionCode, FunctionCodeBuilder, Scope } from "./code_builder";
import { AST, ASTFuncall, iterateAstNodes, parseTokens } from "./parser";
import { rangeTokenize } from "./range_tokenizer";
import { Token } from "./tokenizer";

const functions = functionRegistry.content;

export const OPERATOR_MAP = {
  // export for test
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

export const UNARY_OPERATOR_MAP = {
  // export for test
  "-": "UMINUS",
  "+": "UPLUS",
  "%": "UNARY.PERCENT",
  "#": "SPILLED.RANGE",
};

interface ICompiledFormula {
  execute: FormulaToExecute;
  tokens: Token[];
  dependencies: string[];
  isBadExpression: boolean;
  normalizedFormula: string;
  literalValues: LiteralValues;
  symbols: string[];
}

// this cache contains all compiled function code, grouped by "structure". For
// example, "=2*sum(A1:A4)" and "=2*sum(B1:B4)" are compiled into the same
// structural function.
// It is only exported for testing purposes
export const functionCache: { [key: string]: FormulaToExecute } = {};

export class CompiledFormula implements Omit<ICompiledFormula, "tokens"> {
  private readonly _tokens: Token[];
  literalValues: LiteralValues;
  symbols: string[];
  private _dependencies?: string[];
  isBadExpression: boolean;
  normalizedFormula: string;
  execute: FormulaToExecute;
  private _rangeDependencies?: Range[];
  hasDependencies: boolean;
  sheetId: UID;

  constructor(
    sheetId: UID,
    tokens: Token[],
    literalValues: LiteralValues,
    symbols: string[],
    dependencies: string[] | Range[],
    isBadExpression: boolean,
    normalizedFormula: string,
    execute: FormulaToExecute
  ) {
    this.sheetId = sheetId;
    this._tokens = tokens;
    this.literalValues = literalValues;
    this.symbols = symbols;
    this.hasDependencies = dependencies?.length > 0;
    if (dependencies.every((x) => typeof x === "string")) {
      this._dependencies = dependencies;
      this._rangeDependencies = undefined;
    } else {
      if (isBadExpression) {
        throw new Error(
          "A bad expression cannot have range dependencies. It should only have string dependencies."
        );
      }
      this._dependencies = undefined;
      this._rangeDependencies = dependencies;
    }
    this.isBadExpression = isBadExpression;
    this.normalizedFormula = normalizedFormula;
    this.execute = execute;
  }

  getTokens(getters: CoreGetters, referenceOption?: RangeStringOptions): readonly Token[] {
    let referenceIndex = 0;
    let numberIndex = 0;
    let stringIndex = 0;
    if (this.isBadExpression) {
      return Object.freeze(this._tokens);
    }
    return this._tokens.map((token: Token) => {
      switch (token.type) {
        case "REFERENCE":
          token.value = getters.getRangeString(
            this.rangeDependencies[referenceIndex++],
            this.sheetId,
            referenceOption
          );
          break;
        case "NUMBER":
          token.value = this.literalValues.numbers[numberIndex++].value.toString();
          break;
        case "STRING":
          token.value = `"${
            this.literalValues.strings[stringIndex++].value /*.replace(
              /"/g,
              '""'
            )*/
          }"`;
          break;
      }
      return token;
    });
  }

  get dependencies(): string[] {
    if (this.hasDependencies) {
      if (!this._dependencies?.length) {
        throw new Error(
          "Dependencies have had its range adapted but not yet converted back to string"
        );
      }
    }
    return this._dependencies || [];
  }

  get rangeDependencies(): Range[] {
    if (this.hasDependencies) {
      if (!this._rangeDependencies) {
        throw new Error("Range dependencies have not been ensured yet.");
      }
    }
    return this._rangeDependencies || [];
  }

  convertXCDependenciesToRange(
    getRangeFromSheetXC: (defaultSheetId: UID, sheetXC: string) => Range,
    sheetId?: UID
  ) {
    if (this.hasDependencies && this._dependencies) {
      this._rangeDependencies = this._dependencies.map((xc: string) =>
        getRangeFromSheetXC(sheetId || this.sheetId, xc)
      );
      this._dependencies = undefined;
    }
  }

  toFormulaString(getters: CoreGetters, referenceOption?: RangeStringOptions): string {
    if (this.isBadExpression) {
      return this.normalizedFormula;
    }

    return concat(this.getTokens(getters, referenceOption).map((t) => t.value));
  }

  usesSymbol(symbol: string) {
    return this._tokens.some((t) => t.type === "SYMBOL" && t.value === symbol);
  }

  areAllFunctionsExportableToExcel(): boolean {
    try {
      const nonExportableFunctions = iterateAstNodes(parseTokens(this._tokens)).filter(
        (ast) => ast.type === "FUNCALL" && !functions[ast.value.toUpperCase()]?.isExported
      );
      return nonExportableFunctions.length === 0;
    } catch (error) {
      return false;
    }
  }

  getFunctionsFromTokens(functionNames: string[], getters: CoreGetters) {
    // Parsing is an expensive operation, so we first check if the
    // formula contains one of the function names
    if (!functionNames.some((functionName) => this.usesSymbol(functionName))) {
      return [];
    }
    let ast: AST | undefined;
    try {
      ast = parseTokens(this.getTokens(getters));
    } catch {
      return [];
    }
    return iterateAstNodes(ast)
      .filter((node) => node.type === "FUNCALL" && functionNames.includes(node.value.toUpperCase()))
      .map((node: ASTFuncall) => ({
        functionName: node.value.toUpperCase(),
        args: node.args,
      }));
  }

  isFirstNonWhitespaceToken(tokenValue: string): boolean {
    const firstNonSpaceToken = this._tokens.find((token, i) => i > 0 && token.type !== "SPACE");
    return (
      firstNonSpaceToken?.type === "SYMBOL" && firstNonSpaceToken.value.toUpperCase() === tokenValue
    );
  }

  static CopyWithDependencies(
    base: CompiledFormula,
    sheetId: UID,
    dependencies: string[] | Range[]
  ): CompiledFormula {
    return new CompiledFormula(
      sheetId,
      base._tokens,
      base.literalValues,
      base.symbols,
      dependencies,
      base.isBadExpression,
      base.normalizedFormula,
      base.execute
    );
  }

  static CopyWithDependenciesAndLiteral(
    base: CompiledFormula,
    sheetId: UID,
    dependencies: Range[],
    literalNumbers: { value: number }[],
    literalStrings: { value: string }[]
  ): CompiledFormula {
    return new CompiledFormula(
      sheetId,
      base._tokens,
      { numbers: literalNumbers, strings: literalStrings },
      base.symbols,
      dependencies,
      base.isBadExpression,
      base.normalizedFormula,
      base.execute
    );
  }

  static CompileForSerializedFormula(
    sheetId: UID,
    base: SerializedBananaCompiledFormula
  ): CompiledFormula {
    const compiledFormula = compileTokens(base._tokens);
    return new CompiledFormula(
      sheetId,
      compiledFormula.tokens,
      base.literalValues,
      compiledFormula.symbols,
      base._rangeDependencies,
      base.isBadExpression,
      base.normalizedFormula,
      compiledFormula.execute
    );
  }
}

export type SerializedBananaCompiledFormula = {
  sheetId: UID;
  _tokens: Token[];
  literalValues: LiteralValues;
  symbols: string[];
  _rangeDependencies: Range[];
  isBadExpression: boolean;
  normalizedFormula: string;
};

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------

export function compile(formula: string, sheetId: UID): CompiledFormula {
  const tokens = rangeTokenize(formula);
  const compiledFormula = compileTokens(tokens);
  return new CompiledFormula(
    sheetId,
    compiledFormula.tokens,
    compiledFormula.literalValues,
    compiledFormula.symbols,
    compiledFormula.dependencies,
    compiledFormula.isBadExpression,
    compiledFormula.normalizedFormula,
    compiledFormula.execute
  );
}

export function compileTokens(tokens: Token[]): ICompiledFormula {
  try {
    return compileTokensOrThrow(tokens);
  } catch (error) {
    return {
      tokens,
      literalValues: { numbers: [], strings: [] },
      symbols: [],
      dependencies: [],
      execute: function () {
        return error;
      },
      isBadExpression: true,
      normalizedFormula: tokens.map((t) => t.value).join(""),
    };
  }
}

function compileTokensOrThrow(tokens: Token[]): ICompiledFormula {
  const { dependencies, literalValues, symbols } = formulaArguments(tokens);
  const cacheKey = compilationCacheKey(tokens);
  if (!functionCache[cacheKey]) {
    const ast = parseTokens([...tokens]);
    const scope = new Scope();

    let stringCount = 0;
    let numberCount = 0;
    let dependencyCount = 0;

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
    const baseFunction = new Function(
      "deps", // the dependencies in the current formula
      "ref", // a function to access a certain dependency at a given index
      "range", // same as above, but guarantee that the result is in the form of a range
      "getSymbolValue",
      "ctx",
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

      const argToFocus = argTargeting(functionDefinition, args.length);

      for (let i = 0; i < args.length; i++) {
        const argDefinition = functionDefinition.args[argToFocus(i).index ?? -1];
        const currentArg = args[i];
        const argTypes = argDefinition.type || [];

        // detect when an argument need to be evaluated as a meta argument
        const isMeta = argTypes.includes("META") || argTypes.includes("RANGE<META>");
        const hasRange = argTypes.some((t) => isRangeType(t));

        compiledArgs.push(compileAST(currentArg, isMeta, hasRange));
      }

      return compiledArgs;
    }

    /**
     * This function compiles all the information extracted by the parser into an
     * executable code for the evaluation of the cells content. It uses a cache to
     * not reevaluate identical code structures.
     *
     * The function is sensitive to parameter “isMeta”. This
     * parameter may vary when compiling function arguments:
     * isMeta: In some cases the function arguments expects information on the
     * cell/range other than the associated value(s). For example the COLUMN
     * function needs to receive as argument the coordinates of a cell rather
     * than its value. For this we have meta arguments.
     */
    function compileAST(ast: AST, isMeta = false, hasRange = false): FunctionCode {
      const code = new FunctionCodeBuilder(scope);
      if (ast.type !== "REFERENCE" && !(ast.type === "BIN_OPERATION" && ast.value === ":")) {
        if (isMeta) {
          throw new BadExpressionError(_t("Argument must be a reference to a cell or range."));
        }
      }
      if (ast.debug) {
        code.append("debugger;");
        code.append(`ctx["debug"] = true;`);
      }
      switch (ast.type) {
        case "BOOLEAN":
          return code.return(`{ value: ${ast.value} }`);
        case "NUMBER":
          return code.return(`this.literalValues.numbers[${numberCount++}]`);
        case "STRING":
          return code.return(`this.literalValues.strings[${stringCount++}]`);
        case "REFERENCE":
          return code.return(
            `${ast.value.includes(":") || hasRange ? `range` : `ref`}(deps[${dependencyCount++}], ${
              isMeta ? "true" : "false"
            })`
          );
        case "FUNCALL":
          const args = compileFunctionArgs(ast).map((arg) => arg.assignResultToVariable());
          code.append(...args);
          const fnName = ast.value.toUpperCase();
          return code.return(`ctx['${fnName}'](${args.map((arg) => arg.returnExpression)})`);
        case "ARRAY": {
          // a literal array is compiled into function calls
          const arrayFunctionCall: ASTFuncall = {
            type: "FUNCALL",
            value: "ARRAY.LITERAL",
            args: ast.value.map((row) => ({
              type: "FUNCALL",
              value: "ARRAY.ROW",
              args: row,
              tokenStartIndex: 0,
              tokenEndIndex: 0,
            })),
            tokenStartIndex: 0,
            tokenEndIndex: 0,
          };
          return compileAST(arrayFunctionCall);
        }
        case "UNARY_OPERATION": {
          const fnName = UNARY_OPERATOR_MAP[ast.value];
          const { isMeta, hasRange } =
            ast.value === "#"
              ? { isMeta: true, hasRange: true } // hasRange is true to avoid vectorization of SPILLED.RANGE
              : { isMeta: false, hasRange: false };
          const operand = compileAST(ast.operand, isMeta, hasRange).assignResultToVariable();
          code.append(operand);
          return code.return(`ctx['${fnName}'](${operand.returnExpression})`);
        }
        case "BIN_OPERATION": {
          const fnName = OPERATOR_MAP[ast.value];
          const left = compileAST(ast.left, false, false).assignResultToVariable();
          const right = compileAST(ast.right, false, false).assignResultToVariable();
          code.append(left);
          code.append(right);
          return code.return(
            `ctx['${fnName}'](${left.returnExpression}, ${right.returnExpression})`
          );
        }
        case "SYMBOL":
          const symbolIndex = symbols.indexOf(ast.value);
          return code.return(`getSymbolValue(this.symbols[${symbolIndex}])`);
        case "EMPTY":
          return code.return("undefined");
      }
    }
  }
  const compiledFormula: ICompiledFormula = {
    execute: functionCache[cacheKey],
    dependencies,
    literalValues,
    symbols,
    tokens,
    isBadExpression: false,
    normalizedFormula: cacheKey,
  };
  return compiledFormula;
}

/**
 * Compute a cache key for the formula.
 * References, numbers and strings are replaced with placeholders because
 * the compiled formula does not depend on their actual value.
 * Both `=A1+1+"2"` and `=A2+2+"3"` are compiled to the exact same function.
 * Spaces are also ignored to compute the cache key.
 *
 * A formula `=A1+A2+SUM(2, 2, "2")` have the cache key `=|C|+|C|+SUM(|N|,|N|,|S|)`
 */
function compilationCacheKey(tokens: Token[]): string {
  let cacheKey = "";
  for (const token of tokens) {
    switch (token.type) {
      case "STRING":
        cacheKey += "|S|";
        break;
      case "NUMBER":
        cacheKey += "|N|";
        break;
      case "REFERENCE":
      case "INVALID_REFERENCE":
        if (token.value.includes(":")) {
          cacheKey += "|R|";
        } else {
          cacheKey += "|C|";
        }
        break;
      case "SPACE":
        // ignore spaces
        break;
      default:
        cacheKey += token.value;
        break;
    }
  }
  return cacheKey;
}

/**
 * Return formula arguments which are references, strings and numbers.
 */
function formulaArguments(tokens: Token[]) {
  const literalValues: LiteralValues = {
    numbers: [],
    strings: [],
  };
  const dependencies: string[] = [];
  const symbols: string[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "INVALID_REFERENCE":
      case "REFERENCE":
        dependencies.push(token.value);
        break;
      case "STRING":
        const value = unquote(token.value);
        literalValues.strings.push({ value });
        break;
      case "NUMBER": {
        const value = parseNumber(token.value, DEFAULT_LOCALE);
        literalValues.numbers.push({ value });
        break;
      }
      case "SYMBOL": {
        // function name symbols are also included here
        symbols.push(unquote(token.value, "'"));
      }
    }
  }
  return {
    dependencies,
    literalValues,
    symbols,
  };
}

/**
 * Check if arguments are supplied in the correct quantities
 */
function assertEnoughArgs(ast: ASTFuncall) {
  const nbrArgSupplied = ast.args.length;
  const functionName = ast.value.toUpperCase();
  const functionDefinition = functions[functionName];
  const { nbrArgRepeating, minArgRequired } = functionDefinition;

  if (nbrArgSupplied < minArgRequired) {
    throw new BadExpressionError(
      _t(
        "Invalid number of arguments for the %(functionName)s function. Expected %(minArgRequired)s minimum, but got %(nbrArgSupplied)s instead.",
        {
          functionName,
          minArgRequired,
          nbrArgSupplied,
        }
      )
    );
  }

  if (nbrArgSupplied > functionDefinition.maxArgPossible) {
    throw new BadExpressionError(
      _t(
        "Invalid number of arguments for the %(functionName)s function. Expected %(maxArgPossible)s maximum, but got %(nbrArgSupplied)s instead.",
        {
          functionName,
          maxArgPossible: functionDefinition.maxArgPossible,
          nbrArgSupplied,
        }
      )
    );
  }

  if (nbrArgRepeating > 1) {
    const nbrValueRepeating =
      nbrArgRepeating * Math.floor((nbrArgSupplied - minArgRequired) / nbrArgRepeating);
    const nbrValueRemaining =
      nbrArgSupplied -
      minArgRequired -
      nbrValueRepeating -
      functionDefinition.nbrOptionalNonRepeatingArgs;

    if (nbrValueRemaining > 0) {
      throw new BadExpressionError(
        _t(
          "Invalid number of arguments for the %(functionName)s function. Repeatable arguments should be supplied in groups of %(nbrArgRepeating)s, with up to %(nbrArgOptional)s optional. Got %(nbrValueRemaining)s too many.",
          {
            functionName,
            nbrArgRepeating,
            nbrArgOptional: functionDefinition.nbrOptionalNonRepeatingArgs,
            nbrValueRemaining,
          }
        )
      );
    }
  }
}

function isRangeType(type: string) {
  return type.startsWith("RANGE");
}
