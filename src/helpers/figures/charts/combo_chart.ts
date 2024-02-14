import { ChartCreationContext, CoreGetters, Getters, UID } from "../../../types";
import { ComboChartDefinition } from "../../../types/chart/combo_chart";
import { ComboBarChartRuntime } from "../../../types/chart/common_bar_combo";
import { ComboBarChart, createComboBarChartRuntime } from "./chart_common_bar_combo";

export class ComboChart extends ComboBarChart {
  constructor(definition: ComboChartDefinition, sheetId: UID, getters: CoreGetters) {
    super("combo", { ...definition, type: "bar" }, sheetId, getters);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ComboChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: false,
      stacked: false,
      aggregated: false,
      legendPosition: "top",
      title: context.title || "",
      verticalAxisPosition: "left",
      labelRange: context.auxiliaryRange || undefined,
      type: "combo",
    };
  }
}

export function createComboChartRuntime(chart: ComboChart, getters: Getters): ComboBarChartRuntime {
  const runtime = createComboBarChartRuntime(chart, getters);
  for (const [index, dataset] of runtime.chartJsConfig.data.datasets.entries()) {
    dataset.type = index === 0 ? "bar" : "line";
    dataset.order = ~index;
  }
  return runtime;
}
