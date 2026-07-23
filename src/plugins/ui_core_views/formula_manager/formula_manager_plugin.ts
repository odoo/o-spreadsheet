import { CompiledFormula } from "../../../formulas/compiler";
import { matrixMap } from "../../../functions/helpers";
import { CellValue } from "../../../types/cells";
import { Command, CoreViewCommand, invalidateEvaluationCommands } from "../../../types/commands";
import { FormulaOwnerId } from "../../../types/formula_owner";
import { FunctionResultObject, Matrix, UID, isMatrix } from "../../../types/misc";
import { Range } from "../../../types/range";
import { CoreViewPlugin, CoreViewPluginConfig } from "../../core_view_plugin";
import { GenericFormulaEvaluator } from "./generic_formula_evaluator";
import { OwnerDependencyIndex } from "./owner_dependency_index";

interface OwnerEntry {
  sheetId: UID;
  formulaString: string;
  compiledFormula: CompiledFormula;
}

/**
 * The sole way for a plugin to read the evaluated value of a formula it owns
 * outside a cell (a conditional formatting rule, a data validation
 * criterion, a pivot calculated measure, ...). An owner plugin never stores
 * its own `CompiledFormula`/evaluated result: it declares its formulas via
 * `CorePlugin.getFormulaOwners` (pull-based, see `formula_owner_registry.ts`)
 * and reads results back through `getFormulaOwnerResult`/`getFormulaOwnerValue`
 * - there is no other path to a value, so lifecycle management (compilation,
 * range adaptation, invalidation) can't be forgotten.
 */
export class FormulaManagerPlugin extends CoreViewPlugin {
  static getters = [
    "getFormulaOwnerResult",
    "getFormulaOwnerValue",
    "getFormulaOwnerCompiledFormula",
  ] as const;

  private evaluator: GenericFormulaEvaluator;
  private ownerIndex = new OwnerDependencyIndex();
  private owners: Map<FormulaOwnerId, OwnerEntry> = new Map();
  private results: Map<FormulaOwnerId, FunctionResultObject | Matrix<FunctionResultObject>> =
    new Map();
  private shouldRebuildOwners = true;
  private hasPendingCellChanges = false;

  constructor(config: CoreViewPluginConfig) {
    super(config);
    this.evaluator = new GenericFormulaEvaluator(config.custom, this.getters);
  }

  beforeHandle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      this.getters.getFormulaOwnerExtraInvalidationCommands().has(cmd.type)
    ) {
      this.shouldRebuildOwners = true;
    }
  }

  handle(cmd: CoreViewCommand) {
    if (cmd.type === "UPDATE_CELL" || cmd.type === "EVALUATE_CELLS") {
      this.hasPendingCellChanges = true;
    }
  }

  finalize() {
    if (this.shouldRebuildOwners) {
      this.rebuildOwners();
      this.shouldRebuildOwners = false;
      this.results.clear();
    } else if (this.hasPendingCellChanges) {
      this.invalidateFromLastRecomputedRanges();
    }
    this.hasPendingCellChanges = false;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getFormulaOwnerResult(
    id: FormulaOwnerId
  ): FunctionResultObject | Matrix<FunctionResultObject> | undefined {
    const owner = this.owners.get(id);
    if (!owner) {
      return undefined;
    }
    let result = this.results.get(id);
    if (!result) {
      result = this.evaluator.evaluate(id, owner.sheetId, owner.compiledFormula);
      this.results.set(id, result);
    }
    return result;
  }

  getFormulaOwnerValue(id: FormulaOwnerId): CellValue | Matrix<CellValue> | undefined {
    const result = this.getFormulaOwnerResult(id);
    if (result === undefined) {
      return undefined;
    }
    return isMatrix(result) ? matrixMap(result, (cell) => cell.value) : result.value;
  }

  /**
   * Read access to the cached, compiled formula itself rather than an
   * evaluated value. Used by owners whose formula is a per-target-cell
   * template (e.g. a conditional formatting `CellIsRule`'s relative-reference
   * formula, translated per cell it applies to via `getTranslatedCellFormula`)
   * - such owners don't have a single evaluated value to cache, but they
   * still benefit from the manager owning compilation/adaptation instead of
   * recompiling from a raw string on every use.
   */
  getFormulaOwnerCompiledFormula(id: FormulaOwnerId): CompiledFormula | undefined {
    return this.owners.get(id)?.compiledFormula;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private rebuildOwners() {
    const records = this.getters.getFormulaOwnerRecords();
    const nextOwners: Map<FormulaOwnerId, OwnerEntry> = new Map();
    const nextIndex = new OwnerDependencyIndex();
    for (const record of records) {
      const existing = this.owners.get(record.id);
      const compiledFormula =
        existing && existing.formulaString === record.formulaString
          ? existing.compiledFormula
          : CompiledFormula.Compile(record.formulaString, record.sheetId, this.getters);
      nextOwners.set(record.id, {
        sheetId: record.sheetId,
        formulaString: record.formulaString,
        compiledFormula,
      });
      const dependencies: Range[] = [
        ...compiledFormula.rangeDependencies,
        ...(record.extraDependencies || []),
      ];
      nextIndex.addDependencies(record.id, dependencies);
    }
    this.owners = nextOwners;
    this.ownerIndex = nextIndex;
  }

  private invalidateFromLastRecomputedRanges() {
    const ranges = this.getters.getLastRecomputedRanges();
    if (!ranges.length) {
      return;
    }
    for (const id of this.ownerIndex.getDependents(ranges)) {
      this.results.delete(id);
    }
  }
}
