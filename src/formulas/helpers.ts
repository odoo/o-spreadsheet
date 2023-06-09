import { functionRegistry } from "../functions";
import { parseTokens, visitAst } from "./parser";
import { Token } from "./tokenizer";

const functions = functionRegistry.content;

export function isExportableToExcel(tokens: Token[]): boolean {
  try {
    let isExported = true;
    visitAst(parseTokens(tokens), (ast) => {
      if (ast.type === "FUNCALL") {
        const func = functions[ast.value.toUpperCase()];
        if (!func?.isExported) {
          isExported = false;
        }
      }
    });
    return isExported;
  } catch (error) {
    return false;
  }
}
