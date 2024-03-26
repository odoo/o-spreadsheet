import { ModelConfig } from "../../model";
import { Registry } from "../../registries/registry";
import { Getters } from "../../types";
import { CorePivotDefinition } from "../../types/pivot";
import { Pivot } from "./pivot_runtime";

interface PivotParams {
  definition: CorePivotDefinition;
  getters: Getters;
}

type PivotConstructor = new (custom: ModelConfig["custom"], params: PivotParams) => Pivot;

export const pivotRegistry = new Registry<PivotConstructor>();
