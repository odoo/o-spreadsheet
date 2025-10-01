import {
  OPERATOR_MAP,
  UNARY_OPERATOR_MAP,
  compile as engineCompile,
  compileTokens as engineCompileTokens,
  functionCache as engineFunctionCache,
  setArgTargetingImplementation,
  setFunctionRegistryProvider,
} from "@odoo/o-spreadsheet-engine/formulas/compiler";
import { argTargeting } from "@odoo/o-spreadsheet-engine/functions/arguments";
import { functionRegistry } from "../functions/index";
import type { CompiledFormula, FormulaToExecute } from "../types";
import type { Token } from "./tokenizer";

//TODO When the getters will be moved to o-spreadsheet-engine, we will be able
// to remove this file and directly use the one from o-spreadsheet-engine
setFunctionRegistryProvider(() => functionRegistry);
setArgTargetingImplementation(argTargeting);

export { OPERATOR_MAP, UNARY_OPERATOR_MAP };

export function compile(formula: string): CompiledFormula {
  return engineCompile(formula) as unknown as CompiledFormula;
}

export function compileTokens(tokens: Token[]): CompiledFormula {
  return engineCompileTokens(tokens) as unknown as CompiledFormula;
}

export const functionCache = engineFunctionCache as Record<string, FormulaToExecute>;
