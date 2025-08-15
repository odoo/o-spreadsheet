import { functionRegistry } from "../functions";
import { AST, ASTFuncall, iterateAstNodes, parseTokens } from "./parser";
import { Token } from "./tokenizer";

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

export function getFunctionsFromTokens(tokens: Token[], functionNames: string[]) {
  // Parsing is an expensive operation, so we first check if the
  // formula contains one of the function names
  if (!tokens.some((t) => t.type === "SYMBOL" && functionNames.includes(t.value.toUpperCase()))) {
    return [];
  }
  let ast: AST | undefined;
  try {
    ast = parseTokens(tokens);
  } catch {
    return [];
  }
  return getFunctionsFromAST(ast, functionNames);
}

function getFunctionsFromAST(ast: AST, functionNames: string[]) {
  return iterateAstNodes(ast)
    .filter((node) => node.type === "FUNCALL" && functionNames.includes(node.value.toUpperCase()))
    .map((node: ASTFuncall) => ({
      functionName: node.value.toUpperCase(),
      args: node.args,
    }));
}
