import { ModelConfig } from "../../model";
import { Registry } from "../../registries/registry";
import { Getters } from "../../types";
import { PivotCoreDefinition } from "../../types/pivot";
import { Pivot } from "./pivot_runtime";

interface PivotParams {
  definition: PivotCoreDefinition;
  getters: Getters;
}

type PivotConstructor = new (custom: ModelConfig["custom"], params: PivotParams) => Pivot;

export const pivotRegistry = new Registry<PivotConstructor>();
