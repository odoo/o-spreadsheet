import { zoneToXc } from "../helpers";
import { _t } from "../translation";
import { EvalContext, FunctionResultObject, Getters, Maybe, Range, UID } from "../types";
import { PivotCoreDefinition, PivotCoreMeasure } from "../types/pivot";
import { assert, assertReference } from "./helper_assert";

/**
 * Get the pivot ID from the formula pivot ID.
 */
export function getPivotId(pivotFormulaId: string, getters: Getters) {
  const pivotId = getters.getPivotId(pivotFormulaId);
  assert(pivotId !== undefined, _t('There is no pivot with id "%s"', pivotFormulaId));
  return pivotId;
}

export function assertMeasureExist(pivotId: UID, measure: string, getters: Getters) {
  const { measures } = getters.getPivotCoreDefinition(pivotId);
  assert(
    measures.find((m) => m.id === measure) !== undefined,
    _t(
      "The argument %s is not a valid measure. Here are the measures: %s",
      measure,
      `(${measures.map((m) => m.id).join(", ")})`
    )
  );
}

export function assertDomainLength(domain: Maybe<FunctionResultObject>[]) {
  assert(domain.length % 2 === 0, _t("Function PIVOT takes an even number of arguments."));
}

export function addPivotDependencies(
  evalContext: EvalContext,
  coreDefinition: PivotCoreDefinition,
  forMeasures: PivotCoreMeasure[]
) {
  //TODO This function can be very costly when used with PIVOT.VALUE and PIVOT.HEADER
  const dependencies: Range[] = [];

  if (coreDefinition.type === "SPREADSHEET" && coreDefinition.dataSet) {
    const { sheetId, zone } = coreDefinition.dataSet;
    const xc = zoneToXc(zone);
    const range = evalContext.getters.getRangeFromSheetXC(sheetId, xc);
    assertReference(!(range === undefined || range.invalidXc || range.invalidSheetName));
    dependencies.push(range);
  }

  for (const measure of forMeasures) {
    if (measure.computedBy) {
      const formula = evalContext.getters.getMeasureCompiledFormula(measure);
      dependencies.push(...formula.dependencies.filter((range) => !range.invalidXc));
    }
  }
  const originPosition = evalContext.__originCellPosition;
  if (originPosition && dependencies.length) {
    // The following line is used to reset the dependencies of the cell, to avoid
    // keeping dependencies from previous evaluation of the PIVOT formula (i.e.
    // in case the reference has been changed).
    evalContext.updateDependencies?.(originPosition);
    evalContext.addDependencies?.(originPosition, dependencies);
  }
}
