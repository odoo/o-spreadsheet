import { parseNumber, unquote } from "../helpers";
import { _t } from "../translation";
import { CompiledFormula, FormulaToExecute } from "../types/base";
import { BadExpressionError, UnknownFunctionError } from "../types/errors";
import { DEFAULT_LOCALE } from "../types/locale";
import { FunctionCode, FunctionCodeBuilder, Scope } from "./code_builder";
import { parseTokens } from "./parser";
import { rangeTokenize } from "./range_tokenizer";
import { Token } from "./tokenizer";

interface ArgDefinitionLike {
  type?: string[];
}

interface FunctionDescriptionLike {
  args: ArgDefinitionLike[];
  minArgRequired: number;
  maxArgPossible: number;
  nbrArgRepeating: number;
  nbrArgOptional: number;
}

interface FunctionRegistryLike {
  content: Record<string, FunctionDescriptionLike>;
}

type ArgTargetingFn = (
  fn: FunctionDescriptionLike,
  argCount: number
) => (argIndex: number) => number | undefined;

let functionRegistryProvider: (() => FunctionRegistryLike) | null = null;
let argTargetingImpl: ArgTargetingFn | null = null;

export function setFunctionRegistryProvider(provider: () => FunctionRegistryLike) {
  functionRegistryProvider = provider;
}

export function setArgTargetingImplementation(fn: ArgTargetingFn) {
  argTargetingImpl = fn;
}

function getFunctionRegistry(): FunctionRegistryLike {
  if (!functionRegistryProvider) {
    throw new Error("Function registry provider has not been set.");
  }
  return functionRegistryProvider();
}

function getArgTargeting(): ArgTargetingFn {
  if (!argTargetingImpl) {
    throw new Error("argTargeting implementation has not been set.");
  }
  return argTargetingImpl;
}

export const OPERATOR_MAP = {
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
} as const;

export const UNARY_OPERATOR_MAP = {
  "-": "UMINUS",
  "+": "UPLUS",
  "%": "UNARY.PERCENT",
} as const;

interface LiteralValues {
  numbers: { value: number }[];
  strings: { value: string }[];
}

type InternalCompiledFormula = CompiledFormula & {
  literalValues: LiteralValues;
  symbols: string[];
};

export const functionCache: Record<string, FormulaToExecute> = {};

export function compile(formula: string): CompiledFormula {
  const tokens = rangeTokenize(formula);
  return compileTokens(tokens);
}

export function compileTokens(tokens: Token[]): CompiledFormula {
  try {
    return compileTokensOrThrow(tokens);
  } catch (error) {
    return {
      tokens,
      dependencies: [],
      execute() {
        return error;
      },
      isBadExpression: true,
      normalizedFormula: tokens.map((t) => t.value).join(""),
    };
  }
}

function compileTokensOrThrow(tokens: Token[]): CompiledFormula {
  const registry = getFunctionRegistry();
  const functions = registry.content;
  const argTargeting = getArgTargeting();

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
      "deps",
      "ref",
      "range",
      "getSymbolValue",
      "ctx",
      code.toString()
    );

    // @ts-ignore - constructed function
    functionCache[cacheKey] = baseFunction;

    function compileFunctionArgs(astFuncall: any): FunctionCode[] {
      const { args } = astFuncall;
      const functionName = astFuncall.value.toUpperCase();
      const functionDefinition = functions[functionName];

      if (!functionDefinition) {
        throw new UnknownFunctionError(_t('Unknown function: "%s"', astFuncall.value));
      }

      assertEnoughArgs(args, functionDefinition, functionName);

      const compiledArgs: FunctionCode[] = [];
      const argToFocus = argTargeting(functionDefinition, args.length);

      for (let i = 0; i < args.length; i++) {
        const argIndex = argToFocus(i) ?? -1;
        const argDefinition =
          functionDefinition.args[argIndex] ??
          functionDefinition.args[i] ??
          ({} as ArgDefinitionLike);
        const currentArg = args[i];
        const argTypes = argDefinition?.type || [];
        const isMeta = argTypes.includes("META") || argTypes.includes("RANGE<META>");
        const hasRange = argTypes.some((t: string) => isRangeType(t));
        compiledArgs.push(compileAST(currentArg, isMeta, hasRange));
      }

      return compiledArgs;
    }

    function compileAST(ast: any, isMeta = false, hasRange = false): FunctionCode {
      const codeBuilder = new FunctionCodeBuilder(scope);
      if (ast.type !== "REFERENCE" && !(ast.type === "BIN_OPERATION" && ast.value === ":")) {
        if (isMeta) {
          throw new BadExpressionError(_t("Argument must be a reference to a cell or range."));
        }
      }
      if (ast.debug) {
        codeBuilder.append("debugger;");
        codeBuilder.append(`ctx["debug"] = true;`);
      }
      switch (ast.type) {
        case "BOOLEAN":
          return codeBuilder.return(`{ value: ${ast.value} }`);
        case "NUMBER":
          return codeBuilder.return(`this.literalValues.numbers[${numberCount++}]`);
        case "STRING":
          return codeBuilder.return(`this.literalValues.strings[${stringCount++}]`);
        case "REFERENCE":
          return codeBuilder.return(
            `${ast.value.includes(":") || hasRange ? "range" : "ref"}(deps[${dependencyCount++}], ${
              isMeta ? "true" : "false"
            })`
          );
        case "FUNCALL": {
          const args = compileFunctionArgs(ast).map((argCode) => argCode.assignResultToVariable());
          codeBuilder.append(...args);
          const fnName = ast.value.toUpperCase();
          return codeBuilder.return(`ctx['${fnName}'](${args.map((arg) => arg.returnExpression)})`);
        }
        case "UNARY_OPERATION": {
          const fnName = UNARY_OPERATOR_MAP[ast.value as keyof typeof UNARY_OPERATOR_MAP];
          const operand = compileAST(ast.operand, false, false).assignResultToVariable();
          codeBuilder.append(operand);
          return codeBuilder.return(`ctx['${fnName}'](${operand.returnExpression})`);
        }
        case "BIN_OPERATION": {
          const fnName = OPERATOR_MAP[ast.value as keyof typeof OPERATOR_MAP];
          const left = compileAST(ast.left, false, false).assignResultToVariable();
          const right = compileAST(ast.right, false, false).assignResultToVariable();
          codeBuilder.append(left);
          codeBuilder.append(right);
          return codeBuilder.return(
            `ctx['${fnName}'](${left.returnExpression}, ${right.returnExpression})`
          );
        }
        case "SYMBOL": {
          const symbolIndex = symbols.indexOf(ast.value);
          return codeBuilder.return(`getSymbolValue(this.symbols[${symbolIndex}])`);
        }
        case "EMPTY":
          return codeBuilder.return("undefined");
        default:
          return codeBuilder.return("undefined");
      }
    }
  }

  const compiledFormula: InternalCompiledFormula = {
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
        cacheKey += token.value.includes(":") ? "|R|" : "|C|";
        break;
      case "SPACE":
        break;
      default:
        cacheKey += token.value;
    }
  }
  return cacheKey;
}

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
        literalValues.strings.push({ value: unquote(token.value) });
        break;
      case "NUMBER":
        literalValues.numbers.push({ value: parseNumber(token.value, DEFAULT_LOCALE) });
        break;
      case "SYMBOL":
        symbols.push(unquote(token.value, "'"));
        break;
      default:
        break;
    }
  }
  return { dependencies, literalValues, symbols };
}

function assertEnoughArgs(
  args: any[],
  functionDefinition: FunctionDescriptionLike,
  functionName: string
) {
  const nbrArgSupplied = args.length;
  const { nbrArgRepeating, minArgRequired } = functionDefinition;

  if (nbrArgSupplied < minArgRequired) {
    throw new BadExpressionError(
      _t(
        "Invalid number of arguments for the %s function. Expected %s minimum, but got %s instead.",
        functionName,
        minArgRequired,
        nbrArgSupplied
      )
    );
  }

  if (nbrArgSupplied > functionDefinition.maxArgPossible) {
    throw new BadExpressionError(
      _t(
        "Invalid number of arguments for the %s function. Expected %s maximum, but got %s instead.",
        functionName,
        functionDefinition.maxArgPossible,
        nbrArgSupplied
      )
    );
  }

  if (nbrArgRepeating > 1) {
    const nbrValueRepeating =
      nbrArgRepeating * Math.floor((nbrArgSupplied - minArgRequired) / nbrArgRepeating);
    const nbrValueRemaining =
      nbrArgSupplied - minArgRequired - nbrValueRepeating - functionDefinition.nbrArgOptional;

    if (nbrValueRemaining > 0) {
      throw new BadExpressionError(
        _t(
          "Invalid number of arguments for the %s function. Repeatable arguments should be supplied in groups of %s, with up to %s optional. Got %s too many.",
          functionName,
          nbrArgRepeating,
          functionDefinition.nbrArgOptional,
          nbrValueRemaining
        )
      );
    }
  }
}

function isRangeType(type: string) {
  return type.startsWith("RANGE");
}
