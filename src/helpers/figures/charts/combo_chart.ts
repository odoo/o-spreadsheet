import { ChartCreationContext, CoreGetters, Getters, UID } from "../../../types";
import { ComboChartDefinition } from "../../../types/chart/combo_chart";
import { ComboBarChartRuntime } from "../../../types/chart/common_bar_combo";
import { deepCopy } from "../../misc";
import { ComboBarChart, createComboBarChartRuntime } from "./chart_common_bar_combo";

export class ComboChart extends ComboBarChart {
  readonly useBothYAxis?: boolean;
  constructor(definition: ComboChartDefinition, sheetId: UID, getters: CoreGetters) {
    super("combo", { ...definition, type: "combo" }, sheetId, getters);
    this.useBothYAxis = definition.useBothYAxis;
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

  getDefinition(): ComboChartDefinition {
    const definition = super.getDefinition() as ComboChartDefinition;
    return { ...definition, useBothYAxis: this.useBothYAxis };
  }
}

export function createComboChartRuntime(chart: ComboChart, getters: Getters): ComboBarChartRuntime {
  const runtime = createComboBarChartRuntime(chart, getters);
  const definition = chart.getDefinition() as ComboChartDefinition;
  const config = runtime.chartJsConfig;
  for (const [index, dataset] of config.data.datasets.entries()) {
    dataset.type = index === 0 ? "bar" : "line";
    dataset.order = ~index;
    dataset["yAxisID"] = index > 0 && definition.useBothYAxis ? "y1" : "y";
  }
  if (definition.useBothYAxis) {
    config.options!.scales!.y1 = deepCopy(config.options!.scales!.y);
    config.options!.scales!.y1!["position"] = "right";
    config.options!.scales!.y!["position"] = "left";
  }
  return runtime;
}
