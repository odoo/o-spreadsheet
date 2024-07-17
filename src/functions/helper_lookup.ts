import { zoneToXc } from "../helpers";
import { _t } from "../translation";
import { EvalContext, FunctionResultObject, Getters, Maybe, UID } from "../types";
import { EvaluationError, InvalidReferenceError } from "../types/errors";
import { PivotCoreDefinition } from "../types/pivot";

/**
 * Get the pivot ID from the formula pivot ID.
 */
export function getPivotId(pivotFormulaId: string, getters: Getters) {
  const pivotId = getters.getPivotId(pivotFormulaId);
  if (!pivotId) {
    throw new EvaluationError(_t('There is no pivot with id "%s"', pivotFormulaId));
  }
  return pivotId;
}

export function assertMeasureExist(pivotId: UID, measure: string, getters: Getters) {
  const { measures } = getters.getPivotCoreDefinition(pivotId);
  if (!measures.find((m) => m.name === measure)) {
    const validMeasures = `(${measures.map((m) => m.name).join(", ")})`;
    throw new EvaluationError(
      _t(
        "The argument %s is not a valid measure. Here are the measures: %s",
        measure,
        validMeasures
      )
    );
  }
}

export function assertDomainLength(domain: Maybe<FunctionResultObject>[]) {
  if (domain.length % 2 !== 0) {
    throw new EvaluationError(_t("Function PIVOT takes an even number of arguments."));
  }
}

export function addPivotDependencies(
  evalContext: EvalContext,
  coreDefinition: PivotCoreDefinition
) {
  //TODO This function can be very costly when used with PIVOT.VALUE and PIVOT.HEADER
  if (coreDefinition.type !== "SPREADSHEET" || !coreDefinition.dataSet) {
    return;
  }
  const { sheetId, zone } = coreDefinition.dataSet;
  const originPosition = evalContext.__originCellPosition;
  if (originPosition) {
    // The following line is used to reset the dependencies of the cell, to avoid
    // keeping dependencies from previous evaluation of the PIVOT formula (i.e.
    // in case the reference has been changed).
    evalContext.updateDependencies?.(originPosition);
  }
  const xc = zoneToXc(zone);
  const range = evalContext.getters.getRangeFromSheetXC(sheetId, xc);
  if (range === undefined || range.invalidXc || range.invalidSheetName) {
    throw new InvalidReferenceError();
  }
  if (originPosition) {
    evalContext.addDependencies?.(originPosition, [range]);
  }
}
