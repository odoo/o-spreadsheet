import { pivotRegistry } from "../helpers/pivot/pivot_registry";
import { Getters } from "../types";
import { Registry } from "./registry";

export const onCycleEndEvaluationRegistry = new Registry<(getters: Getters) => void>();

onCycleEndEvaluationRegistry.add("pivots", (getters: Getters) => {
  for (const pivotId of getters.getPivotIds()) {
    const pivot = getters.getPivot(pivotId);
    pivotRegistry.get(pivot.type).onEvaluationCycleEnded(pivot);
  }
});
