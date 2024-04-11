import { pivotRegistry } from "../helpers/pivot/pivot_registry";
import { Getters } from "../types";
import { Registry } from "./registry";

/**
 * This registry is used to register functions that should be called after each iteration of the evaluation.
 * This is use currently to mark the each pivot to be re-evaluated. We have to do this after each iteration
 * to avoid to reload the data of the pivot at each function call (PIVOT.VALUE and PIVOT.HEADER). After each
 * evaluation iteration, the pivot has to be re-evaluated during the next iteration.
 */
export const onIterationEndEvaluationRegistry = new Registry<(getters: Getters) => void>();

onIterationEndEvaluationRegistry.add("pivots", (getters: Getters) => {
  for (const pivotId of getters.getPivotIds()) {
    const pivot = getters.getPivot(pivotId);
    pivotRegistry.get(pivot.type).onIterationEndEvaluation(pivot);
  }
});
