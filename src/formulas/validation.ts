import { ArgType, functions } from "../functions/index";
import { AST, parse } from "./parser";

export function validate(formula: string): boolean {
  if (!formula) return true;
  if (!formula.startsWith("=")) return true;

  const tokens = parse(formula);
  return validateAST(tokens, ["ANY"]);
}

/**
 *  take a piece of AST and validates it
 *  @returns {boolean} true if the AST is valid, else false
 *  */
export function validateAST(ast: AST, expectation: ArgType[]): boolean {
  switch (ast.type) {
    case "UNKNOWN":
      return false;
    case "BIN_OPERATION":
      switch (ast.value) {
        case ":":
          return expectation.includes("RANGE") || expectation.includes("ANY");
        default:
          return validateAST(ast.left, expectation) && validateAST(ast.right, expectation);
      }
    case "FUNCALL":
      const argsDefinition = functions[ast.value.toUpperCase()].args;
      if (argsDefinition.length === 0) {
        return ast.args.length === 0;
      }

      let stillValid = true;
      for (let i = 0, argPos = 0; i < argsDefinition.length && stillValid; i++) {
        let argDefinition = argsDefinition[i];

        if (!argDefinition.optional && !argDefinition.repeating) {
          if (!ast.args[argPos]) {
            return false; // missing a mandatory arg
          }
          stillValid = stillValid && validateAST(ast.args[argPos], argDefinition.type);
        } else {
          if (argDefinition.repeating) {
            if (!ast.args[argPos] && !argDefinition.optional) {
              return false; // missing a mandatory arg (first of repeating)
            }
            while (argPos < ast.args.length && stillValid) {
              stillValid = stillValid && validateAST(ast.args[argPos], argDefinition.type);
              argPos++;
            }
          } else if (argDefinition.optional) {
            if (ast.args[argPos]) {
              stillValid = stillValid && validateAST(ast.args[argPos], argDefinition.type);
            }
          }
        }
        argPos++;
      }
      return stillValid;
    case "ASYNC_FUNCALL":
      break;
    case "NUMBER":
      return (
        expectation.includes("BOOLEAN") || // true is 1, false is 0
        expectation.includes("NUMBER") ||
        expectation.includes("STRING") ||
        expectation.includes("ANY")
      );
    case "BOOLEAN":
      return (
        expectation.includes("STRING") ||
        expectation.includes("BOOLEAN") ||
        expectation.includes("NUMBER") || // any other number than 0 is true, else is false
        expectation.includes("ANY")
      );
    case "STRING":
      return expectation.includes("STRING") || expectation.includes("ANY");
    case "REFERENCE":
      return true;
  }
  return true;
}

export function nextExpectedArg(formula: string): [ArgType] {
  return ["ANY"];
}

export function expectedArgAtPosition(formula: string, position: number) {}
