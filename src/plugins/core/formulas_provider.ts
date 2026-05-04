import { CompiledFormula } from "../../formulas/compiler";
import { FormulaProvider } from "../../types/misc";

export class FormulaProviderAggregator {
  private providers: Array<FormulaProvider["getFormulas"]> = [];
  static getters = ["getAllFormulas"] as const;

  addFormulaProvider(provider: FormulaProvider["getFormulas"]) {
    this.providers.push(provider);
  }

  getAllFormulas(): CompiledFormula[] {
    return this.providers.flatMap((provider) => provider());
  }
}
