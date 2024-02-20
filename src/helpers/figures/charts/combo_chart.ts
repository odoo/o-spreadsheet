import { ChartCreationContext, CoreGetters, Getters, UID } from "../../../types";
import { ComboChartDefinition } from "../../../types/chart/combo_chart";
import { ComboBarChartRuntime } from "../../../types/chart/common_bar_combo";
import { ComboBarChart, createComboBarChartRuntime } from "./chart_common_bar_combo";

export class ComboChart extends ComboBarChart {
  constructor(definition: ComboChartDefinition, sheetId: UID, getters: CoreGetters) {
    super("combo", { ...definition, type: "combo" }, sheetId, getters);
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
      labelRange: context.auxiliaryRange || undefined,
      type: "combo",
      dataSetDesign: context.dataSetDesign,
    };
  }
}

export function createComboChartRuntime(chart: ComboChart, getters: Getters): ComboBarChartRuntime {
  const runtime = createComboBarChartRuntime(chart, getters);
  const config = runtime.chartJsConfig;

  for (const [index, dataset] of config.data.datasets.entries()) {
    dataset.type = index === 0 ? "bar" : "line";
    dataset.order = ~index;
  }

  return runtime;
}
