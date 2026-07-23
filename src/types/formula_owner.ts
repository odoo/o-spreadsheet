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
  /**
   * Called with the range-adapted formula string whenever a structural
   * change (row/col insert-delete, sheet rename/delete, named range rename)
   * changes it. Must persist the new string into this owner's own state
   * (typically via `this.history.update(...)`). Required, not optional — an
   * owner with nothing to do here (e.g. because it already adapts this
   * string through some other mechanism) must say so explicitly with a
   * documented no-op, so range adaptation can never be silently forgotten
   * for a newly declared formula.
   */
  readonly onAdapt: (newFormulaString: string) => void;
}

export type FormulaOwnerProvider = () => Iterable<FormulaOwnerRecord>;
