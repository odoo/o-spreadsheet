import { CommandTypes } from "../../types/commands";
import { FormulaOwnerProvider, FormulaOwnerRecord } from "../../types/formula_owner";
import { RangeAdapterFunctions } from "../../types/misc";

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
  private extraInvalidationCommands = new Set<CommandTypes>();

  addProvider(provider: FormulaOwnerProvider) {
    this.providers.push(provider);
  }

  /**
   * Declares command types (beyond the shared default set) that should make
   * `FormulaManagerPlugin` re-pull formula owners. Called once, at plugin
   * construction time (see `CorePlugin`'s constructor) — this is a static
   * property of a plugin's command-handling logic, not something that
   * changes over its lifetime, so it's captured once here rather than
   * stored as a callback to be re-invoked on every command.
   */
  addExtraInvalidationCommands(commands: Iterable<CommandTypes>) {
    for (const commandType of commands) {
      this.extraInvalidationCommands.add(commandType);
    }
  }

  getFormulaOwnerRecords(): FormulaOwnerRecord[] {
    return this.providers.flatMap((provider) => Array.from(provider()));
  }

  getFormulaOwnerExtraInvalidationCommands(): Set<CommandTypes> {
    return this.extraInvalidationCommands;
  }

  /**
   * Registered as a range provider (see `model.ts`) so that declaring a
   * formula via `getFormulaOwners` is the only thing an owner plugin needs
   * to do — range adaptation on structural changes is handled uniformly
   * here instead of being yet another thing each plugin must remember to
   * wire up itself.
   */
  adaptRanges(rangeAdapters: RangeAdapterFunctions) {
    for (const provider of this.providers) {
      for (const record of provider()) {
        const adapted = rangeAdapters.adaptFormulaString(record.sheetId, record.formulaString);
        if (adapted !== record.formulaString) {
          record.onAdapt(adapted);
        }
      }
    }
  }
}
