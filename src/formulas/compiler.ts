import { argTargeting } from "../functions/arguments";
import {
  createComputeFunction,
  createVectorizedComputeFunction,
} from "../functions/create_compute_function";
import { functionRegistry } from "../functions/function_registry";
import { canBeNamedRangeToken } from "../helpers/formulas";
import { concat, unquote } from "../helpers/misc";
import { parseNumber } from "../helpers/numbers";
import { _t } from "../translation";
import { CoreGetters } from "../types/core_getters";
import { BadExpressionError, EvaluationError, UnknownFunctionError } from "../types/errors";
import { PreparedComputeFunction } from "../types/functions";
import { DEFAULT_LOCALE } from "../types/locale";
import {
  ApplyRangeChange,
  ApplyRenameNamedRange,
  FormulaToExecute,
  LiteralValues,
  NamedRange,
  UID,
} from "../types/misc";
import { Range, RangeStringOptions } from "../types/range";
import {
  dangerouslyCreateJsStr,
  FunctionCode,
  FunctionCodeBuilder,
  jsStr,
  Scope,
} from "./code_builder";
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
  preparedFunctions: PreparedComputeFunction[];
  tokens: Token[];
  dependencies: string[];
  isBadExpression: boolean;
  normalizedFormula: string;
  literalValues: LiteralValues;
  symbols: string[];
}

const NO_REAL_VALUE = "__NO_REAL_VALUE__";

// this cache contains all compiled function code, grouped by "structure". For
// example, "=2*sum(A1:A4)" and "=2*sum(B1:B4)" are compiled into the same
// structural function.
// It is only exported for testing purposes
export const functionCache: { [key: string]: FormulaToExecute } = {};

export const preparedFunctionsCache: {
  [key: string]: PreparedComputeFunction[];
} = {};

const collator = new Intl.Collator("en", { sensitivity: "accent" });

/**
 * A compiled formula is the result of the compilation of a formula string.
 * It contains all the information needed to execute the formula, as well as some metadata
 * about the formula (dependencies, literal values, symbols...) that can be used to rebuild a slightly different formula
 * without recompiling it (for example when the formula is copied to another cell, or when we want to replace literal values but keep the same structure).
 * */
export class CompiledFormula implements Omit<ICompiledFormula, "tokens" | "dependencies"> {
  public readonly rangeDependencies: Range[];
  public hasDependencies: boolean;

  private constructor(
    public readonly sheetId: UID,
    private readonly tokens: Token[],
    public readonly literalValues: LiteralValues,
    public readonly symbols: string[],
    dependencies: Range[],
    public readonly isBadExpression: boolean,
    public readonly normalizedFormula: string,
    public readonly execute: FormulaToExecute,
    public readonly preparedFunctions: PreparedComputeFunction[]
  ) {
    this.hasDependencies = dependencies?.length > 0;
    this.tokens.forEach((t) => {
      if (["REFERENCE", "NUMBER", "STRING", "INVALID_REFERENCE"].includes(t.type)) {
        t.value = NO_REAL_VALUE;
      }
    });
    this.rangeDependencies = dependencies;
  }

  private getTokens(getters: CoreGetters, referenceOption?: RangeStringOptions): readonly Token[] {
    let referenceIndex = 0;
    let numberIndex = 0;
    let stringIndex = 0;
    if (this.isBadExpression) {
      return this.tokens;
    }
    this.tokens.forEach((token: Token) => {
      switch (token.type) {
        case "REFERENCE":
        case "INVALID_REFERENCE":
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
          token.value = `"${this.literalValues.strings[stringIndex++].value}"`;
          break;
      }
    });
    return this.tokens;
  }

  getAst(getters: CoreGetters): AST {
    return parseTokens(this.getTokens(getters));
  }

  /**
   * Return the string representation of the formula, with the current dependencies and literal values.
   * This is a heavy operation as it converts the rangeDependencies to string on each call.
   * */
  toFormulaString(getters: CoreGetters, referenceOption?: RangeStringOptions): string {
    if (this.isBadExpression) {
      return this.normalizedFormula;
    }

    return concat(
      this.getTokens(getters, referenceOption)
        .filter((token) => token.type !== "SPACE")
        .map((t) => t.value)
    );
  }

  getNamedRangesInFormula(getters: CoreGetters): NamedRange[] {
    const namedRanges: NamedRange[] = [];
    for (let i = 0; i < this.tokens.length; i++) {
      if (canBeNamedRangeToken(this.tokens, i)) {
        const namedRange = getters.getNamedRange(this.tokens[i].value);
        if (namedRange) {
          namedRanges.push(namedRange);
        }
      }
    }
    return namedRanges;
  }

  usesSymbol(symbol: string) {
    return this.symbols.some((s) => collator.compare(s, symbol) === 0);
  }

  areAllFunctionsExportableToExcel(): boolean {
    if (this.isBadExpression) {
      return false;
    }
    const nonExportableFunctions = iterateAstNodes(parseTokens(this.tokens)).some(
      (ast) => ast.type === "FUNCALL" && !functions[ast.value.toUpperCase()]?.isExported
    );
    return !nonExportableFunctions;
  }

  getFunctionsFromTokens(functionNames: string[], getters: CoreGetters) {
    if (this.isBadExpression) {
      return [];
    }
    // Parsing is an expensive operation, so we first check if the
    // formula contains one of the function names
    if (!functionNames.some((functionName) => this.usesSymbol(functionName))) {
      return [];
    }
    const ast: AST = this.getAst(getters);
    return iterateAstNodes(ast)
      .filter((node) => node.type === "FUNCALL" && functionNames.includes(node.value.toUpperCase()))
      .map((node: ASTFuncall) => ({
        functionName: node.value.toUpperCase(),
        args: node.args,
      }));
  }

  isFirstNonWhitespaceSymbol(tokenValue: string): boolean {
    const firstNonSpaceToken = this.tokens.find((token, i) => i > 0 && token.type !== "SPACE");
    return (
      firstNonSpaceToken?.type === "SYMBOL" && firstNonSpaceToken.value.toUpperCase() === tokenValue
    );
  }

  adaptCompiledFormula(
    applyChange: ApplyRangeChange,
    applyUpdateNamedRange: ApplyRenameNamedRange
  ): CompiledFormula {
    const newDependencies: Range[] = [];
    let hasChanges = false;
    for (const range of this.rangeDependencies) {
      const change = applyChange(range);
      newDependencies.push(change.range);
      if (change.changeType !== "NONE") {
        hasChanges = true;
      }
    }

    const tokenChanges = this.renameNamedRangeTokens(applyUpdateNamedRange);

    if (hasChanges || tokenChanges) {
      return new CompiledFormula(
        this.sheetId,
        tokenChanges?.newTokens || this.tokens,
        this.literalValues,
        tokenChanges?.newSymbols || this.symbols,
        newDependencies,
        this.isBadExpression,
        compilationCacheKey(tokenChanges?.newTokens || this.tokens),
        this.execute,
        this.preparedFunctions
      );
    }
    return this;
  }

  /** Change the symbols and tokens on a named range change. Return undefined if nothing has changed. */
  private renameNamedRangeTokens(
    applyUpdateNamedRange: ApplyRenameNamedRange
  ): { newSymbols: string[]; newTokens: Token[] } | undefined {
    let hasChanged = false;
    const newTokens: Token[] = [];
    const newSymbols: string[] = [];
    for (let i = 0; i < this.tokens.length; i++) {
      let newToken = this.tokens[i];

      if (canBeNamedRangeToken(this.tokens, i)) {
        const newName = applyUpdateNamedRange(this.tokens[i].value);
        if (newName !== this.tokens[i].value) {
          hasChanged = true;
          newToken = { ...this.tokens[i], value: newName };
        }
      }

      newTokens.push(newToken);
      if (newToken.type === "SYMBOL") {
        newSymbols.push(newToken.value);
      }
    }

    return hasChanged ? { newSymbols, newTokens } : undefined;
  }

  static IsBadExpression(formula: string): boolean {
    const tokens = rangeTokenize(formula);
    const compiledFormula = compileTokens(tokens);
    return compiledFormula.isBadExpression;
  }

  /**
   * Recreates a CompiledFormula based on `base` with adapted dependencies.
   * */
  static CopyWithDependencies(
    base: CompiledFormula,
    sheetId: UID,
    dependencies: Range[]
  ): CompiledFormula {
    return new CompiledFormula(
      sheetId,
      base.tokens,
      base.literalValues,
      base.symbols,
      dependencies,
      base.isBadExpression,
      base.normalizedFormula,
      base.execute,
      base.preparedFunctions
    );
  }

  /**
   * Recreates a CompiledFormula based on `base` with adapted dependencies and/or different literal values.
   * */
  static CopyWithDependenciesAndLiteral(
    base: CompiledFormula,
    sheetId: UID,
    dependencies: Range[],
    literalNumbers: { value: number }[],
    literalStrings: { value: string }[]
  ): CompiledFormula {
    return new CompiledFormula(
      sheetId,
      base.tokens,
      { numbers: literalNumbers, strings: literalStrings },
      base.symbols,
      dependencies,
      base.isBadExpression,
      base.normalizedFormula,
      base.execute,
      base.preparedFunctions
    );
  }

  /**
   * When copy/pasting a formula across sheets, the formula is serialized (all it's serializable properties are kept) and deserialized on the new sheet.
   * This function allows to recompile the formula based on the serializable properties.
   * */
  static CompileForSerializedFormula(
    sheetId: UID,
    base: SerializedCompiledFormula
  ): CompiledFormula {
    const compiledFormula = compileTokens(base.tokens);
    return new CompiledFormula(
      sheetId,
      base.tokens,
      base.literalValues,
      base.symbols,
      base.rangeDependencies,
      base.isBadExpression,
      base.normalizedFormula,
      compiledFormula.execute,
      compiledFormula.preparedFunctions
    );
  }

  /**
   * Make a new instance of CompiledFormula by compiling the formula string as input by the user.
   * */
  static Compile(formula: string, sheetId: UID, getters: CoreGetters): CompiledFormula {
    const tokens = rangeTokenize(formula);
    const params = compileTokens(tokens);

    return new CompiledFormula(
      sheetId,
      params.tokens,
      params.literalValues,
      params.symbols,
      params.dependencies.map((xc: string) => getters.getRangeFromSheetXC(sheetId, xc)),
      params.isBadExpression,
      params.normalizedFormula,
      params.execute,
      params.preparedFunctions
    );
  }
}

/**
 * A compiled formula serialized
 * */
export type SerializedCompiledFormula = {
  sheetId: UID;
  tokens: Token[];
  literalValues: LiteralValues;
  symbols: string[];
  rangeDependencies: Range[];
  isBadExpression: boolean;
  normalizedFormula: string;
};

type CompiledArg = { argAST: FunctionCode; toVectorize: boolean };

// -----------------------------------------------------------------------------
// COMPILER
// -----------------------------------------------------------------------------

function compileTokens(tokens: Token[]): ICompiledFormula {
  try {
    return compileTokensOrThrow(tokens);
  } catch (error) {
    if (!(error instanceof EvaluationError)) {
      throw error;
    }
    return {
      tokens,
      literalValues: { numbers: [], strings: [] },
      symbols: [],
      dependencies: [],
      execute: function () {
        return error;
      },
      preparedFunctions: [],
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
    const preparedFunctions: PreparedComputeFunction[] = [];

    if (ast.type === "BIN_OPERATION" && ast.value === ":") {
      throw new BadExpressionError(_t("Invalid formula"));
    }
    if (ast.type === "EMPTY") {
      throw new BadExpressionError(_t("Invalid formula"));
    }
    const compiledAST = compileAST(ast);
    const code = new FunctionCodeBuilder();
    code.append(compiledAST);
    code.append(jsStr`return ${compiledAST.returnExpression};`);
    const baseFunction = new Function(
      "deps", // the dependencies in the current formula
      "ref", // a function to access a certain dependency at a given index
      "range", // same as above, but guarantee that the result is in the form of a range
      "getSymbolValue",
      "ctx",
      "functions",
      code.toString()
    );

    // @ts-ignore
    functionCache[cacheKey] = baseFunction;
    preparedFunctionsCache[cacheKey] = preparedFunctions;

    /**
     * This function compile the function arguments. It is mostly straightforward,
     * except that there is a non trivial transformation in one situation:
     *
     * If a function argument is asking for a range, and get a cell, we transform
     * the cell value into a range. This allow the grid model to differentiate
     * between a cell value and a non cell value.
     */
    function compileFunctionArgs(ast: ASTFuncall): CompiledArg[] {
      const { args } = ast;
      const functionName = ast.value.toUpperCase();
      const functionDefinition = functions[functionName];

      if (!functionDefinition) {
        throw new UnknownFunctionError(_t('Unknown function: "%s"', ast.value));
      }

      assertEnoughArgs(ast);

      const compiledArgs: CompiledArg[] = [];

      const argToFocus = argTargeting(functionDefinition, args.length);

      for (let i = 0; i < args.length; i++) {
        const argDefinition = functionDefinition.args[argToFocus[i].index];
        const currentArg = args[i];
        const argAST = compileAST(currentArg, argDefinition.acceptMatrix);
        if (argDefinition.acceptMatrixOnly && !argAST.returnARange) {
          throw new BadExpressionError(
            _t(
              "Function %s expects the parameter '%s' to be reference to a cell or range.",
              functionName,
              (i + 1).toString()
            )
          );
        }
        const toVectorize = !argDefinition.acceptMatrix && argAST.returnARange;
        compiledArgs.push({ argAST, toVectorize });
      }

      return compiledArgs;
    }

    /**
     * This function compiles all the information extracted by the parser into an
     * executable code for the evaluation of the cells content. It uses a cache to
     * not reevaluate identical code structures.
     */
    function compileAST(ast: AST, acceptMatrix = false): FunctionCode {
      const code = new FunctionCodeBuilder(scope);
      if (ast.debug) {
        code.append(jsStr`debugger;`);
        code.append(jsStr`ctx["debug"] = true;`);
      }
      switch (ast.type) {
        case "BOOLEAN":
          return code.return(jsStr`{ value: ${ast.value} }`);
        case "NUMBER":
          return code.return(jsStr`this.literalValues.numbers[${numberCount++}]`);
        case "STRING":
          return code.return(jsStr`this.literalValues.strings[${stringCount++}]`);
        case "REFERENCE":
          const isRange = ast.value.includes(":") || acceptMatrix;
          return code.return(
            jsStr`${isRange ? jsStr`range` : jsStr`ref`}(deps[${dependencyCount++}])`,
            isRange
          );
        case "FUNCALL":
          const compiledArgs = compileFunctionArgs(ast);
          const args = compiledArgs.map((compiledArg) =>
            compiledArg.argAST.assignResultToVariable()
          );
          code.append(...args);
          const fnName = ast.value.toUpperCase();
          if (!Object.hasOwn(functions, fnName)) {
            throw new Error(`Unknown function: "${fnName}"`);
          }
          const jsFnName = dangerouslyCreateJsStr(fnName); // validated with known functions
          const funCallIndex = preparedFunctions.length;
          const argsToVectorize = compiledArgs.map((compiledArg) => compiledArg.toVectorize);
          if (argsToVectorize.some((toVectorize) => toVectorize)) {
            // TODO give argsToVectorize to createVectorizedComputeFunction
            preparedFunctions.push(createVectorizedComputeFunction(functions[fnName], args.length));
          } else {
            preparedFunctions.push(createComputeFunction(functions[fnName], args.length));
          }
          const returnARange = functions[fnName].computeArray !== undefined;
          const comment = jsStr`// ${jsFnName}`;
          if (args.length === 0) {
            return code.return(jsStr`functions[${funCallIndex}](ctx); ${comment}`, returnARange);
          }
          const compiledArgExpressions = args.map((arg) => arg.returnExpression);
          return code.return(
            jsStr`functions[${funCallIndex}](ctx,${compiledArgExpressions}); ${comment}`,
            returnARange
          );
        case "ARRAY": {
          // a literal array is compiled into function calls
          return compileAST(
            toFunCallAst(
              "ARRAY.LITERAL",
              ast.value.map((row) => toFunCallAst("ARRAY.ROW", row))
            )
          );
        }
        case "UNARY_OPERATION": {
          return compileAST(toFunCallAst(UNARY_OPERATOR_MAP[ast.value], [ast.operand]));
        }
        case "BIN_OPERATION": {
          return compileAST(toFunCallAst(OPERATOR_MAP[ast.value], [ast.left, ast.right]));
        }
        case "SYMBOL":
          const symbolIndex = symbols.indexOf(ast.value);
          return code.return(
            jsStr`getSymbolValue(this.symbols[${symbolIndex}], ${acceptMatrix})`,
            true
          );
        case "EMPTY":
          return code.return(jsStr`undefined`);
      }
    }
  }
  const compiledFormula: ICompiledFormula = {
    execute: functionCache[cacheKey],
    preparedFunctions: preparedFunctionsCache[cacheKey],
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

function toFunCallAst(fnName: string, args: AST[]): ASTFuncall {
  return {
    type: "FUNCALL",
    value: fnName,
    args: args,
    tokenStartIndex: 0,
    tokenEndIndex: 0,
  };
}
