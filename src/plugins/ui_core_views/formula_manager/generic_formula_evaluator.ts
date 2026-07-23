import { CompiledFormula } from "../../../formulas/compiler";
import { handleError } from "../../../functions/create_compute_function";
import { matrixMap } from "../../../functions/helpers";
import { getZoneArea } from "../../../helpers/zones";
import { _t } from "../../../translation";
import { BadExpressionError, CircularDependencyError } from "../../../types/errors";
import { FormulaOwnerId } from "../../../types/formula_owner";
import { Getters } from "../../../types/getters";
import { FunctionResultObject, GetSymbolValue, isMatrix, Matrix, UID } from "../../../types/misc";
import { ModelConfig } from "../../../types/model";
import {
  buildCompilationParameters,
  CompilationParameters,
} from "../cell_evaluation/compilation_parameters";
import { nullValueToZeroValue, updateEvalContextAndExecute } from "../cell_evaluation/evaluator";

/**
 * Computes the evaluated result of a single formula owned by something other
 * than a cell (a conditional formatting rule, a data validation criterion, a
 * pivot calculated measure, ...).
 *
 * Deliberately does not reuse the cell `Evaluator`'s internal, long-lived
 * `CompilationParameters`/`evalContext` (that state is mutated per-cell and
 * reused across a whole evaluation pass for performance at cell-count scale;
 * reusing it here would risk leaking stale `__originCellPosition`/range-cache
 * state into an unrelated formula owner). A fresh, cheap
 * `CompilationParameters` is built for every `evaluate` call instead - owner
 * counts are orders of magnitude smaller than cell counts, so this isn't a
 * performance concern. A formula-manager formula can read cells (via the
 * `computeCell` callback below, which delegates to the existing cell
 * evaluator), but never originates a cell computation itself.
 */
export class GenericFormulaEvaluator {
  private ownersBeingComputed = new Set<FormulaOwnerId>();
  private symbolsBeingComputed = new Set<string>();

  constructor(private readonly context: ModelConfig["custom"], private getters: Getters) {}

  evaluate(
    id: FormulaOwnerId,
    sheetId: UID,
    compiledFormula: CompiledFormula
  ): FunctionResultObject | Matrix<FunctionResultObject> {
    if (this.ownersBeingComputed.has(id)) {
      return new CircularDependencyError();
    }
    this.ownersBeingComputed.add(id);
    try {
      const compilationParams = buildCompilationParameters(this.context, this.getters, (position) =>
        this.getters.getEvaluatedCell(position)
      );
      const result = updateEvalContextAndExecute(
        compiledFormula,
        compilationParams,
        sheetId,
        this.buildGetSymbolValue(compilationParams),
        undefined
      );
      if (isMatrix(result)) {
        return matrixMap(result, nullValueToZeroValue);
      }
      return nullValueToZeroValue(result);
    } catch (error) {
      return handleError(error, "");
    } finally {
      this.ownersBeingComputed.delete(id);
    }
  }

  /**
   * Resolves named-range symbols. Mirrors the cell evaluator's own
   * `buildSafeGetSymbolValue` for the no-origin-position case: it forces the
   * referenced range to be read but does not register a dependency-graph
   * edge (matching today's behavior for isolated formula evaluation, e.g.
   * `getters.evaluateFormula`). Named-range changes still invalidate this
   * formula owner's whole compiled-formula cache via the shared default
   * invalidation set (`CREATE_/UPDATE_/DELETE_NAMED_RANGE` are already part
   * of `invalidateEvaluationCommands`).
   */
  private buildGetSymbolValue(compilationParams: CompilationParameters): GetSymbolValue {
    return (symbolName, isRange) => {
      if (this.symbolsBeingComputed.has(symbolName)) {
        return new CircularDependencyError();
      }
      this.symbolsBeingComputed.add(symbolName);
      try {
        const namedRange = this.getters.getNamedRange(symbolName);
        if (!namedRange) {
          return new BadExpressionError(_t("Invalid formula"));
        }
        const isMultiCellZone = getZoneArea(namedRange.range.zone) > 1;
        return isMultiCellZone || isRange
          ? compilationParams.ensureRange(namedRange.range)
          : compilationParams.referenceDenormalizer(namedRange.range);
      } finally {
        this.symbolsBeingComputed.delete(symbolName);
      }
    };
  }
}
