import { ChartConfiguration } from "chart.js";
import { Range } from "../range";
import { ColorGridChartDefinition, DataSourceChartDefinition } from "./common_chart";

export interface HeatmapChartDefinition<T extends string | Range = Range>
  extends DataSourceChartDefinition<T>,
    ColorGridChartDefinition {
  readonly type: "heatmap";
  readonly rowRange?: T;
}

export type HeatmapChartRuntime = {
  chartJsConfig: ChartConfiguration;
};
