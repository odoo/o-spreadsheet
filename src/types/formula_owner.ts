import { CommandTypes } from "./commands";
import { UID } from "./misc";
import { Range } from "./range";

/**
 * Identifies a formula owned by something other than a cell (a conditional
 * formatting rule, a data validation criterion, a pivot calculated measure,
 * ...). Opaque and namespaced by whoever creates it via `makeFormulaOwnerId`.
 */
export type FormulaOwnerId = string & { readonly _brand: "FormulaOwnerId" };

export function makeFormulaOwnerId(...parts: string[]): FormulaOwnerId {
  return parts.join(":") as FormulaOwnerId;
}

export interface FormulaOwnerRecord {
  readonly id: FormulaOwnerId;
  readonly sheetId: UID;
  readonly formulaString: string;
  /**
   * Dependencies that aren't captured by compiling `formulaString` alone,
   * e.g. a pivot measure referencing another calculated measure by symbol.
   */
  readonly extraDependencies?: Range[];
}

export type FormulaOwnerProvider = () => Iterable<FormulaOwnerRecord>;
export type FormulaOwnerExtraInvalidationProvider = () => Iterable<CommandTypes>;
