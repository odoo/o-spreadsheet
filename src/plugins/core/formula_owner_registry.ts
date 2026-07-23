import { CommandTypes } from "../../types/commands";
import {
  FormulaOwnerExtraInvalidationProvider,
  FormulaOwnerProvider,
  FormulaOwnerRecord,
} from "../../types/formula_owner";

/**
 * A place for any `CorePlugin` to declare, in a pull-based/declarative way,
 * "here are the formulas I currently own" (see `CorePlugin.getFormulaOwners`).
 *
 * Mirrors `RangeAdapterPlugin`'s `addRangeProvider` registry: it never owns
 * any formula data itself, it only aggregates read access to whatever each
 * owner plugin already derives from its own persisted state.
 */
export class FormulaOwnerRegistry {
  private providers: FormulaOwnerProvider[] = [];
  private extraInvalidationProviders: FormulaOwnerExtraInvalidationProvider[] = [];

  addProvider(provider: FormulaOwnerProvider) {
    this.providers.push(provider);
  }

  addExtraInvalidationProvider(provider: FormulaOwnerExtraInvalidationProvider) {
    this.extraInvalidationProviders.push(provider);
  }

  getFormulaOwnerRecords(): FormulaOwnerRecord[] {
    return this.providers.flatMap((provider) => Array.from(provider()));
  }

  getFormulaOwnerExtraInvalidationCommands(): Set<CommandTypes> {
    const result = new Set<CommandTypes>();
    for (const provider of this.extraInvalidationProviders) {
      for (const commandType of provider()) {
        result.add(commandType);
      }
    }
    return result;
  }
}
