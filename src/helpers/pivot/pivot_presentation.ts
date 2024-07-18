import { FunctionResultObject, PivotDomain } from "../../types";
import { PivotUIConstructor } from "./pivot_registry";

/**
 * Dynamically creates a presentation layer wrapper around a given pivot class.
 *
 * It allows to implement additional behaviors and features that can be applied
 * to all pivots, regardless of the specific pivot implementation.
 * Examples of such features include calculated measures or "Show value as" options.
 */
export function withPivotPresentationLayer(PivotClass: PivotUIConstructor) {
  class PivotPresentationLayer extends PivotClass {
    getPivotCellValueAndFormat(measure: string, domain: PivotDomain): FunctionResultObject {
      return super.getPivotCellValueAndFormat(measure, domain);
    }
  }
  return PivotPresentationLayer;
}
