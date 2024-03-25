import { ModelConfig } from "../../model";
import { Registry } from "../../registries/registry";
import { Getters } from "../../types";
import { PivotCoreDefinition, PivotFields } from "../../types/pivot";
import { Pivot } from "./pivot_runtime";
import { PivotRuntimeDefinition } from "./pivot_runtime_definition";

interface PivotParams {
  definition: PivotCoreDefinition;
  getters: Getters;
}

type PivotConstructor = new (custom: ModelConfig["custom"], params: PivotParams) => Pivot;

type PivotDefinitionConstructor = new (
  definition: PivotCoreDefinition,
  fields: PivotFields
) => PivotRuntimeDefinition;

export interface PivotRegistryItem {
  cls: PivotConstructor;
  definition: PivotDefinitionConstructor;
}

export const pivotRegistry = new Registry<PivotRegistryItem>();
