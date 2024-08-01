import { functionRegistry } from "../functions";
import { iterateAstNodes, parseTokens } from "./parser";
import type { Token } from "./tokenizer";

const functions = functionRegistry.content;

export function isExportableToExcel(tokens: Token[]): boolean {
  try {
    const nonExportableFunctions = iterateAstNodes(parseTokens(tokens)).filter(
      (ast) => ast.type === "FUNCALL" && !functions[ast.value.toUpperCase()]?.isExported
    );
    return nonExportableFunctions.length === 0;
  } catch (error) {
    return false;
  }
}
