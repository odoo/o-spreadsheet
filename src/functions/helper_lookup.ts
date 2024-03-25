import { _t } from "../translation";
import { AddFunctionDescription, Arg, EvalContext, FPayload, Getters, UID } from "../types";
import { EvaluationError } from "../types/errors";
import { SPTableCell } from "../types/pivot";

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

export function assertDomainLength(domain: string[]) {
  if (domain.length % 2 !== 0) {
    throw new EvaluationError(_t("Function PIVOT takes an even number of arguments."));
  }
}

export function getPivotCellValueAndFormat(
  this: EvalContext,
  pivotId: UID,
  pivotCell: SPTableCell,
  fn: AddFunctionDescription
): FPayload {
  if (!pivotCell.domain) {
    return { value: "", format: undefined };
  } else {
    const domain = pivotCell.domain;
    const measure = pivotCell.measure;
    const args = pivotCell.isHeader ? [pivotId, ...domain] : [pivotId, measure, ...domain];
    return fn.compute.call(this, ...(args as Arg[])) as FPayload;
  }
}
